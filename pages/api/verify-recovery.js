import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  try {
    // Verify the user exists
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', email)
      .single();

    if (userError || !user) {
      console.error('User fetch error:', userError?.message || 'User not found');
      throw new Error('User not found');
    }

    // Send a magic link
    const { error: magicLinkError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: 'http://localhost:3000/dashboard',
      },
    });

    if (magicLinkError) {
      console.error('Magic link error:', magicLinkError.message, 'Code:', magicLinkError.code);
      if (magicLinkError.code === 'over_email_send_rate_limit') {
        throw new Error('Please wait 8 seconds before requesting another magic link.');
      }
      throw new Error(magicLinkError.message || 'Failed to send magic link');
    }

    res.status(200).json({
      message: 'A magic link has been sent to your email. Click it to log in.',
    });
  } catch (error) {
    console.error('API error:', error.message);
    res.status(400).json({ error: error.message || 'Failed to send magic link' });
  }
}
