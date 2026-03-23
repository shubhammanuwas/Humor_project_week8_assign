'use client'

import { createSupabaseBrowserClient } from '@/lib/supabase/browser'

export default function SignOutButton() {
  const handleClick = async () => {
    const supabase = createSupabaseBrowserClient()
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  return (
    <button type="button" className="btn" onClick={handleClick}>
      Sign Out
    </button>
  )
}
