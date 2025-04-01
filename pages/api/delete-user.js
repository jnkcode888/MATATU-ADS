// pages/api/delete-user.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('Missing Supabase environment variables:', {
    hasUrl: !!supabaseUrl,
    hasServiceRoleKey: !!supabaseServiceRoleKey
  });
}

// Create Supabase client with service role key for admin operations
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

export const config = {
  api: {
    bodyParser: true, // Enable body parsing for JSON
  },
};

export default async function handler(req, res) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId } = req.query;

  if (!userId) {
    return res.status(400).json({ error: 'User ID is required' });
  }

  try {
    console.log('Attempting to delete user:', userId);

    // First, delete from users table
    const { error: usersError } = await supabase
      .from('users')
      .delete()
      .eq('id', userId);

    if (usersError) {
      console.error('Error deleting from users table:', usersError);
      return res.status(500).json({ error: 'Failed to delete user from users table' });
    }

    console.log('Successfully deleted from users table');

    // Then, delete from auth.users
    const { error: authError } = await supabase.auth.admin.deleteUser(userId);

    if (authError) {
      console.error('Error deleting from auth.users:', authError);
      return res.status(500).json({ error: 'Failed to delete user from auth.users' });
    }

    console.log('Successfully deleted from auth.users');

    return res.status(200).json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error in delete-user:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}