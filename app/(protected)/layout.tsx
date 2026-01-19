import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ProtectedProviders } from '@/components/providers/ProtectedProviders'

export const dynamic = 'force-dynamic'

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  if (!supabase) {
    redirect('/signin')
  }

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/signin')
  }

  return <ProtectedProviders>{children}</ProtectedProviders>
}
