import { supabase } from '../../lib/supabase';

export default async function handler(req, res) {
  console.log('API route called:', {
    method: req.method,
    hasAuthHeader: !!req.headers.authorization,
    bodyKeys: req.body ? Object.keys(req.body) : null
  });

  const token = req.headers.authorization?.split('Bearer ')[1];
  if (!token) {
    console.log('No token provided');
    return res.status(401).json({ error: 'Unauthorized - No token provided' });
  }

  try {
    console.log('Verifying token with Supabase');
    // Verify the token with Supabase
    const userResult = await supabase.auth.getUser(token);
    console.log('Auth result:', {
      hasData: !!userResult.data,
      hasUser: !!userResult.data?.user,
      hasError: !!userResult.error,
      errorMessage: userResult.error?.message
    });
    
    const { data: { user }, error: authError } = userResult;
    
    if (authError || !user) {
      console.log('Auth failed:', authError || 'No user found');
      return res.status(401).json({ error: 'Invalid token' });
    }

    console.log('User authenticated:', user.id);

    if (req.method === 'POST') {
      const { content } = req.body;
      console.log('Attempting to insert message:', { content, userId: user.id });
      
      const insertResult = await supabase
        .from('messages')
        .insert([{ business_id: user.id, content }]);
        
      console.log('Insert result:', {
        hasData: !!insertResult.data,
        hasError: !!insertResult.error,
        errorMessage: insertResult.error?.message,
        errorDetails: insertResult.error?.details
      });
      
      const { data, error } = insertResult;
      
      if (error) {
        console.error('Database error:', error);
        return res.status(500).json({ error: error.message });
      }
      
      console.log('Message inserted successfully');
      return res.status(201).json(data);
    }
    
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Unexpected error in API route:', error);
    return res.status(500).json({ error: error.message });
  }
}