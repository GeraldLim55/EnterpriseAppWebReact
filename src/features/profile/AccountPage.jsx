import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, Lock, ShieldCheck, ShieldOff } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'
import { OtpInput } from '@/components/ui/OtpInput'
import { authApi, accountApi } from '@/api'
import { PageHeader } from '@/components/layout'
import { Button, Input, Card, CardHeader } from '@/components/ui'
import { PhoneInput } from '@/components/ui/PhoneInput'
import { useAuth } from '@/context/AuthContext'
import { useTheme } from '@/context/ThemeContext'
import toast from 'react-hot-toast'
import { toastFormErrors } from '@/lib/utils'

export default function AccountPage() {
  const { session } = useAuth()

  return (
    <div>
      <PageHeader title="Account" description="Manage your account credentials and personal details." breadcrumbs={[{ label: 'Account' }]} />
      <div className="flex flex-col gap-6">
        <AccountInfoForm session={session} />
        <AppearanceForm />
        <TwoFactorForm />
        <ChangePasswordForm />
      </div>
    </div>
  )
}

// ─── Appearance / Theme ───────────────────────────────────────────────────
function AppearanceForm() {
  const { theme, setTheme } = useTheme()

  const options = [
    { value: 'light', label: 'Light', icon: '☀️', desc: 'Always use light mode' },
    { value: 'dark', label: 'Dark', icon: '🌙', desc: 'Always use dark mode' },
    { value: 'system', label: 'System', icon: '💻', desc: 'Follow your OS setting' },
  ]

  return (
    <Card>
      <CardHeader title="Appearance" description="Choose how the app looks to you." />
      <div className="flex gap-3 flex-wrap">
        {options.map(opt => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setTheme(opt.value)}
            className={`flex flex-col items-center gap-1.5 px-5 py-4 rounded-xl border-2 text-sm font-medium transition-all ${
              theme === opt.value
                ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/40 text-brand-700 dark:text-brand-400'
                : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
          >
            <span className="text-xl">{opt.icon}</span>
            <span>{opt.label}</span>
            <span className="text-xs font-normal text-gray-500 dark:text-gray-400">{opt.desc}</span>
          </button>
        ))}
      </div>
    </Card>
  )
}

// ─── Account Info Form ────────────────────────────────────────────────────
const accountInfoSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  email: z.string().email('Invalid email'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  phoneCountryCode: z.string().optional(),
  phoneNumber: z.string().optional(),
})

function AccountInfoForm({ session }) {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(accountInfoSchema),
    defaultValues: {
      username: session?.username ?? '',
      email: session?.email ?? '',
      firstName: session?.firstName ?? '',
      lastName: session?.lastName ?? '',
      phoneCountryCode: session?.phoneCountryCode ?? '60',
      phoneNumber: session?.phoneNumber ?? '',
    },
  })

  const onSubmit = async (data) => {
    try {
      await accountApi.update({
        username: data.username,
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        phoneCountryCode: data.phoneCountryCode || null,
        phoneNumber: data.phoneNumber || null,
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
      <form onSubmit={handleSubmit(onSubmit, e => toastFormErrors(e, toast))} className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg">
        <Input label="Username" error={errors.username?.message} {...register('username')} />
        <Input label="Email" type="email" error={errors.email?.message} {...register('email')} />
        <Input label="First name" error={errors.firstName?.message} {...register('firstName')} />
        <Input label="Last name" error={errors.lastName?.message} {...register('lastName')} />
        <PhoneInput countryCodeProps={register('phoneCountryCode')} phoneProps={register('phoneNumber')} />
        <div className="sm:col-span-2">
          <Button type="submit" loading={isSubmitting}>Save changes</Button>
        </div>
      </form>
    </Card>
  )
}

// ─── Two-Factor Authentication ────────────────────────────────────────────
function TwoFactorForm() {
  const { session } = useAuth()
  const [step, setStep] = useState('idle') // idle | setup | enable | disable
  const [setupData, setSetupData] = useState(null) // { qrCodeUri, manualKey }
  const [loading, setLoading] = useState(false)
  const [enabled, setEnabled] = useState(session?.twoFactorEnabled ?? false)
  const [code, setCode] = useState('')
  const canvasRef = useRef(null)

  useEffect(() => {
    if (setupData?.qrCodeUri && canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, setupData.qrCodeUri, { width: 180, margin: 1 })
    }
  }, [setupData])

  const startSetup = async () => {
    setLoading(true)
    try {
      const res = await authApi.setupTwoFactor()
      if (!res.data.success) throw new Error(res.data.message)
      setSetupData(res.data.data)
      setStep('setup')
    } catch (err) {
      toast.error(err?.response?.data?.message ?? 'Failed to start 2FA setup.')
    } finally {
      setLoading(false)
    }
  }

  const confirmEnable = async () => {
    setLoading(true)
    try {
      const res = await authApi.enableTwoFactor({ secret: setupData.manualKey, code })
      if (!res.data.success) throw new Error(res.data.message)
      toast.success('Two-factor authentication enabled.')
      setEnabled(true)
      setStep('idle')
      setCode('')
    } catch (err) {
      toast.error(err?.response?.data?.message ?? 'Invalid code. Try again.')
    } finally {
      setLoading(false)
    }
  }

  const confirmDisable = async () => {
    setLoading(true)
    try {
      const res = await authApi.disableTwoFactor({ code })
      if (!res.data.success) throw new Error(res.data.message)
      toast.success('Two-factor authentication disabled.')
      setEnabled(false)
      setStep('idle')
      setCode('')
    } catch (err) {
      toast.error(err?.response?.data?.message ?? 'Invalid code. Try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader
        title="Two-factor authentication"
        description="Add an extra layer of security to your account using an authenticator app."
      />
      <div className="max-w-sm space-y-4">
        {step === 'idle' && (
          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-2 text-sm font-medium ${enabled ? 'text-green-600' : 'text-gray-500'}`}>
              {enabled ? <ShieldCheck className="w-4 h-4" /> : <ShieldOff className="w-4 h-4" />}
              {enabled ? '2FA is enabled' : '2FA is not enabled'}
            </div>
            {enabled ? (
              <Button variant="outline" size="sm" onClick={() => setStep('disable')}>Disable 2FA</Button>
            ) : (
              <Button size="sm" loading={loading} onClick={startSetup}>Enable 2FA</Button>
            )}
          </div>
        )}

        {step === 'setup' && setupData && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Scan this QR code with <strong>Google Authenticator</strong> or <strong>Authy</strong>.
            </p>
            <canvas ref={canvasRef} className="rounded-lg border border-gray-200" />
            <div>
              <p className="text-xs text-gray-500 mb-1">Or enter this key manually:</p>
              <code className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-2 py-1 rounded font-mono break-all">{setupData.manualKey}</code>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Enter the 6-digit code to confirm</label>
              <OtpInput value={code} onChange={setCode} disabled={loading} />
            </div>
            <div className="flex gap-2">
              <Button loading={loading} onClick={confirmEnable} disabled={code.length < 6}>Confirm & Enable</Button>
              <Button variant="outline" onClick={() => { setStep('idle'); setCode(''); }}>Cancel</Button>
            </div>
          </div>
        )}

        {step === 'disable' && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">Enter your authenticator code to disable 2FA.</p>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Authenticator code</label>
              <OtpInput value={code} onChange={setCode} disabled={loading} />
            </div>
            <div className="flex gap-2">
              <Button variant="destructive" loading={loading} onClick={confirmDisable} disabled={code.length < 6}>Disable 2FA</Button>
              <Button variant="outline" onClick={() => { setStep('idle'); setCode(''); }}>Cancel</Button>
            </div>
          </div>
        )}
      </div>
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
      const errs = body?.errors
      if (errs && typeof errs === 'object') {
        const lines = Array.isArray(errs) ? errs : Object.values(errs).flat()
        toast.error(
          <div>
            <p className="font-medium">{msg}</p>
            <ul className="mt-1 list-disc list-inside text-sm">{lines.map((e, i) => <li key={i}>{e}</li>)}</ul>
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
      <CardHeader title="Change password" description="Choose a strong password to keep your account secure." />
      <form onSubmit={handleSubmit(onSubmit, e => toastFormErrors(e, toast))} className="flex flex-col gap-4 max-w-sm">
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
        <Button type="submit" loading={isSubmitting} className="self-start">Change password</Button>
      </form>
    </Card>
  )
}
