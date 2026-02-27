import { type Metadata } from 'next'
import { createClient } from '@/shared/lib/supabase/server'
import { TemplateEditor } from '@/features/templates/components/TemplateEditor'

interface TemplatePageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: TemplatePageProps): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { title: 'Swashbuckler' }

  const { data } = await supabase
    .from('templates')
    .select('name')
    .eq('id', id)
    .single()
  return { title: data?.name ? `${data.name} — Swashbuckler` : 'Swashbuckler' }
}

export default async function TemplatePage({ params }: TemplatePageProps) {
  const { id } = await params

  return <TemplateEditor id={id} />
}
