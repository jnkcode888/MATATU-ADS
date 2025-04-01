// lib/video-analytics.js
import { supabase } from './supabase';

export async function saveVideoAnalytics(gigId, analyticsData) {
  try {
    const { data, error } = await supabase
      .from('video_analytics')
      .insert({
        gig_id: gigId,
        impressions: analyticsData.impressions || 0,
        passengers: analyticsData.passengers || 0,
        trip_duration: analyticsData.tripDuration || 0,
        route_coverage: analyticsData.routeCoverage || null,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error saving video analytics:', error);
    throw error;
  }
}

export async function getCampaignAnalytics(campaignId) {
  try {
    const { data: gigs, error: gigsError } = await supabase
      .from('gigs')
      .select('id')
      .eq('campaign_id', campaignId);

    if (gigsError) throw gigsError;

    if (!gigs || gigs.length === 0) return {
      totalImpressions: 0,
      totalPassengers: 0,
      totalDuration: 0,
      routesCovered: [],
      videoCount: 0
    };

    const gigIds = gigs.map(gig => gig.id);
    const { data: analytics, error: analyticsError } = await supabase
      .from('video_analytics')
      .select('*')
      .in('gig_id', gigIds);

    if (analyticsError) throw analyticsError;

    const aggregated = analytics.reduce((acc, curr) => ({
      totalImpressions: acc.totalImpressions + (curr.impressions || 0),
      totalPassengers: acc.totalPassengers + (curr.passengers || 0),
      totalDuration: acc.totalDuration + (curr.trip_duration || 0),
      routesCovered: [...new Set([...acc.routesCovered, curr.route_coverage].filter(Boolean))],
      videoCount: acc.videoCount + 1
    }), {
      totalImpressions: 0,
      totalPassengers: 0,
      totalDuration: 0,
      routesCovered: [],
      videoCount: 0
    });

    return aggregated;
  } catch (error) {
    console.error('Error getting campaign analytics:', error);
    throw error;
  }
}