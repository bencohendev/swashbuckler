import { type Metadata } from 'next'
import { TagPageView } from '@/features/tags/components/TagPageView'

interface TagPageProps {
  params: Promise<{ name: string }>
}

export async function generateMetadata({ params }: TagPageProps): Promise<Metadata> {
  const { name } = await params
  const decoded = decodeURIComponent(name)
  return { title: `${decoded} — Swashbuckler` }
}

export default async function TagPage({ params }: TagPageProps) {
  const { name } = await params

  return <TagPageView name={decodeURIComponent(name)} />
}
