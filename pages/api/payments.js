import { supabase } from '../../lib/supabase';
import axios from 'axios';

export default async function handler(req, res) {
  try {
    const token = req.headers.authorization?.split('Bearer ')[1];
    if (!token) {
      console.error('No token provided');
      return res.status(401).json({ error: 'Unauthorized - No token provided' });
    }

    try {
      // Verify the token using Supabase's admin client
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      
      if (authError || !user) {
        console.error('Token verification failed', authError);
        return res.status(401).json({ error: 'Unauthorized - Invalid token' });
      }
      
      const userId = user.id;
      
      if (req.method === 'POST') {
        const { amount, phone, campaign_id } = req.body;
        
        // Validate inputs
        if (!amount || !phone || !campaign_id) {
          console.error('Missing required fields', { amount, phone, campaign_id });
          return res.status(400).json({ error: 'Missing required fields' });
        }

        try {
          const authToken = Buffer.from(
            `${process.env.MPESA_CONSUMER_KEY}:${process.env.MPESA_CONSUMER_SECRET}`
          ).toString('base64');

          const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, -3);
          const password = Buffer.from(
            `${process.env.MPESA_SHORTCODE}${process.env.MPESA_PASSKEY}${timestamp}`
          ).toString('base64');

          const { data } = await axios.post(
            'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest',
            {
              BusinessShortCode: process.env.MPESA_SHORTCODE,
              Password: password,
              Timestamp: timestamp,
              TransactionType: 'CustomerPayBillOnline',
              Amount: amount,
              PartyA: phone,
              PartyB: process.env.MPESA_SHORTCODE,
              PhoneNumber: phone,
              CallBackURL: `${process.env.APP_URL}/api/mpesa-callback`,
              AccountReference: 'MatatuAds',
              TransactionDesc: 'Campaign Payment',
            },
            { headers: { Authorization: `Bearer ${authToken}` } }
          );

          // Log successful M-Pesa request
          console.log('M-Pesa request successful', { 
            userId, 
            checkoutRequestId: data.CheckoutRequestID,
            amount,
            phone: phone.slice(-4) // Log only last 4 digits for privacy
          });

          // Save to database
          const { error: dbError } = await supabase
            .from('payments')
            .insert([
              { 
                user_id: userId,
                campaign_id, 
                amount, 
                phone_number: phone,
                transaction_id: data.CheckoutRequestID, 
                status: 'pending' 
              }
            ]);

          if (dbError) {
            console.error('Database error', dbError);
            // Continue anyway since M-Pesa request was successful
          }

          return res.status(200).json(data);
        } catch (mpesaError) {
          console.error('M-Pesa API error', { 
            message: mpesaError.message,
            response: mpesaError.response?.data,
            status: mpesaError.response?.status
          });
          return res.status(502).json({ 
            error: 'Payment gateway error',
            details: mpesaError.response?.data || mpesaError.message
          });
        }
      }
      return res.status(405).json({ error: 'Method not allowed' });
    } catch (authError) {
      console.error('Token verification failed', authError);
      return res.status(401).json({ error: 'Unauthorized - Invalid token' });
    }
  } catch (error) {
    console.error('Server error', { 
      message: error.message,
      stack: error.stack
    });
    return res.status(500).json({ error: 'Internal server error' });
  }
}