import { createClient } from '@supabase/supabase-js';

// Use environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { campaignId, tripsNeeded, deadline, pricePerTrip } = req.body;

    // Calculate gig deadline as half the time between creation and campaign deadline
    const createdAt = new Date();
    const campaignDeadline = new Date(deadline);
    const timeDifference = campaignDeadline - createdAt;
    const halfTime = timeDifference / 2;
    const gigDeadline = new Date(createdAt.getTime() + halfTime).toISOString();

    // Create gigs using admin client
    const gigsToInsert = Array.from({ length: tripsNeeded }, () => ({
      campaign_id: campaignId,
      status: 'available',
      trips_assigned: 1,
      freelancer_payout_per_trip: 500, // Fixed at 500 KSh per trip
      deadline: gigDeadline,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      route_id: 1 // Default route ID
    }));

    console.log('Creating gigs with:', {
      numberOfGigs: tripsNeeded,
      campaignId,
      deadline: gigDeadline
    });

    const { data, error } = await supabaseAdmin
      .from('gigs')
      .insert(gigsToInsert)
      .select();

    if (error) {
      console.error('Error inserting gigs:', error);
      throw error;
    }

    console.log('Successfully created gigs:', data?.length || 0);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Error in create-gigs API:', error);
    return res.status(500).json({ error: error.message });
  }
} 