// lib/supabase.js
import { createClient } from '@supabase/supabase-js';

// Environment variables for the regular client (anon key)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_KEY;

console.log('Supabase URL:', supabaseUrl);
console.log('Supabase Key:', supabaseKey);

// Validate environment variables for the regular client
if (!supabaseUrl || !supabaseKey) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_KEY must be set in .env.local');
}

// Initialize the regular Supabase client
const getSupabaseClient = () => {
  if (typeof window !== 'undefined') {
    const clientKey = Symbol.for('supabaseClient');
    if (!window[clientKey]) {
      window[clientKey] = createClient(supabaseUrl, supabaseKey, {
        auth: {
          autoRefreshToken: true,
          persistSession: true,
        },
        global: {
          headers: {
            Accept: 'application/json',
            'apikey': supabaseKey,
          },
        },
      });
      console.log('Supabase client initialized in browser');
    }
    return window[clientKey];
  }
  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
};

// Initialize the admin Supabase client (only on the server side)
let supabaseAdmin = null;
if (typeof window === 'undefined') {
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  console.log('Supabase Service Role Key (server-side):', supabaseServiceKey);

  if (!supabaseServiceKey) {
    console.error('SUPABASE_SERVICE_ROLE_KEY is not set. Admin operations will fail.');
  } else {
    supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
    console.log('Supabase admin client initialized on server');
  }
}

export const supabase = getSupabaseClient();
export { supabaseAdmin };