// utils/mpesa.js
import axios from 'axios';

const consumerKey = process.env.MPESA_CONSUMER_KEY || '0t8r0yh4aA4tV30qV9d5UNGcEHFRAMJY1iJ2';
const consumerSecret = process.env.MPESA_CONSUMER_SECRET || 'sVotg9RuP4xnsILQv5ULiFEAUgQXa20';
const shortcode = process.env.MPESA_SHORTCODE || 'N/A';
const passkey = process.env.MPESA_PASSKEY || 'your_mpesa_passkey_here';
const callbackUrl = process.env.MPESA_CALLBACK_URL || 'your_callback_url_here';

const getAccessToken = async () => {
  try {
    const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');
    const response = await axios.get(
      'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials',
      {
        headers: {
          Authorization: `Basic ${auth}`,
        },
      }
    );
    return response.data.access_token;
  } catch (error) {
    console.error('Error fetching M-Pesa access token:', error.response?.data || error.message);
    throw new Error('Failed to fetch M-Pesa access token: ' + (error.response?.data?.errorMessage || 'Unknown error'));
  }
};

export const initiateSTKPush = async (phoneNumber, amount) => {
  try {
    const accessToken = await getAccessToken();
    const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
    const password = Buffer.from(`${shortcode}${passkey}${timestamp}`).toString('base64');

    const payload = {
      BusinessShortCode: shortcode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: 'CustomerPayBillOnline',
      Amount: Math.floor(amount), // Ensure amount is an integer
      PartyA: phoneNumber,
      PartyB: shortcode,
      PhoneNumber: phoneNumber,
      CallBackURL: callbackUrl,
      AccountReference: 'FreelancerPayout',
      TransactionDesc: 'Payout to freelancer',
    };

    const response = await axios.post(
      'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest',
      payload,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    return response.data;
  } catch (error) {
    console.error('Error initiating STK Push:', error.response?.data || error.message);
    throw new Error('STK Push failed: ' + (error.response?.data?.errorMessage || error.message || 'Unknown error'));
  }
};