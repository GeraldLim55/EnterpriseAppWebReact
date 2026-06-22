import { PageHeader } from '@/components/layout'
import { Card, Empty } from '@/components/ui'
import { GraduationCap } from 'lucide-react'

export default function ProfilesEducationsPage() {
  return (
    <div>
      <PageHeader
        title="Educations"
        description="Education records across all user profiles."
        breadcrumbs={[{ label: 'Profiles' }, { label: 'Educations' }]}
      />
      <Card>
        <Empty icon={<GraduationCap className="w-8 h-8" />} title="Coming soon" description="Admin view of all education records will appear here." />
      </Card>
    </div>
  )
}
