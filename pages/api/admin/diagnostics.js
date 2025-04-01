// pages/api/admin/diagnostics.js
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (!req.headers.authorization) {
    return res.status(401).json({ error: 'Unauthorized: No authorization header provided' });
  }

  const token = req.headers.authorization.split('Bearer ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized: Invalid token format' });

  try {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_KEY || process.env.NEXT_PUBLIC_SUPABASE_KEY;
    
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return res.status(401).json({ error: 'Invalid token' });
    
    const { data: campaignStats, error: campaignError } = await supabase
      .from('campaigns')
      .select('status')
      .then(({ data, error }) => {
        if (error) throw error;
        const counts = data.reduce((acc, campaign) => {
          acc[campaign.status] = (acc[campaign.status] || 0) + 1;
          return acc;
        }, {});
        return { 
          data: { 
            total: data.length,
            byStatus: counts
          }, 
          error 
        };
      });
    if (campaignError) throw campaignError;
    
    const { data: gigStats, error: gigError } = await supabase
      .from('gigs')
      .select('status, freelancer_id')
      .then(({ data, error }) => {
        if (error) throw error;
        const byStatus = data.reduce((acc, gig) => {
          acc[gig.status] = (acc[gig.status] || 0) + 1;
          return acc;
        }, {});
        const assigned = data.filter(gig => gig.freelancer_id !== null).length;
        const unassigned = data.filter(gig => gig.freelancer_id === null).length;
        return { 
          data: { 
            total: data.length,
            byStatus,
            assigned,
            unassigned
          }, 
          error 
        };
      });
    if (gigError) throw gigError;
    
    let joinStats = null;
    const { data: rpcData, error: joinError } = await supabase
      .rpc('get_campaign_gig_stats')
      .single();
    
    if (!joinError && rpcData) {
      joinStats = {
        campaigns_with_gigs: rpcData.campaigns_with_gigs,
        campaigns_without_gigs: rpcData.campaigns_without_gigs
      };
    } else {
      const { data, error: fallbackError } = await supabase
        .from('campaigns')
        .select('id, status')
        .eq('status', 'pending')
        .then(async ({ data, error }) => {
          if (error) throw error;
          const campaignChecks = await Promise.all(data.map(async (campaign) => {
            const { data: gigs, error: gigError } = await supabase
              .from('gigs')
              .select('id')
              .eq('campaign_id', campaign.id);
            if (gigError) throw gigError;
            return {
              campaign_id: campaign.id,
              has_gigs: gigs && gigs.length > 0,
              gig_count: gigs ? gigs.length : 0
            };
          }));
          return { 
            data: campaignChecks,
            error: null
          };
        });
      if (fallbackError) throw fallbackError;
      joinStats = {
        campaigns_with_gigs: data.filter(c => c.has_gigs).length,
        campaigns_without_gigs: data.filter(c => !c.has_gigs).length,
        details: data
      };
    }
    
    return res.status(200).json({
      campaignStats,
      gigStats,
      joinStats,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Diagnostic API Error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message
    });
  }
}