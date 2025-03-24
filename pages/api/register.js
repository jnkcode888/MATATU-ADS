import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey || !supabaseServiceRoleKey) {
  console.error('Missing Supabase environment variables:', {
    hasUrl: !!supabaseUrl,
    hasKey: !!supabaseKey,
    hasServiceRoleKey: !!supabaseServiceRoleKey
  });
}

// Create two Supabase clients - one for auth and one for database operations
const supabase = createClient(supabaseUrl, supabaseKey);
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

export default async function handler(req, res) {
  console.log('API route called with method:', req.method);
  
  if (!supabaseUrl || !supabaseKey || !supabaseServiceRoleKey) {
    return res.status(500).json({ 
      error: 'Server configuration error',
      details: 'Missing Supabase environment variables'
    });
  }
  
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, password, name, role, phone, userType, provider } = req.body;
    console.log('Request body:', { email, name, role, phone, userType, hasPassword: !!password, provider });

    // For Google authentication
    if (provider === 'google') {
      if (!email || !name || !role || !phone || !userType) {
        console.log('Missing required fields for Google auth:', {
          email: !email,
          name: !name,
          role: !role,
          phone: !phone,
          userType: !userType
        });
        return res.status(400).json({ 
          error: 'Missing required fields',
          details: {
            email: !email,
            name: !name,
            role: !role,
            phone: !phone,
            userType: !userType
          }
        });
      }

      // Get the current session to get the user ID
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session?.user?.id) {
        console.error('Session error:', sessionError);
        return res.status(401).json({ error: 'Not authenticated' });
      }

      // Create user profile
      const userData = {
        id: session.user.id,
        email,
        name,
        role,
        phone,
        preferred_routes: null
      };
      console.log('User data to insert:', userData);

      const { data: insertedUser, error: dbError } = await supabaseAdmin
        .from('users')
        .insert([userData])
        .select()
        .single();

      if (dbError) {
        console.error('Database error:', dbError);
        console.error('Error details:', {
          code: dbError.code,
          message: dbError.message,
          details: dbError.details,
          hint: dbError.hint
        });
        return res.status(500).json({ 
          error: 'Failed to create user profile',
          details: dbError.message,
          code: dbError.code,
          hint: dbError.hint
        });
      }

      console.log('User profile created in database:', insertedUser);

      // Return success with user data
      return res.status(200).json({
        message: 'Registration successful',
        user: session.user,
        requiresVerification: false
      });
    }

    // For email/password registration
    if (!email || !password || !name || !role || !phone || !userType) {
      console.log('Missing required fields:', {
        email: !email,
        password: !password,
        name: !name,
        role: !role,
        phone: !phone,
        userType: !userType
      });
      return res.status(400).json({ 
        error: 'Missing required fields',
        details: {
          email: !email,
          password: !password,
          name: !name,
          role: !role,
          phone: !phone,
          userType: !userType
        }
      });
    }

    console.log('Attempting to create auth user...');
    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          role,
          name,
        },
      },
    });

    if (authError) {
      console.error('Auth error:', authError);
      return res.status(400).json({ error: authError.message });
    }

    if (!authData?.user?.id) {
      console.error('No user ID returned from signup');
      return res.status(500).json({ error: 'Failed to create user account' });
    }

    console.log('Auth user created:', authData.user.id);

    // Create user profile
    const userData = {
      id: authData.user.id,
      email,
      name,
      role,
      phone,
      preferred_routes: null
    };
    console.log('User data to insert:', userData);

    const { data: insertedUser, error: dbError } = await supabaseAdmin
      .from('users')
      .insert([userData])
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      console.error('Error details:', {
        code: dbError.code,
        message: dbError.message,
        details: dbError.details,
        hint: dbError.hint
      });
      
      // Clean up auth user if database insert fails
      try {
        console.log('Attempting to clean up auth user...');
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      } catch (cleanupError) {
        console.error('Failed to clean up auth user:', cleanupError);
      }
      return res.status(500).json({ 
        error: 'Failed to create user profile',
        details: dbError.message,
        code: dbError.code,
        hint: dbError.hint
      });
    }

    console.log('User profile created in database:', insertedUser);

    // Return success with user data and verification message
    return res.status(200).json({
      message: 'Registration successful. Please check your email to verify your account.',
      user: authData.user,
      requiresVerification: true
    });
  } catch (error) {
    console.error('Registration error:', error);
    console.error('Error stack:', error.stack);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
} 