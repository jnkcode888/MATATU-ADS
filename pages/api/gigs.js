import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ckfsglsyfbdlgwrwxlvp.supabase.co';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNrZnNnbHN5ZmJkbGd3cnd4bHZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI1Mzg4MzIsImV4cCI6MjA1ODExNDgzMn0.HWYpAmZywZurUCOIE35-UFZMc8ZBD1_tRvyoN9qvoMI';
const supabaseAdmin = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req, res) {
  const { method } = req;

  const token = req.headers.authorization?.split('Bearer ')[1];
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });

  const getUserIdFromToken = async () => {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
      throw new Error('Invalid or expired token');
    }
    return user;
  };

  try {
    const user = await getUserIdFromToken();

    switch (method) {
      case 'GET':
        const { page = 1, limit = 50 } = req.query;
        const offset = (page - 1) * limit;

        const { resetOverdueGigs } = await import('../../lib/campaign-utils.js');
        const { reset } = await resetOverdueGigs();
        console.log(`Reset ${reset} overdue gigs before fetching campaigns.`);

        const { data: campaigns, error: campaignsError } = await supabase
          .from('campaigns')
          .select(`
            id,
            product_name,
            script,
            route,
            budget,
            price_per_trip,
            trips_needed,
            trips_remaining,
            status,
            deadline,
            gigs: gigs (
              id,
              status,
              trips_assigned,
              freelancer_id,
              freelancer_payout_per_trip,
              deadline
            )
          `)
          .in('status', ['pending', 'active'])
          .gt('trips_remaining', 0)
          .range(offset, offset + limit - 1);

        if (campaignsError) {
          console.error('Supabase error in /api/gigs GET:', campaignsError);
          return res.status(500).json({ error: campaignsError.message });
        }

        console.log('Fetched campaigns with gigs from Supabase:', JSON.stringify(campaigns, null, 2));

        const enrichedCampaigns = campaigns.map(campaign => {
          const availableGigs = campaign.gigs.filter(gig => gig.status === 'available').reduce((sum, gig) => sum + (gig.trips_assigned || 1), 0);
          const totalTrips = campaign.gigs.reduce((sum, gig) => sum + (gig.trips_assigned || 1), 0);
          const gigDeadline = campaign.gigs.length > 0 ? campaign.gigs[0].deadline : null; // Use gig deadline
          console.log(`Campaign ${campaign.id}: available_gigs=${availableGigs}, total_trips=${totalTrips}, gig_deadline=${gigDeadline}`);
          return {
            ...campaign,
            available_gigs: availableGigs,
            total_trips: totalTrips,
            freelancer_payout_per_trip: 500,
            gig_deadline: gigDeadline, // Pass gig deadline, not campaign deadline
          };
        });

        const { count, error: countError } = await supabase
          .from('campaigns')
          .select('id', { count: 'exact' })
          .in('status', ['pending', 'active'])
          .gt('trips_remaining', 0);

        if (countError) throw countError;

        console.log('API response:', JSON.stringify(enrichedCampaigns, null, 2));
        return res.status(200).json({
          campaigns: enrichedCampaigns,
          totalPages: Math.ceil(count / limit),
        });

      case 'POST':
        const { campaign_id, status, trips_to_assign } = req.body;

        if (!campaign_id || !status || !trips_to_assign) {
          return res.status(400).json({ error: 'Missing required fields: campaign_id, status, trips_to_assign' });
        }

        const numericTrips = Number(trips_to_assign);
        if (isNaN(numericTrips) || numericTrips <= 0) {
          return res.status(400).json({ error: 'Trips to assign must be a positive number' });
        }

        const { data: campaign, error: campaignError } = await supabase
          .from('campaigns')
          .select('trips_remaining, price_per_trip, deadline')
          .eq('id', campaign_id)
          .single();

        if (campaignError) throw campaignError;
        if (!campaign) return res.status(404).json({ error: 'Campaign not found' });

        if (campaign.trips_remaining < numericTrips) {
          return res.status(400).json({ error: `Only ${campaign.trips_remaining} trips remaining` });
        }

        const { data: availableGigs, error: gigsError } = await supabase
          .from('gigs')
          .select('id')
          .eq('campaign_id', campaign_id)
          .eq('status', 'available')
          .limit(numericTrips);

        if (gigsError) throw gigsError;
        if (availableGigs.length < numericTrips) {
          return res.status(400).json({ error: 'Not enough available gigs' });
        }

        const gigsToUpdate = availableGigs.slice(0, numericTrips).map(gig => gig.id);

        const { error: updateGigError } = await supabaseAdmin
          .from('gigs')
          .update({
            freelancer_id: user.id,
            status: 'assigned',
            assigned_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .in('id', gigsToUpdate);

        if (updateGigError) throw updateGigError;

        const newTripsRemaining = campaign.trips_remaining - numericTrips;
        const { error: updateCampaignError } = await supabaseAdmin
          .from('campaigns')
          .update({
            trips_remaining: newTripsRemaining >= 0 ? newTripsRemaining : 0,
            updated_at: new Date().toISOString(),
          })
          .eq('id', campaign_id);

        if (updateCampaignError) throw updateCampaignError;

        return res.status(200).json({
          message: `Assigned ${numericTrips} trips for campaign ${campaign_id}`,
          trips_remaining: newTripsRemaining,
        });

      default:
        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).json({ error: `Method ${method} Not Allowed` });
    }
  } catch (error) {
    console.error('API error in /api/gigs:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}