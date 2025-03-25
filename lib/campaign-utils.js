import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ckfsglsyfbdlgwrwxlvp.supabase.co';
const supabaseAdmin = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY);

export const calculateTrips = (budget, pricePerTrip) => {
  return Math.floor(budget / pricePerTrip);
};

export const updateCampaignTrips = async (campaignId) => {
  try {
    const { data: campaign, error: fetchError } = await supabaseAdmin
      .from('campaigns')
      .select('budget, price_per_trip, trips_remaining')
      .eq('id', campaignId)
      .single();
    if (fetchError) throw fetchError;

    const { budget, price_per_trip } = campaign;
    const tripsNeeded = calculateTrips(budget, price_per_trip);

    const { data: gigs, error: gigsError } = await supabaseAdmin
      .from('gigs')
      .select('trips_assigned, status')
      .eq('campaign_id', campaignId);
    if (gigsError) throw gigsError;

    const tripsAssigned = gigs.reduce((sum, gig) => 
      gig.status === 'assigned' || gig.status === 'completed' || gig.status === 'submitted' || gig.status === 'verified'
        ? sum + (gig.trips_assigned || 1)
        : sum,
      0
    );
    const tripsRemaining = tripsNeeded - tripsAssigned;

    const { error: updateError } = await supabaseAdmin
      .from('campaigns')
      .update({
        trips_needed: tripsNeeded,
        trips_remaining: tripsRemaining >= 0 ? tripsRemaining : 0,
        updated_at: new Date().toISOString(),
      })
      .eq('id', campaignId);
    if (updateError) throw updateError;

    return { tripsNeeded, tripsRemaining };
  } catch (error) {
    console.error('Error in updateCampaignTrips:', error);
    throw error;
  }
};

export const createGigsForPendingCampaigns = async () => {
  let created = 0;
  const errors = [];

  try {
    const { data: campaigns, error: campaignError } = await supabaseAdmin
      .from('campaigns')
      .select('id, budget, price_per_trip, route, trips_remaining, deadline, status, created_at')
      .in('status', ['pending', 'active'])
      .gt('budget', 0)
      .gt('price_per_trip', 0)
      .not('route', 'is', null);
    if (campaignError) throw campaignError;

    if (!campaigns || campaigns.length === 0) {
      console.log('No pending/active campaigns found to create gigs for.');
      return { created, errors };
    }

    for (const campaign of campaigns) {
      console.log(`Processing campaign ${campaign.id}: trips_remaining=${campaign.trips_remaining}`);
      const { tripsRemaining } = await updateCampaignTrips(campaign.id);
      const tripsToCreate = tripsRemaining;

      if (tripsToCreate <= 0) {
        console.log(`No gigs to create for campaign ${campaign.id} (tripsRemaining=${tripsRemaining})`);
        continue;
      }

      // Calculate gig deadline as half the time between creation and campaign deadline
      const createdAt = new Date(campaign.created_at);
      const campaignDeadline = new Date(campaign.deadline);
      const timeDifference = campaignDeadline - createdAt;
      const halfTime = timeDifference / 2;
      const gigDeadline = new Date(createdAt.getTime() + halfTime).toISOString();

      const gigsToInsert = Array.from({ length: tripsToCreate }, () => ({
        campaign_id: campaign.id,
        status: 'available',
        trips_assigned: 1,
        freelancer_payout_per_trip: 500, // Fixed at 500 KSh
        deadline: gigDeadline, // Half the campaign deadline duration
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));

      console.log(`Inserting ${tripsToCreate} gigs for campaign ${campaign.id} with deadline ${gigDeadline}`);
      const { error: insertError } = await supabaseAdmin
        .from('gigs')
        .insert(gigsToInsert);
      if (insertError) {
        errors.push(`Failed to create gigs for campaign ${campaign.id}: ${insertError.message}`);
        console.error(`Insert error for campaign ${campaign.id}:`, insertError);
        continue;
      }

      created += tripsToCreate;
      console.log(`Successfully created ${tripsToCreate} gigs for campaign ${campaign.id}`);
    }

    return { created, errors };
  } catch (error) {
    errors.push(`Unexpected error: ${error.message}`);
    console.error('Unexpected error in createGigsForPendingCampaigns:', error);
    return { created, errors };
  }
};

export const resetOverdueGigs = async () => {
  try {
    const now = new Date().toISOString();
    const { data: overdueGigs, error: fetchError } = await supabaseAdmin
      .from('gigs')
      .select('id, campaign_id')
      .eq('status', 'assigned')
      .lt('deadline', now);

    if (fetchError) throw fetchError;
    if (!overdueGigs || overdueGigs.length === 0) {
      console.log('No overdue gigs found.');
      return { reset: 0 };
    }

    const gigIds = overdueGigs.map(gig => gig.id);
    const { error: updateError } = await supabaseAdmin
      .from('gigs')
      .update({
        status: 'available',
        freelancer_id: null,
        updated_at: new Date().toISOString(),
      })
      .in('id', gigIds);

    if (updateError) throw updateError;

    // Update trips_remaining for affected campaigns
    const campaignIds = [...new Set(overdueGigs.map(gig => gig.campaign_id))];
    for (const campaignId of campaignIds) {
      await updateCampaignTrips(campaignId);
    }

    console.log(`Reset ${overdueGigs.length} overdue gigs to available.`);
    return { reset: overdueGigs.length };
  } catch (error) {
    console.error('Error in resetOverdueGigs:', error);
    throw error;
  }
};