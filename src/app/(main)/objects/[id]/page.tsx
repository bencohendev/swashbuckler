import { ObjectEditor } from '@/features/objects/components/ObjectEditor'

interface ObjectPageProps {
  params: Promise<{ id: string }>
}

export default async function ObjectPage({ params }: ObjectPageProps) {
  const { id } = await params

  return <ObjectEditor id={id} />
}
