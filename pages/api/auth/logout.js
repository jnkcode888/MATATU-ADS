// pages/api/auth/logout.js
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Clear Supabase session cookies
    res.setHeader('Set-Cookie', [
      'sb-access-token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0',
      'sb-refresh-token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0',
    ]);

    return res.status(200).json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    return res.status(500).json({ error: 'Error logging out', details: error.message });
  }
}