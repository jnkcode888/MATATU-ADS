// pages/api/campaigns.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ckfsglsyfbdlgwrwxlvp.supabase.co';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNrZnNnbHN5ZmJkbGd3cnd4bHZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI1Mzg4MzIsImV4cCI6MjA1ODExNDgzMn0.HWYpAmZywZurUCOIE35-UFZMc8ZBD1_tRvyoN9qvoMI';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Must be set in environment

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

export default async function handler(req, res) {
  const { method } = req;
  const token = req.headers.authorization?.split('Bearer ')[1];
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const getUserIdFromToken = async () => {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) throw new Error('Invalid or expired token');
    return user;
  };

  const getUserTypeAndPhone = async (user) => {
    const { data, error } = await supabase
      .from('users')
      .select('user_type, phone_number')
      .eq('id', user.id)
      .single();

    if (error || !data) {
      if (!data) {
        const { error: insertError } = await supabase
          .from('users')
          .insert({
            id: user.id,
            email: user.email,
            user_type: 'business',
            created_at: new Date().toISOString(),
          });
        if (insertError) throw new Error(`Failed to create user record: ${insertError.message}`);
        return { user_type: 'business', phone_number: null };
      }
      throw new Error(`Failed to fetch user: ${error.message}`);
    }
    return data;
  };

  try {
    const user = await getUserIdFromToken();
    const { user_type } = await getUserTypeAndPhone(user);
    if (user_type !== 'business') return res.status(403).json({ error: 'Access denied: Business user required' });

    switch (method) {
      case 'GET':
        const { data: campaigns, error: campaignsError } = await supabase
          .from('campaigns')
          .select('id, product_name, script, route, budget, price_per_trip, trips_needed, trips_remaining, status, deadline, created_at')
          .eq('business_id', user.id);
        if (campaignsError) throw new Error(campaignsError.message);
        return res.status(200).json(campaigns);

      case 'POST':
        const { product_name, script, route, budget, deadline } = req.body;
        if (!product_name || !route || !budget || !deadline) {
          return res.status(400).json({ error: 'Missing required fields' });
        }

        const pricePerTrip = 1000;
        const tripsNeeded = Math.floor(budget / pricePerTrip);
        if (tripsNeeded <= 0) return res.status(400).json({ error: 'Budget too low to create any trips' });

        const { data: newCampaign, error: campaignError } = await supabaseAdmin
          .from('campaigns')
          .insert({
            business_id: user.id,
            product_name,
            script: script || null,
            route,
            budget,
            price_per_trip: pricePerTrip,
            trips_needed: tripsNeeded,
            trips_remaining: tripsNeeded,
            status: 'active',
            deadline,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .select()
          .single();
        if (campaignError) throw new Error(`Failed to create campaign: ${campaignError.message}`);

        const createdAt = new Date(newCampaign.created_at);
        const campaignDeadline = new Date(deadline);
        const timeDifference = campaignDeadline - createdAt;
        const halfTime = timeDifference / 2;
        const gigDeadline = new Date(createdAt.getTime() + halfTime).toISOString();

        const gigsToInsert = Array.from({ length: tripsNeeded }, () => ({
          campaign_id: newCampaign.id,
          status: 'available',
          trips_assigned: 1,
          freelancer_payout_per_trip: 500,
          deadline: gigDeadline,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }));

        const { error: gigsError } = await supabaseAdmin
          .from('gigs')
          .insert(gigsToInsert);
        if (gigsError) throw new Error(`Failed to create gigs: ${gigsError.message}`);

        return res.status(201).json({
          message: `Campaign created successfully with ${tripsNeeded} gig${tripsNeeded !== 1 ? 's' : ''} ready for freelancers`,
          campaignId: newCampaign.id,
        });

      case 'PATCH':
        const { campaign_id, price_per_trip } = req.body;
        if (!campaign_id || !price_per_trip) return res.status(400).json({ error: 'Missing campaign_id or price_per_trip' });

        const numericPrice = Number(price_per_trip);
        if (isNaN(numericPrice) || numericPrice <= 0) return res.status(400).json({ error: 'Price per trip must be positive' });

        const { data: updatedCampaign, error: updateError } = await supabase
          .from('campaigns')
          .update({ price_per_trip: numericPrice, updated_at: new Date().toISOString() })
          .eq('id', campaign_id)
          .eq('business_id', user.id)
          .select()
          .single();
        if (updateError) throw new Error(updateError.message);
        if (!updatedCampaign) return res.status(404).json({ error: 'Campaign not found or not authorized' });

        return res.status(200).json(updatedCampaign);

      default:
        res.setHeader('Allow', ['GET', 'POST', 'PATCH']);
        return res.status(405).json({ error: `Method ${method} Not Allowed` });
    }
  } catch (error) {
    console.error('API error in /api/campaigns:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}