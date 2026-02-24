'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function AuthListener() {
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()

    // Listen for PASSWORD_RECOVERY event
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        router.push('/reset-password')
      }
    })

    // Handle hash fragments (implicit flow / older Supabase versions)
    const hash = window.location.hash
    if (hash) {
      const hashParams = new URLSearchParams(hash.substring(1))
      const accessToken = hashParams.get('access_token')
      const refreshToken = hashParams.get('refresh_token')
      const type = hashParams.get('type')

      if (accessToken && refreshToken && type === 'recovery') {
        // Set the session from hash fragments, then redirect
        supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        }).then(() => {
          // Clean the URL hash
          window.history.replaceState(null, '', window.location.pathname)
          router.push('/reset-password')
        })
      }
    }

    // Handle code parameter in URL (PKCE flow fallback)
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    const currentPath = window.location.pathname

    if (code && currentPath !== '/auth/callback' && currentPath !== '/auth/confirm') {
      window.location.href = `/auth/callback?code=${code}&next=/reset-password`
    }

    // Handle token_hash in URL (direct token flow)
    const tokenHash = params.get('token_hash')
    const tokenType = params.get('type')
    if (tokenHash && tokenType && currentPath !== '/auth/confirm') {
      window.location.href = `/auth/confirm?token_hash=${tokenHash}&type=${tokenType}&next=/reset-password`
    }

    return () => {
      subscription.unsubscribe()
    }
  }, [router])

  return null
}
