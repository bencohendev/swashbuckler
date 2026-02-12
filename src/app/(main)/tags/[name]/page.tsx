import { TagPageView } from '@/features/tags/components/TagPageView'

interface TagPageProps {
  params: Promise<{ name: string }>
}

export default async function TagPage({ params }: TagPageProps) {
  const { name } = await params

  return <TagPageView name={decodeURIComponent(name)} />
}
