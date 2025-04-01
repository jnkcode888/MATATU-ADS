// pages/api/mpesa-callback.js
export default async function handler(req, res) {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  
    try {
      const callbackData = req.body;
      console.log('M-Pesa Callback:', callbackData);
  
      const { ResultCode, ResultDesc, CheckoutRequestID } = callbackData.Body.stkCallback;
      if (ResultCode === 0) {
        // Transaction successful
        console.log('STK Push successful:', ResultDesc);
        // Optionally update the gig status or log the transaction
      } else {
        // Transaction failed
        console.error('STK Push failed:', ResultDesc);
        // Optionally revert gig status to 'verified' or notify admin
      }
  
      res.status(200).json({ message: 'Callback received' });
    } catch (error) {
      console.error('Error processing M-Pesa callback:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }