// pages/api/delete-user-from-users-table.js
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
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('email', email);
    if (error) {
      console.error('Error deleting user from users table:', error);
      return res.status(500).json({ error: `Failed to delete user: ${error.message}` });
    }

    console.log(`Successfully deleted user with email ${email} from users table`);
    return res.status(200).json({ message: 'User deleted successfully from users table' });
  } catch (err) {
    console.error('Unexpected error in delete-user-from-users-table API:', err);
    return res.status(500).json({ error: `Server error: ${err.message}` });
  }
}