import { useState, useRef, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Trash2, Download, Eye, Camera, Lock } from 'lucide-react'
import { profileApi, resumeApi, authApi, accountApi } from '@/api'
import { PageHeader } from '@/components/layout'
import { Button, Input, Textarea, Select, Card, CardHeader, Spinner, Empty, Modal } from '@/components/ui'
import { getInitials, downloadBlob, formatDate } from '@/lib/utils'
import { useAuth } from '@/context/AuthContext'
import { MODULES } from '@/types'
import toast from 'react-hot-toast'

// ─── Tabs ─────────────────────────────────────────────────────────────────
const PROFILE_TABS = ['Overview', 'Experience', 'Education', 'Skills', 'Resume']
const ALL_TABS = [...PROFILE_TABS, 'Security']

const TEMPLATE_LABELS = { 1: 'Classic', 2: 'Modern', 3: 'Creative' }

export default function AccountPage() {
  const { session, hasModule } = useAuth()
  const hasProfileModule = hasModule(MODULES.Profile)
  const tabs = hasProfileModule ? ALL_TABS : ['Security']
  const qc = useQueryClient()
  const [activeTab, setActiveTab] = useState(hasProfileModule ? 'Overview' : 'Security')
  const [selectedTemplate, setSelectedTemplate] = useState(1)
  const [previewHtml, setPreviewHtml] = useState(null)
  const [previewing, setPreviewing] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const fileRef = useRef(null)

  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile-me'],
    queryFn: () => profileApi.getMe().then(r => r.data.data),
  })

  const avatarMutation = useMutation({
    mutationFn: (file) => profileApi.uploadAvatar(file),
    onSuccess: () => {
      toast.success('Avatar updated')
      qc.invalidateQueries({ queryKey: ['profile-me'] })
    },
    onError: () => toast.error('Upload failed (max 5 MB, JPG/PNG/WebP)'),
  })

  const handlePreview = async () => {
    setPreviewing(true)
    try {
      const res = await resumeApi.getPreview(selectedTemplate)
      setPreviewHtml(res.data)
    } catch { toast.error('Failed to load preview') } finally { setPreviewing(false) }
  }

  const handleDownloadPdf = async () => {
    setDownloading(true)
    try {
      const res = await resumeApi.downloadPdf(selectedTemplate)
      downloadBlob(res.data, `resume-${TEMPLATE_LABELS[selectedTemplate].toLowerCase()}.pdf`)
      toast.success('PDF downloaded')
    } catch { toast.error('PDF generation failed') } finally { setDownloading(false) }
  }

  const handleDownloadDocx = async () => {
    setDownloading(true)
    try {
      const res = await resumeApi.downloadDocx(selectedTemplate)
      downloadBlob(res.data, `resume-${TEMPLATE_LABELS[selectedTemplate].toLowerCase()}.docx`)
      toast.success('DOCX downloaded')
    } catch { toast.error('DOCX generation failed') } finally { setDownloading(false) }
  }

  if (isLoading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>

  return (
    <div>
      <PageHeader title="Account" description="Manage your account and resume." breadcrumbs={[{ label: 'Account' }]} />

      {/* Profile header card — only shown when profile module is active */}
      {hasProfileModule && <Card className="mb-6">
        <div className="flex items-center gap-5">
          <div className="relative group">
            {profile?.avatarUrl ? (
              <img src={profile.avatarUrl} alt="Avatar" className="w-16 h-16 rounded-full object-cover border-2 border-white shadow-sm" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 text-xl font-semibold">
                {getInitials(profile?.firstName, profile?.lastName, profile?.username)}
              </div>
            )}
            <button
              onClick={() => fileRef.current?.click()}
              className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
            >
              <Camera className="w-5 h-5 text-white" />
            </button>
            <input ref={fileRef} type="file" accept=".jpg,.jpeg,.png,.webp" className="hidden"
              onChange={e => {
                const f = e.target.files?.[0]
                if (!f) return
                if (f.size > 5 * 1024 * 1024) {
                  toast.error('File too large (max 5 MB)')
                  e.target.value = ''
                  return
                }
                avatarMutation.mutate(f)
              }} />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {profile?.firstName ? `${profile.firstName} ${profile.lastName ?? ''}`.trim() : profile?.username}
            </h2>
            {profile?.headline && <p className="text-sm text-gray-500 mt-0.5">{profile.headline}</p>}
            <p className="text-xs text-gray-400 mt-1">{session?.roleName} · {profile?.email}</p>
          </div>
        </div>
      </Card>}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 mb-6">
        {tabs.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === tab
                ? 'text-brand-700 border-brand-600'
                : 'text-gray-500 border-transparent hover:text-gray-700'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'Overview' && <ProfileOverviewForm profile={profile} onSuccess={() => qc.invalidateQueries({ queryKey: ['profile-me'] })} />}
      {activeTab === 'Experience' && <ExperienceForm profile={profile} onSuccess={() => qc.invalidateQueries({ queryKey: ['profile-me'] })} />}
      {activeTab === 'Education' && <EducationForm profile={profile} onSuccess={() => qc.invalidateQueries({ queryKey: ['profile-me'] })} />}
      {activeTab === 'Skills' && <SkillsLanguagesForm profile={profile} onSuccess={() => qc.invalidateQueries({ queryKey: ['profile-me'] })} />}
      {activeTab === 'Security' && (
        <div className="flex flex-col gap-6">
          <AccountInfoForm session={session} />
          <ChangePasswordForm />
        </div>
      )}
      {activeTab === 'Resume' && (
        <div className="flex flex-col gap-5">
          {/* Template selector */}
          <Card>
            <CardHeader title="Resume templates" description="Choose a template for your resume." />
            <div className="grid grid-cols-3 gap-4">
              {[1, 2, 3].map(t => (
                <button
                  key={t}
                  onClick={() => setSelectedTemplate(t)}
                  className={`rounded-xl border-2 p-4 text-center transition-all ${
                    selectedTemplate === t ? 'border-brand-500 bg-brand-50' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className={`w-full h-20 rounded-lg mb-3 ${
                    t === 1 ? 'bg-gradient-to-b from-gray-100 to-gray-200' :
                    t === 2 ? 'bg-gradient-to-r from-blue-600 to-blue-700' :
                    'bg-gradient-to-br from-purple-500 to-indigo-600'
                  }`} />
                  <p className="text-sm font-semibold text-gray-900">{TEMPLATE_LABELS[t]}</p>
                </button>
              ))}
            </div>
          </Card>

          {/* Actions */}
          <Card>
            <CardHeader title="Download resume" />
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" leftIcon={<Eye className="w-4 h-4" />} loading={previewing} onClick={handlePreview}>
                Preview
              </Button>
              <Button leftIcon={<Download className="w-4 h-4" />} loading={downloading} onClick={handleDownloadPdf}>
                Download PDF
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Preview Modal */}
      <Modal
        open={previewHtml !== null}
        onClose={() => setPreviewHtml(null)}
        title="Resume preview"
        size="xl"
        footer={<Button variant="outline" onClick={() => setPreviewHtml(null)}>Close</Button>}
      >
        <iframe
          srcDoc={previewHtml ?? ''}
          className="w-full border-0 rounded-lg"
          style={{ height: '70vh' }}
          title="Resume Preview"
        />
      </Modal>
    </div>
  )
}

// ─── Country Codes ────────────────────────────────────────────────────────
const COUNTRY_CODES = [
  { code: '+93',  label: 'Afghanistan (+93)' },
  { code: '+971', label: 'United Arab Emirates (+971)' },
  { code: '+54',  label: 'Argentina (+54)' },
  { code: '+61',  label: 'Australia (+61)' },
  { code: '+43',  label: 'Austria (+43)' },
  { code: '+994', label: 'Azerbaijan (+994)' },
  { code: '+973', label: 'Bahrain (+973)' },
  { code: '+880', label: 'Bangladesh (+880)' },
  { code: '+32',  label: 'Belgium (+32)' },
  { code: '+55',  label: 'Brazil (+55)' },
  { code: '+1',   label: 'Canada / United States (+1)' },
  { code: '+56',  label: 'Chile (+56)' },
  { code: '+86',  label: 'China (+86)' },
  { code: '+57',  label: 'Colombia (+57)' },
  { code: '+45',  label: 'Denmark (+45)' },
  { code: '+213', label: 'Algeria (+213)' },
  { code: '+20',  label: 'Egypt (+20)' },
  { code: '+34',  label: 'Spain (+34)' },
  { code: '+33',  label: 'France (+33)' },
  { code: '+44',  label: 'United Kingdom (+44)' },
  { code: '+995', label: 'Georgia (+995)' },
  { code: '+30',  label: 'Greece (+30)' },
  { code: '+36',  label: 'Hungary (+36)' },
  { code: '+62',  label: 'Indonesia (+62)' },
  { code: '+91',  label: 'India (+91)' },
  { code: '+98',  label: 'Iran (+98)' },
  { code: '+39',  label: 'Italy (+39)' },
  { code: '+972', label: 'Israel (+972)' },
  { code: '+81',  label: 'Japan (+81)' },
  { code: '+254', label: 'Kenya (+254)' },
  { code: '+996', label: 'Kyrgyzstan (+996)' },
  { code: '+82',  label: 'South Korea (+82)' },
  { code: '+94',  label: 'Sri Lanka (+94)' },
  { code: '+218', label: 'Libya (+218)' },
  { code: '+212', label: 'Morocco (+212)' },
  { code: '+52',  label: 'Mexico (+52)' },
  { code: '+95',  label: 'Myanmar (+95)' },
  { code: '+60',  label: 'Malaysia (+60)' },
  { code: '+234', label: 'Nigeria (+234)' },
  { code: '+31',  label: 'Netherlands (+31)' },
  { code: '+47',  label: 'Norway (+47)' },
  { code: '+64',  label: 'New Zealand (+64)' },
  { code: '+51',  label: 'Peru (+51)' },
  { code: '+63',  label: 'Philippines (+63)' },
  { code: '+92',  label: 'Pakistan (+92)' },
  { code: '+48',  label: 'Poland (+48)' },
  { code: '+974', label: 'Qatar (+974)' },
  { code: '+40',  label: 'Romania (+40)' },
  { code: '+7',   label: 'Russia (+7)' },
  { code: '+966', label: 'Saudi Arabia (+966)' },
  { code: '+46',  label: 'Sweden (+46)' },
  { code: '+65',  label: 'Singapore (+65)' },
  { code: '+41',  label: 'Switzerland (+41)' },
  { code: '+992', label: 'Tajikistan (+992)' },
  { code: '+66',  label: 'Thailand (+66)' },
  { code: '+216', label: 'Tunisia (+216)' },
  { code: '+90',  label: 'Turkey (+90)' },
  { code: '+255', label: 'Tanzania (+255)' },
  { code: '+256', label: 'Uganda (+256)' },
  { code: '+998', label: 'Uzbekistan (+998)' },
  { code: '+58',  label: 'Venezuela (+58)' },
  { code: '+84',  label: 'Vietnam (+84)' },
  { code: '+27',  label: 'South Africa (+27)' },
]

/** Split a full phone string like "+60101209391" into { dialCode, local } */
function splitPhone(full) {
  if (!full) return { dialCode: '+60', local: '' }
  const match = COUNTRY_CODES
    .slice()
    .sort((a, b) => b.code.length - a.code.length) // match longest prefix first
    .find(c => full.startsWith(c.code))
  if (match) return { dialCode: match.code, local: full.slice(match.code.length) }
  return { dialCode: '+60', local: full }
}

// ─── Account Info Form ────────────────────────────────────────────────────
const accountInfoSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  email: z.string().email('Invalid email'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  dialCode: z.string(),
  localPhone: z.string().optional(),
})

function AccountInfoForm({ session }) {
  const { dialCode: initDial, local: initLocal } = useMemo(
    () => splitPhone(session?.phoneNumber ?? ''),
    [session?.phoneNumber],
  )

  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(accountInfoSchema),
    defaultValues: {
      username: session?.username ?? '',
      email: session?.email ?? '',
      firstName: session?.firstName ?? '',
      lastName: session?.lastName ?? '',
      dialCode: initDial,
      localPhone: initLocal,
    },
  })

  const dialCode = watch('dialCode')

  const onSubmit = async (data) => {
    const phoneNumber = data.localPhone ? `${data.dialCode.replace('+', '')}${data.localPhone}` : null
    try {
      await accountApi.update({
        username: data.username,
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        phoneNumber,
      })
      toast.success('Account updated')
    } catch (err) {
      toast.error(err?.response?.data?.message ?? 'Failed to update account')
    }
  }

  return (
    <Card>
      <CardHeader
        title="Account information"
        description="Update your username, email, and personal details."
      />
      <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg">
        <Input
          label="Username"
          error={errors.username?.message}
          {...register('username')}
        />
        <Input
          label="Email"
          type="email"
          error={errors.email?.message}
          {...register('email')}
        />
        <Input
          label="First name"
          error={errors.firstName?.message}
          {...register('firstName')}
        />
        <Input
          label="Last name"
          error={errors.lastName?.message}
          {...register('lastName')}
        />
        {/* Phone number with country code */}
        <div className="sm:col-span-2">
          <label className="text-sm font-medium text-gray-700 block mb-1.5">Phone number</label>
          <div className="flex gap-2">
            <select
              className="h-9 rounded-lg border border-gray-300 bg-white px-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 flex-1"
              {...register('dialCode')}
            >
              {COUNTRY_CODES.map(c => (
                <option key={c.code} value={c.code}>{c.label}</option>
              ))}
            </select>
            <input
              type="tel"
              placeholder="101209391"
              className="flex-1 h-9 rounded-lg border border-gray-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              {...register('localPhone')}
            />
          </div>
          {dialCode && watch('localPhone') && (
            <p className="text-xs text-gray-400 mt-1">Will be saved as: {dialCode.replace('+', '')}{watch('localPhone')}</p>
          )}
        </div>
        <div className="sm:col-span-2">
          <Button type="submit" loading={isSubmitting}>Save changes</Button>
        </div>
      </form>
    </Card>
  )
}

// ─── Change Password Form ─────────────────────────────────────────────────
const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'At least 8 characters'),
  confirmPassword: z.string(),
}).refine(d => d.newPassword === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

function ChangePasswordForm() {
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(changePasswordSchema),
  })

  const onSubmit = async (data) => {
    try {
      await authApi.changePassword({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
        confirmPassword: data.confirmPassword,
      })
      toast.success('Password changed successfully')
      reset()
    } catch (err) {
      const body = err?.response?.data
      const msg = body?.message ?? 'Failed to change password'
      const errors = body?.errors

      if (errors && typeof errors === 'object') {
        const lines = Array.isArray(errors)
          ? errors
          : Object.values(errors).flat()
        toast.error(
          <div>
            <p className="font-medium">{msg}</p>
            <ul className="mt-1 list-disc list-inside text-sm">
              {lines.map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          </div>,
          { duration: 6000 },
        )
      } else {
        toast.error(msg)
      }
    }
  }

  return (
    <Card>
      <CardHeader
        title="Change password"
        description="Choose a strong password to keep your account secure."
      />
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4 max-w-sm">
        <Input
          label="Current password"
          type={showCurrent ? 'text' : 'password'}
          placeholder="••••••••"
          error={errors.currentPassword?.message}
          rightIcon={
            <button type="button" onClick={() => setShowCurrent(p => !p)} className="text-gray-400 hover:text-gray-600">
              {showCurrent ? <Eye className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
            </button>
          }
          {...register('currentPassword')}
        />
        <Input
          label="New password"
          type={showNew ? 'text' : 'password'}
          placeholder="••••••••"
          error={errors.newPassword?.message}
          rightIcon={
            <button type="button" onClick={() => setShowNew(p => !p)} className="text-gray-400 hover:text-gray-600">
              {showNew ? <Eye className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
            </button>
          }
          {...register('newPassword')}
        />
        <Input
          label="Confirm new password"
          type={showConfirm ? 'text' : 'password'}
          placeholder="••••••••"
          error={errors.confirmPassword?.message}
          rightIcon={
            <button type="button" onClick={() => setShowConfirm(p => !p)} className="text-gray-400 hover:text-gray-600">
              {showConfirm ? <Eye className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
            </button>
          }
          {...register('confirmPassword')}
        />
        <Button type="submit" loading={isSubmitting} className="self-start">
          Change password
        </Button>
      </form>
    </Card>
  )
}

// ─── Overview Form ────────────────────────────────────────────────────────
const overviewSchema = z.object({
  headline: z.string().max(200).optional(),
  summary: z.string().max(5000).optional(),
  phone: z.string().max(50).optional(),
  address: z.string().max(500).optional(),
  city: z.string().max(100).optional(),
  country: z.string().max(100).optional(),
  website: z.string().url().optional().or(z.literal('')),
  linkedIn: z.string().max(500).optional(),
  gitHub: z.string().max(500).optional(),
  preferredTemplate: z.coerce.number().default(1),
})

function ProfileOverviewForm({ profile, onSuccess }) {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(overviewSchema),
    defaultValues: profile ? {
      headline: profile.headline, summary: profile.summary, phone: profile.phone,
      address: profile.address, city: profile.city, country: profile.country,
      website: profile.website, linkedIn: profile.linkedIn, gitHub: profile.gitHub,
      preferredTemplate: profile.preferredTemplate,
    } : {},
  })

  const onSubmit = async (data) => {
    try {
      await profileApi.update({ ...data })
      toast.success('Profile updated')
      onSuccess()
    } catch { toast.error('Failed to save') }
  }

  return (
    <Card>
      <CardHeader title="Personal information" />
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <div className="sm:col-span-2">
            <Input label="Headline" placeholder="e.g. Senior Software Engineer" {...register('headline')} />
          </div>
          <div className="sm:col-span-2">
            <Textarea label="Summary" rows={4} placeholder="Brief professional summary…" {...register('summary')} />
          </div>
          <Input label="Phone" {...register('phone')} />
          <Input label="City" {...register('city')} />
          <Input label="Country" {...register('country')} />
          <Input label="Website" type="url" placeholder="https://" error={errors.website?.message} {...register('website')} />
          <Input label="LinkedIn" placeholder="https://linkedin.com/in/…" {...register('linkedIn')} />
          <Input label="GitHub" placeholder="https://github.com/…" {...register('gitHub')} />
        </div>
        <Button type="submit" loading={isSubmitting}>Save changes</Button>
      </form>
    </Card>
  )
}

// ─── Experience Form ──────────────────────────────────────────────────────
function ExperienceForm({ profile, onSuccess }) {
  const toDateInput = (val) => val ? val.slice(0, 10) : ''
  const { register, control, handleSubmit, formState: { isSubmitting } } = useForm({
    defaultValues: {
      workExperiences: (profile?.workExperiences ?? []).map(w => ({
        ...w,
        startDate: toDateInput(w.startDate),
        endDate: toDateInput(w.endDate),
      })),
    },
  })
  const { fields, append, remove } = useFieldArray({ control, name: 'workExperiences' })

  const onSubmit = async (data) => {
    try {
      await profileApi.update({ ...profile, workExperiences: data.workExperiences, preferredTemplate: profile?.preferredTemplate ?? 1 })
      toast.success('Experience saved')
      onSuccess()
    } catch { toast.error('Failed to save') }
  }

  return (
    <Card>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-base font-semibold text-gray-900">Work experience</h2>
        <Button type="button" size="sm" variant="outline" leftIcon={<Plus className="w-3.5 h-3.5" />}
          onClick={() => append({ company: '', position: '', location: '', startDate: '', endDate: '', isCurrentJob: false, description: '', sortOrder: fields.length })}>
          Add position
        </Button>
      </div>
      <form onSubmit={handleSubmit(onSubmit)}>
        {fields.length === 0
          ? <Empty title="No work experience yet" description="Add your first position to get started." />
          : fields.map((field, i) => (
            <div key={field.id} className="border border-gray-200 rounded-xl p-4 mb-4">
              <div className="flex justify-between items-start mb-3">
                <h3 className="text-sm font-semibold text-gray-700">Position {i + 1}</h3>
                <button type="button" onClick={() => remove(i)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input label="Company" required {...register(`workExperiences.${i}.company`)} />
                <Input label="Position" required {...register(`workExperiences.${i}.position`)} />
                <Input label="Location" {...register(`workExperiences.${i}.location`)} />
                <Input label="Start date" type="date" {...register(`workExperiences.${i}.startDate`)} />
                <Input label="End date" type="date" {...register(`workExperiences.${i}.endDate`)} />
                <div className="sm:col-span-2">
                  <Textarea label="Description" rows={3} {...register(`workExperiences.${i}.description`)} />
                </div>
              </div>
            </div>
          ))
        }
        {fields.length > 0 && <Button type="submit" loading={isSubmitting}>Save experience</Button>}
      </form>
    </Card>
  )
}

// ─── Education Form ───────────────────────────────────────────────────────
function EducationForm({ profile, onSuccess }) {
  const toDateInput = (val) => val ? val.slice(0, 10) : ''
  const { register, control, handleSubmit, formState: { isSubmitting } } = useForm({
    defaultValues: {
      educations: (profile?.educations ?? []).map(e => ({
        ...e,
        startDate: toDateInput(e.startDate),
        endDate: toDateInput(e.endDate),
      })),
    },
  })
  const { fields, append, remove } = useFieldArray({ control, name: 'educations' })

  const onSubmit = async (data) => {
    try {
      await profileApi.update({ ...profile, educations: data.educations, preferredTemplate: profile?.preferredTemplate ?? 1 })
      toast.success('Education saved')
      onSuccess()
    } catch { toast.error('Failed to save') }
  }

  return (
    <Card>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-base font-semibold text-gray-900">Education</h2>
        <Button type="button" size="sm" variant="outline" leftIcon={<Plus className="w-3.5 h-3.5" />}
          onClick={() => append({ institution: '', degree: '', fieldOfStudy: '', startDate: '', endDate: '', isCurrentlyStudying: false, description: '', grade: '', sortOrder: fields.length })}>
          Add education
        </Button>
      </div>
      <form onSubmit={handleSubmit(onSubmit)}>
        {fields.length === 0
          ? <Empty title="No education added yet" />
          : fields.map((field, i) => (
            <div key={field.id} className="border border-gray-200 rounded-xl p-4 mb-4">
              <div className="flex justify-between items-start mb-3">
                <h3 className="text-sm font-semibold text-gray-700">Education {i + 1}</h3>
                <button type="button" onClick={() => remove(i)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input label="Institution" required {...register(`educations.${i}.institution`)} />
                <Input label="Degree" required {...register(`educations.${i}.degree`)} />
                <Input label="Field of study" {...register(`educations.${i}.fieldOfStudy`)} />
                <Input label="Grade" {...register(`educations.${i}.grade`)} />
                <Input label="Start date" type="date" {...register(`educations.${i}.startDate`)} />
                <Input label="End date" type="date" {...register(`educations.${i}.endDate`)} />
              </div>
            </div>
          ))
        }
        {fields.length > 0 && <Button type="submit" loading={isSubmitting}>Save education</Button>}
      </form>
    </Card>
  )
}

// ─── Skills & Languages Form ──────────────────────────────────────────────
const SKILL_LEVELS = ['Basic', 'Intermediate', 'Advanced', 'Expert']
const LANG_PROFICIENCIES = ['Basic', 'Fluent', 'Advanced']

function SkillsLanguagesForm({ profile, onSuccess }) {
  const { register, control, handleSubmit, formState: { isSubmitting } } = useForm({
    defaultValues: {
      skills: (profile?.skills ?? []).map(s => ({ ...s, level: SKILL_LEVELS[s.level - 1] ?? 'Beginner' })),
      languages: (profile?.languages ?? []).map(l => ({ ...l, proficiency: LANG_PROFICIENCIES[l.proficiency - 1] ?? 'Beginner' })),
    },
  })
  const skills = useFieldArray({ control, name: 'skills' })
  const langs = useFieldArray({ control, name: 'languages' })

  const onSubmit = async (data) => {
    try {
      const mappedSkills = data.skills.map(s => ({ ...s, level: SKILL_LEVELS.indexOf(s.level) + 1 }))
      const mappedLangs = data.languages.map(l => ({ ...l, proficiency: LANG_PROFICIENCIES.indexOf(l.proficiency) + 1 }))
      await profileApi.update({ ...profile, skills: mappedSkills, languages: mappedLangs, preferredTemplate: profile?.preferredTemplate ?? 1 })
      toast.success('Skills saved')
      onSuccess()
    } catch { toast.error('Failed to save') }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-900">Skills</h2>
          <Button type="button" size="sm" variant="outline" leftIcon={<Plus className="w-3.5 h-3.5" />}
            onClick={() => skills.append({ name: '', level: 'Basic', category: '', sortOrder: skills.fields.length })}>
            Add skill
          </Button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {skills.fields.map((f, i) => (
            <div key={f.id} className="flex items-end gap-2">
              <Input label="Skill" placeholder="e.g. React" className="flex-1" {...register(`skills.${i}.name`)} />
              <Select label="Level" options={SKILL_LEVELS.map(v=>({value:v,label:v}))} className="w-36" {...register(`skills.${i}.level`)} />
              <button type="button" onClick={() => skills.remove(i)} className="mb-0.5 p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-900">Languages</h2>
          <Button type="button" size="sm" variant="outline" leftIcon={<Plus className="w-3.5 h-3.5" />}
            onClick={() => langs.append({ name: '', proficiency: 'Intermediate', sortOrder: langs.fields.length })}>
            Add language
          </Button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {langs.fields.map((f, i) => (
            <div key={f.id} className="flex items-end gap-2">
              <Input label="Language" className="flex-1" {...register(`languages.${i}.name`)} />
              <Select label="Proficiency" options={LANG_PROFICIENCIES.map(v=>({value:v,label:v}))} className="w-40" {...register(`languages.${i}.proficiency`)} />
              <button type="button" onClick={() => langs.remove(i)} className="mb-0.5 p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </Card>

      <Button type="submit" loading={isSubmitting} className="self-start">Save skills & languages</Button>
    </form>
  )
}
