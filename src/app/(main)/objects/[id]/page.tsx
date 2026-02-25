import { ObjectEditor } from '@/features/objects/components/ObjectEditor'

interface ObjectPageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function ObjectPage({ params, searchParams }: ObjectPageProps) {
  const { id } = await params
  const query = await searchParams
  const isNew = query.new === '1'

  return <ObjectEditor id={id} autoFocus={isNew} />
}
