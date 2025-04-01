import { supabase } from '../../lib/supabase';

export default async function handler(req, res) {
  const token = req.headers.authorization?.split('Bearer ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return res.status(401).json({ error: 'Invalid token' });

    if (req.method === 'GET') {
      const { data: inProgressGigs, error: gigsError } = await supabase
        .from('gigs')
        .select(`
          id,
          campaign_id,
          status,
          accepted_at,
          campaigns:campaign_id (
            budget
          )
        `)
        .eq('freelancer_id', user.id)
        .eq('status', 'submitted');

      if (gigsError) throw gigsError;

      const { data: payments, error: paymentsError } = await supabase
        .from('payments')
        .select('id, amount, created_at, gig_id')
        .eq('freelancer_id', user.id);

      if (paymentsError) throw paymentsError;

      const earnings = [
        ...inProgressGigs.map(gig => ({
          id: gig.id,
          type: 'gig',
          status: 'In Progress',
          amount: gig.campaigns?.budget || 0,
          timestamp: gig.accepted_at,
          campaign_id: gig.campaign_id,
        })),
        ...payments.map(payment => ({
          id: payment.id,
          type: 'payment',
          status: 'Paid',
          amount: payment.amount,
          timestamp: payment.created_at,
          gig_id: payment.gig_id,
        })),
      ];

      earnings.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      return res.status(200).json(earnings);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Earnings API Error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      ...(process.env.NODE_ENV === 'development' && { details: error.message })
    });
  }
}