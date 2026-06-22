import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, Lock } from 'lucide-react'
import { authApi, accountApi } from '@/api'
import { PageHeader } from '@/components/layout'
import { Button, Input, Card, CardHeader } from '@/components/ui'
import { PhoneInput } from '@/components/ui/PhoneInput'
import { useAuth } from '@/context/AuthContext'
import toast from 'react-hot-toast'
import { toastFormErrors } from '@/lib/utils'
import { useState } from 'react'

export default function AccountPage() {
  const { session } = useAuth()

  return (
    <div>
      <PageHeader title="Account" description="Manage your account credentials and personal details." breadcrumbs={[{ label: 'Account' }]} />
      <div className="flex flex-col gap-6">
        <AccountInfoForm session={session} />
        <ChangePasswordForm />
      </div>
    </div>
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
