import { TypeTableView } from '@/features/table-view/components'

interface TypePageProps {
  params: Promise<{ slug: string }>
}

export default async function TypePage({ params }: TypePageProps) {
  const { slug } = await params

  return <TypeTableView slug={slug} />
}
