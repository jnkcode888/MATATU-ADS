// pages/api/auth/callback.js
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_KEY
);

export default async function handler(req, res) {
  const { code, type, access_token, refresh_token, error } = req.query;

  if (error) {
    console.error('OAuth callback error:', error);
    return res.status(400).json({ error: 'Authentication failed: ' + error });
  }

  try {
    let sessionData;

    if (access_token && refresh_token) {
      // Handle implicit flow where tokens are provided directly
      sessionData = { access_token, refresh_token };
    } else if (code) {
      // Handle authorization code flow
      const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
      if (exchangeError) throw exchangeError;
      sessionData = data.session;
    } else {
      return res.status(400).json({ error: 'No authorization code or tokens provided' });
    }

    const userId = sessionData.user?.id || (await supabase.auth.getUser(sessionData.access_token)).data.user?.id;
    if (!userId) throw new Error('Unable to retrieve user ID from session');

    // Check if user exists in the users table
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('user_type')
      .eq('id', userId)
      .single();

    // Set session cookies
    res.setHeader('Set-Cookie', [
      `sb-access-token=${sessionData.access_token}; Path=/; HttpOnly; SameSite=Lax`,
      `sb-refresh-token=${sessionData.refresh_token}; Path=/; HttpOnly; SameSite=Lax`
    ]);

    if (profileError && profileError.code !== 'PGRST116') throw profileError; // PGRST116 = no rows found

    let redirectUrl = '/dashboard'; // Default redirect

    if (!profile) {
      // New user - create profile with the type from query
      if (type === 'business' || type === 'freelancer') {
        const { error: insertError } = await supabase.from('users').insert({
          id: userId,
          email: sessionData.user?.email,
          user_type: type,
          created_at: new Date().toISOString(),
        });

        if (insertError) throw insertError;

        redirectUrl = type === 'business' ? '/business/dashboard' : '/freelancer/profile';
      } else {
        redirectUrl = '/complete-registration';
      }
    } else {
      // Existing user - redirect based on user_type
      switch (profile.user_type) {
        case 'admin':
          redirectUrl = '/admin';
          break;
        case 'freelancer':
          redirectUrl = '/freelancer/profile';
          break;
        case 'business':
          redirectUrl = '/business/dashboard';
          break;
        default:
          redirectUrl = '/dashboard';
      }
    }

    return res.status(200).json({ redirectUrl });
  } catch (error) {
    console.error('Auth callback error:', error);
    return res.status(500).json({ error: error.message || 'Authentication failed' });
  }
}