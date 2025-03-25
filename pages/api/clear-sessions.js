// pages/api/clear-sessions.js
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email } = req.body;

  if (!email || typeof email !== 'string') {
    return res.status(400).json({ error: 'Invalid or missing email' });
  }

  try {
    // Step 1: Fetch the user by email to get their ID
    const { data: users, error: fetchError } = await supabase.auth.admin.listUsers();
    if (fetchError) {
      console.error('Error fetching users:', fetchError);
      return res.status(500).json({ error: `Failed to fetch users: ${fetchError.message}` });
    }

    const user = users.users.find(u => u.email === email);
    if (!user) {
      console.log(`No user found with email ${email}`);
      return res.status(404).json({ error: 'User not found' });
    }

    // Step 2: Sign out the user using their ID
    const { error: signOutError } = await supabase.auth.admin.signOut(user.id);
    if (signOutError) {
      console.error('Error signing out user:', signOutError);
      return res.status(500).json({ error: `Failed to sign out user: ${signOutError.message}` });
    }

    console.log('Successfully signed out user with email', email);
    return res.status(200).json({ message: 'Sessions cleared successfully' });
  } catch (err) {
    console.error('Unexpected error in clear-sessions API:', err);
    return res.status(500).json({ error: `Server error: ${err.message}` });
  }
}