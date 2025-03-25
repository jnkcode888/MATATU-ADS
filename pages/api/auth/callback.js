import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_KEY
);

export default async function handler(req, res) {
  const { code } = req.query;

  if (!code) {
    return res.redirect('/register?error=' + encodeURIComponent('No authorization code provided'));
  }

  try {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) throw error;

    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('user_type') // Only fetch user_type for redirection
      .eq('id', data.session.user.id)
      .single();

    res.setHeader('Set-Cookie', [
      `sb-access-token=${data.session.access_token}; Path=/; HttpOnly; SameSite=Lax`,
      `sb-refresh-token=${data.session.refresh_token}; Path=/; HttpOnly; SameSite=Lax`
    ]);

    if (profileError && profileError.code !== 'PGRST116') throw profileError;

    if (!profile) {
      // New user, redirect to complete registration
      res.redirect('/complete-registration');
    } else {
      // Existing user, redirect based on user_type
      switch (profile.user_type) {
        case 'admin':
          res.redirect('/admin');
          break;
        case 'freelancer':
          res.redirect('/freelancer/dashboard');
          break;
        case 'business':
          res.redirect('/business/dashboard');
          break;
        default:
          res.redirect('/dashboard'); // Fallback for undefined roles
      }
    }
  } catch (error) {
    console.error('Auth callback error:', error);
    res.redirect('/register?error=' + encodeURIComponent(error.message || 'Authentication failed'));
  }
}