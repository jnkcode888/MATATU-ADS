import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default async function handler(req, res) {
  try {
    const { error } = await supabase.auth.signOut()
    
    if (error) {
      throw error
    }

    // Clear the session cookies
    res.setHeader('Set-Cookie', [
      'sb-access-token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0',
      'sb-refresh-token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0'
    ])

    res.redirect('/')
  } catch (error) {
    console.error('Logout error:', error)
    res.status(500).json({ error: 'Error logging out' })
  }
} 