import { supabase, supabaseAdmin } from '../../lib/supabase';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, password, name, phoneNumber, userType } = req.body;

    console.log('Received registration request:', { email, name, phoneNumber, userType });

    if (!email || !password || !name || !phoneNumber || !userType) {
      return res.status(400).json({
        error: 'Missing required fields',
        details: { email: !email, password: !password, name: !name, phoneNumber: !phoneNumber, userType: !userType },
      });
    }

    if (!['business', 'freelancer'].includes(userType)) {
      return res.status(400).json({
        error: 'Invalid user type',
        details: `user_type must be 'business' or 'freelancer', received: ${userType}`,
      });
    }

    // Check if a user with this email already exists in Supabase Auth
    const { data: existingAuthUsers, error: authCheckError } = await supabaseAdmin.auth.admin.listUsers();
    if (authCheckError) {
      console.error('Error checking existing auth users:', authCheckError);
      return res.status(500).json({
        error: 'Failed to check existing users',
        details: authCheckError.message,
      });
    }

    const existingAuthUser = existingAuthUsers.users.find((user) => user.email === email);
    if (existingAuthUser) {
      console.log('User with email already exists in Auth:', existingAuthUser.id);
      // If the user exists in Auth, check the users table
      const { data: existingUser, error: userCheckError } = await supabaseAdmin
        .from('users')
        .select('id, email, user_type')
        .eq('id', existingAuthUser.id)
        .maybeSingle();

      if (userCheckError) {
        console.error('Error checking users table:', userCheckError);
        return res.status(500).json({
          error: 'Database error checking existing user',
          details: userCheckError.message,
        });
      }

      if (existingUser) {
        console.log('Existing user found in users table:', existingUser);
        if (existingUser.user_type !== userType) {
          console.log(`Updating user_type from ${existingUser.user_type} to ${userType}`);
          const { error: updateError } = await supabaseAdmin
            .from('users')
            .update({
              user_type: userType,
              role: userType,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existingUser.id);

          if (updateError) {
            console.error('Error updating user_type:', updateError);
            return res.status(500).json({
              error: 'Failed to update user type',
              details: updateError.message,
            });
          }
        }

        return res.status(200).json({
          message: 'Registration successful. Please check your email to verify your account.',
          user: { id: existingUser.id, email, name, user_type: userType },
          requiresVerification: true,
        });
      }
    }

    // If no existing user in Auth, proceed with signup
    console.log('Attempting email/password signup for:', email, 'with user_type:', userType);

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name, user_type: userType },
        emailRedirectTo: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/verify-email`,
      },
    });

    if (authError) {
      console.error('Auth signup error:', authError);
      return res.status(400).json({
        error: 'Authentication failed',
        details: authError.message,
      });
    }

    if (!authData.user) {
      console.error('No user data returned from signup');
      return res.status(500).json({
        error: 'User creation failed',
        details: 'No user data returned',
      });
    }

    console.log('Auth user created:', authData.user.id);

    if (!supabaseAdmin) {
      console.error('Supabase admin client not initialized');
      return res.status(500).json({
        error: 'Server configuration error',
        details: 'Admin client not available',
      });
    }

    // Double-check the users table (in case of race condition)
    const { data: existingUserAfterSignup, error: userCheckErrorAfterSignup } = await supabaseAdmin
      .from('users')
      .select('id, email, user_type')
      .eq('id', authData.user.id)
      .maybeSingle();

    if (userCheckErrorAfterSignup) {
      console.error('Error checking users table after signup:', userCheckErrorAfterSignup);
      return res.status(500).json({
        error: 'Database error checking existing user',
        details: userCheckErrorAfterSignup.message,
      });
    }

    if (existingUserAfterSignup) {
      if (existingUserAfterSignup.email === email) {
        console.log('Email matches existing user after signup with user_type:', existingUserAfterSignup.user_type);
        if (existingUserAfterSignup.user_type !== userType) {
          console.log(`Updating user_type from ${existingUserAfterSignup.user_type} to ${userType}`);
          const { error: updateError } = await supabaseAdmin
            .from('users')
            .update({
              user_type: userType,
              role: userType,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existingUserAfterSignup.id);

          if (updateError) {
            console.error('Error updating user_type:', updateError);
            return res.status(500).json({
              error: 'Failed to update user type',
              details: updateError.message,
            });
          }
        }

        return res.status(200).json({
          message: 'Registration successful. Please check your email to verify your account.',
          user: { id: authData.user.id, email, name, user_type: userType },
          requiresVerification: true,
        });
      }

      console.log('Email mismatch with existing user, cleaning up auth entry');
      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      if (deleteError) console.error('Failed to clean up duplicate auth user:', deleteError);
      return res.status(400).json({
        error: 'User ID conflict',
        details: 'A profile with this ID already exists with a different email. Please contact support.',
      });
    }

    // Insert new user into the users table
    const userData = {
      id: authData.user.id,
      email,
      name,
      phone_number: phoneNumber,
      user_type: userType,
      role: userType,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      preferred_routes: null,
      phone: null,
      gender: null,
      location: null,
      gigs_completed: 0,
      impressions: 0,
      analytics: null,
      verified: false,
      rating: 0,
      ratings_count: 0,
    };

    console.log('Inserting user data into users table:', userData);
    const { data: insertedUser, error: dbError } = await supabaseAdmin
      .from('users')
      .insert([userData])
      .select()
      .single();

    if (dbError) {
      console.error('Database insert error:', dbError);
      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      if (deleteError) console.error('Failed to clean up auth user:', deleteError);
      return res.status(500).json({
        error: 'Database error',
        details: dbError.message,
        code: dbError.code,
      });
    }

    console.log('User inserted successfully:', insertedUser);

    return res.status(200).json({
      message: 'Registration successful. Please check your email to verify your account.',
      user: { id: authData.user.id, email, name, user_type: userType },
      requiresVerification: true,
    });
  } catch (error) {
    console.error('Unexpected error in /api/register:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error.message,
    });
  }
}