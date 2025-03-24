import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default async function handler(req, res) {
  const { code } = req.query

  if (code) {
    try {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)
      
      if (error) {
        throw error
      }

      // Set the session cookie
      res.setHeader('Set-Cookie', [
        `sb-access-token=${data.session.access_token}; Path=/; HttpOnly; SameSite=Lax`,
        `sb-refresh-token=${data.session.refresh_token}; Path=/; HttpOnly; SameSite=Lax`
      ])

      res.redirect('/')
    } catch (error) {
      console.error('Auth callback error:', error)
      res.redirect('/auth/error')
    }
  } else {
    res.redirect('/')
  }
} 