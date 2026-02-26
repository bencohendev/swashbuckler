import { TemplateEditor } from '@/features/templates/components/TemplateEditor'

interface TemplatePageProps {
  params: Promise<{ id: string }>
}

export default async function TemplatePage({ params }: TemplatePageProps) {
  const { id } = await params

  return <TemplateEditor id={id} />
}
