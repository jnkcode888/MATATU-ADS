import { supabase } from '../../lib/supabase';

export default async function handler(req, res) {
  const token = req.headers.authorization?.split('Bearer ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return res.status(401).json({ error: 'Invalid token' });

    if (req.method === 'POST') {
      const { name, phone_number, preferred_routes } = req.body;
      const { data, error } = await supabase
        .from('users')
        .upsert({
          id: user.id,
          role: 'freelancer',
          phone_number,
          email: user.email,
          name,
          preferred_routes,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'id' });

      if (error) {
        console.error('Error updating freelancer profile:', error);
        return res.status(500).json({ 
          error: 'Database error',
          ...(process.env.NODE_ENV === 'development' && {
            details: error.message
          })
        });
      }

      return res.status(200).json(data);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      ...(process.env.NODE_ENV === 'development' && {
        details: error.message
      })
    });
  }
}