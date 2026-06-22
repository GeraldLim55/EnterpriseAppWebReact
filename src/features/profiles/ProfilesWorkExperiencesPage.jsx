import { PageHeader } from '@/components/layout'
import { Card, Empty } from '@/components/ui'
import { Briefcase } from 'lucide-react'

export default function ProfilesWorkExperiencesPage() {
  return (
    <div>
      <PageHeader
        title="Work Experiences"
        description="Work experience records across all user profiles."
        breadcrumbs={[{ label: 'Profiles' }, { label: 'Work Experiences' }]}
      />
      <Card>
        <Empty icon={<Briefcase className="w-8 h-8" />} title="Coming soon" description="Admin view of all work experience records will appear here." />
      </Card>
    </div>
  )
}
