import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { profileApi } from '@/api'
import { Spinner } from '@/components/ui'
import { Globe, Linkedin, Github, MapPin, Mail, Phone, ExternalLink } from 'lucide-react'

export default function PublicPortfolioPage() {
  const { token } = useParams()

  const { data: profile, isLoading, isError } = useQuery({
    queryKey: ['portfolio-public', token],
    queryFn: () => profileApi.getPublic(token).then(r => r.data.data),
    retry: false,
  })

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <Spinner size="lg" />
      </div>
    )
  }

  if (isError || !profile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-950 text-center px-4">
        <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
          <Globe className="w-8 h-8 text-gray-400" />
        </div>
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Portfolio not found</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">This portfolio is private or the link is invalid.</p>
      </div>
    )
  }

  const fullName = profile.firstName
    ? `${profile.firstName} ${profile.lastName ?? ''}`.trim()
    : profile.username

  const location = [profile.city, profile.country].filter(Boolean).join(', ')

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Hero */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-3xl mx-auto px-6 py-10">
          <div className="flex items-start gap-6">
            {/* Avatar */}
            {profile.avatarUrl ? (
              <img
                src={profile.avatarUrl}
                alt={fullName}
                className="w-20 h-20 rounded-full object-cover border-4 border-white dark:border-gray-800 shadow-md flex-shrink-0"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-brand-100 dark:bg-brand-900/50 flex items-center justify-center text-brand-700 dark:text-brand-300 text-2xl font-bold flex-shrink-0">
                {(profile.firstName?.[0] ?? profile.username?.[0] ?? '?').toUpperCase()}
              </div>
            )}

            {/* Info */}
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{fullName}</h1>
              {profile.headline && (
                <p className="text-base text-brand-600 dark:text-brand-400 font-medium mt-0.5">{profile.headline}</p>
              )}
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                {location && (
                  <span className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                    <MapPin className="w-3.5 h-3.5" />{location}
                  </span>
                )}
                {profile.email && (
                  <a href={`mailto:${profile.email}`} className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-brand-600 dark:hover:text-brand-400">
                    <Mail className="w-3.5 h-3.5" />{profile.email}
                  </a>
                )}
                {profile.website && (
                  <a href={profile.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-brand-600 dark:hover:text-brand-400">
                    <Globe className="w-3.5 h-3.5" />Website
                  </a>
                )}
                {profile.linkedIn && (
                  <a href={profile.linkedIn} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-brand-600 dark:hover:text-brand-400">
                    <Linkedin className="w-3.5 h-3.5" />LinkedIn
                  </a>
                )}
                {profile.gitHub && (
                  <a href={profile.gitHub} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-brand-600 dark:hover:text-brand-400">
                    <Github className="w-3.5 h-3.5" />GitHub
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Summary */}
          {profile.summary && (
            <p className="mt-6 text-sm text-gray-600 dark:text-gray-400 leading-relaxed whitespace-pre-line">
              {profile.summary}
            </p>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="max-w-3xl mx-auto px-6 py-8 space-y-8">
        {/* Experience */}
        {profile.workExperiences?.length > 0 && (
          <Section title="Experience">
            {[...profile.workExperiences].sort((a, b) => a.sortOrder - b.sortOrder).map(exp => (
              <TimelineItem
                key={exp.id}
                title={exp.position}
                subtitle={exp.company}
                location={exp.location}
                startDate={exp.startDate}
                endDate={exp.endDate}
                isCurrent={exp.isCurrentJob}
                description={exp.description}
              />
            ))}
          </Section>
        )}

        {/* Education */}
        {profile.educations?.length > 0 && (
          <Section title="Education">
            {[...profile.educations].sort((a, b) => a.sortOrder - b.sortOrder).map(edu => (
              <TimelineItem
                key={edu.id}
                title={`${edu.degree}${edu.fieldOfStudy ? ` · ${edu.fieldOfStudy}` : ''}`}
                subtitle={edu.institution}
                startDate={edu.startDate}
                endDate={edu.endDate}
                isCurrent={edu.isCurrentlyStudying}
                description={edu.description}
                extra={edu.grade ? `Grade: ${edu.grade}` : null}
              />
            ))}
          </Section>
        )}

        {/* Skills */}
        {profile.skills?.length > 0 && (
          <Section title="Skills">
            <div className="flex flex-wrap gap-2">
              {[...profile.skills].sort((a, b) => a.sortOrder - b.sortOrder).map(skill => (
                <span
                  key={skill.id}
                  className="px-3 py-1 rounded-full text-sm font-medium bg-brand-50 dark:bg-brand-950/50 text-brand-700 dark:text-brand-300 border border-brand-100 dark:border-brand-900"
                >
                  {skill.name}
                </span>
              ))}
            </div>
          </Section>
        )}

        {/* Certificates */}
        {profile.certificates?.length > 0 && (
          <Section title="Certificates">
            {[...profile.certificates].sort((a, b) => a.sortOrder - b.sortOrder).map(cert => (
              <div key={cert.id} className="flex items-start justify-between gap-4 py-3 border-b border-gray-100 dark:border-gray-800 last:border-0">
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{cert.name}</p>
                  {cert.issuingOrganization && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{cert.issuingOrganization}</p>
                  )}
                  {cert.issueDate && (
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                      Issued {formatDate(cert.issueDate)}
                      {cert.expiryDate ? ` · Expires ${formatDate(cert.expiryDate)}` : ''}
                    </p>
                  )}
                </div>
                {cert.credentialUrl && (
                  <a
                    href={cert.credentialUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-brand-600 dark:text-brand-400 hover:underline flex-shrink-0"
                  >
                    <ExternalLink className="w-3 h-3" /> View
                  </a>
                )}
              </div>
            ))}
          </Section>
        )}

        {/* Languages */}
        {profile.languages?.length > 0 && (
          <Section title="Languages">
            <div className="flex flex-wrap gap-2">
              {[...profile.languages].sort((a, b) => a.sortOrder - b.sortOrder).map(lang => (
                <span
                  key={lang.id}
                  className="px-3 py-1 rounded-full text-sm bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                >
                  {lang.name}
                  {lang.proficiency ? ` · ${PROFICIENCY_LABELS[lang.proficiency] ?? lang.proficiency}` : ''}
                </span>
              ))}
            </div>
          </Section>
        )}

        <p className="text-center text-xs text-gray-300 dark:text-gray-600 pt-4">
          Built with EnterpriseApp
        </p>
      </div>
    </div>
  )
}

const PROFICIENCY_LABELS = { 1: 'Basic', 2: 'Conversational', 3: 'Proficient', 4: 'Fluent', 5: 'Native' }

function formatDate(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

function Section({ title, children }) {
  return (
    <div>
      <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-4 pb-2 border-b border-gray-200 dark:border-gray-800">
        {title}
      </h2>
      <div className="space-y-4">{children}</div>
    </div>
  )
}

function TimelineItem({ title, subtitle, location, startDate, endDate, isCurrent, description, extra }) {
  const dateRange = [
    startDate ? formatDate(startDate) : null,
    isCurrent ? 'Present' : endDate ? formatDate(endDate) : null,
  ].filter(Boolean).join(' – ')

  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center pt-1">
        <div className="w-2 h-2 rounded-full bg-brand-500 flex-shrink-0 mt-0.5" />
        <div className="w-px flex-1 bg-gray-200 dark:bg-gray-800 mt-1" />
      </div>
      <div className="pb-5 min-w-0 flex-1">
        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</p>
        <div className="flex flex-wrap gap-x-3 mt-0.5">
          {subtitle && <span className="text-sm text-gray-600 dark:text-gray-400">{subtitle}</span>}
          {location && <span className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-0.5"><MapPin className="w-3 h-3" />{location}</span>}
        </div>
        {dateRange && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{dateRange}</p>}
        {extra && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{extra}</p>}
        {description && <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 whitespace-pre-line leading-relaxed">{description}</p>}
      </div>
    </div>
  )
}
