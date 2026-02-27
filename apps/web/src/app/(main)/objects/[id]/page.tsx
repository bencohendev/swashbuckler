import { type Metadata } from 'next'
import { QueryClient, dehydrate, HydrationBoundary } from '@tanstack/react-query'
import { createClient } from '@/shared/lib/supabase/server'
import { queryKeys } from '@/shared/lib/data/queryKeys'
import { ObjectEditor } from '@/features/objects/components/ObjectEditor'

interface ObjectPageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

async function fetchObject(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('objects')
    .select('*')
    .eq('id', id)
    .single()
  return data
}

export async function generateMetadata({ params }: ObjectPageProps): Promise<Metadata> {
  const { id } = await params
  const object = await fetchObject(id)
  return { title: object?.title ? `${object.title} — Swashbuckler` : 'Swashbuckler' }
}

export default async function ObjectPage({ params, searchParams }: ObjectPageProps) {
  const { id } = await params
  const query = await searchParams
  const isNew = query.new === '1'

  const queryClient = new QueryClient()
  const object = await fetchObject(id)
  if (object) {
    queryClient.setQueryData(queryKeys.objects.detail(id), object)
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ObjectEditor id={id} autoFocus={isNew} />
    </HydrationBoundary>
  )
}
