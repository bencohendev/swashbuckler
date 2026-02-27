import { type Metadata } from 'next'
import { createClient } from '@/shared/lib/supabase/server'
import { TypeTableView } from '@/features/table-view/components'

interface TypePageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: TypePageProps): Promise<Metadata> {
  const { slug } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { title: 'Swashbuckler' }

  const { data } = await supabase
    .from('object_types')
    .select('name')
    .eq('slug', slug)
    .limit(1)
    .single()
  return { title: data?.name ? `${data.name} — Swashbuckler` : 'Swashbuckler' }
}

export default async function TypePage({ params }: TypePageProps) {
  const { slug } = await params

  return <TypeTableView slug={slug} />
}
