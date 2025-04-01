// pages/api/reassign-gig.js
import { supabase } from '../../lib/supabase';

export default async function handler(req, res) {
  const token = req.headers.authorization?.split('Bearer ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return res.status(401).json({ error: 'Invalid token' });

    // Check if user is an admin
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userError || !userData || userData.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can reassign gigs' });
    }

    if (req.method === 'POST') {
      const { gig_id } = req.body;

      if (!gig_id) {
        return res.status(400).json({ error: 'Missing gig_id' });
      }

      // Fetch the gig
      const { data: gig, error: gigError } = await supabase
        .from('gigs')
        .select('id, status, deadline, freelancer_id')
        .eq('id', gig_id)
        .single();

      if (gigError || !gig) {
        return res.status(404).json({ error: 'Gig not found' });
      }

      // Check if the deadline has passed
      if (!gig.deadline || new Date(gig.deadline) >= new Date()) {
        return res.status(400).json({ error: 'Gig deadline has not yet passed' });
      }

      // Check if the gig is assigned but not submitted
      if (gig.status !== 'assigned') {
        return res.status(400).json({ error: 'Gig is not in assigned state' });
      }

      // Reassign the gig by setting freelancer_id to null and status to available
      const { error: updateError } = await supabase
        .from('gigs')
        .update({
          freelancer_id: null,
          status: 'available',
          assigned_at: null
        })
        .eq('id', gig_id);

      if (updateError) {
        console.error('Error reassigning gig:', updateError);
        return res.status(500).json({ error: 'Database error', details: updateError.message });
      }

      // Delete any existing gig_videos entries (optional, if you want to clear partial uploads)
      const { error: deleteError } = await supabase
        .from('gig_videos')
        .delete()
        .eq('gig_id', gig_id);

      if (deleteError) {
        console.error('Error deleting gig videos:', deleteError);
        return res.status(500).json({ error: 'Database error', details: deleteError.message });
      }

      return res.status(200).json({ message: 'Gig reassigned successfully' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}