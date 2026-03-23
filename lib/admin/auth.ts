import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'

type ProfileRow = {
  id?: string | number | null
  email?: string | null
  is_superadmin?: boolean | null
  is_matrix_admin?: boolean | null
  [key: string]: unknown
}

type AdminContext = {
  supabase: ReturnType<typeof createSupabaseServerClient>
  userId: string
  userEmail: string | null
  profile: ProfileRow | null
  profileId: string | null
  isAdmin: boolean
}

async function getProfileByField(
  supabase: ReturnType<typeof createSupabaseServerClient>,
  field: 'id' | 'email',
  value: string
): Promise<ProfileRow | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq(field, value)
    .limit(1)
    .maybeSingle()

  if (error || !data) {
    return null
  }

  return data as ProfileRow
}

async function loadAdminContext(): Promise<AdminContext | null> {
  const supabase = createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  let profile = await getProfileByField(supabase, 'id', user.id)
  if (!profile && user.email) {
    profile = await getProfileByField(supabase, 'email', user.email)
  }

  return {
    supabase,
    userId: user.id,
    userEmail: user.email ?? null,
    profile,
    profileId:
      profile?.id === null || profile?.id === undefined ? null : String(profile.id),
    isAdmin: Boolean(profile?.is_superadmin) || Boolean(profile?.is_matrix_admin),
  }
}

export async function requireAdminPage() {
  const context = await loadAdminContext()

  if (!context) {
    redirect('/login')
  }

  if (!context.isAdmin) {
    redirect('/login?error=admin_required')
  }

  return context
}

export async function getAdminActionContext(): Promise<
  { context: AdminContext } | { error: string }
> {
  const context = await loadAdminContext()

  if (!context) {
    return { error: 'Please sign in again.' }
  }

  if (!context.isAdmin) {
    return { error: 'Only superadmins or matrix admins can use this tool.' }
  }

  if (!context.profileId) {
    return { error: 'Missing profiles.id for the signed-in admin user.' }
  }

  return { context }
}
