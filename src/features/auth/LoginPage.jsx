import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { Eye, EyeOff, BarChart3, ShieldCheck } from 'lucide-react'
import { GoogleLogin } from '@react-oauth/google'
import { useAuth } from '@/context/AuthContext'
import { authApi } from '@/api'
import { Button, Input } from '@/components/ui'
import { OtpInput } from '@/components/ui/OtpInput'
import toast from 'react-hot-toast'

// ─── Login Page ───────────────────────────────────────────────────────────
const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional(),
})


export default function LoginPage() {
  const { login, completeLogin, hasMinLevel } = useAuth()
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)
  const [twoFactorToken, setTwoFactorToken] = useState(null)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(loginSchema),
  })

  const [totpCode, setTotpCode] = useState('')
  const [totpSubmitting, setTotpSubmitting] = useState(false)
  const [totpError, setTotpError] = useState('')

  const redirectAfterLogin = () => {
    const destination = hasMinLevel(60) ? '/dashboard' : '/items'
    navigate(destination, { replace: true })
  }

  const onSubmit = async (data) => {
    try {
      const result = await login(data)
      if (result?.twoFactorRequired) {
        setTwoFactorToken(result.twoFactorToken)
      } else {
        redirectAfterLogin()
      }
    } catch (err) {
      const msg = err?.response?.data?.message ?? 'Login failed. Check your credentials.'
      toast.error(msg)
    }
  }

  const onTotpSubmit = async (e) => {
    e?.preventDefault()
    if (totpCode.length < 6) { setTotpError('Enter all 6 digits.'); return }
    setTotpSubmitting(true)
    setTotpError('')
    try {
      const res = await authApi.verifyTwoFactor({ twoFactorToken, code: totpCode })
      if (!res.data.success) throw new Error(res.data.message)
      const { accessToken, refreshToken, session } = res.data.data
      completeLogin(accessToken, refreshToken, session)
      redirectAfterLogin()
    } catch (err) {
      setTotpError(err?.response?.data?.message ?? err?.message ?? 'Invalid code.')
    } finally {
      setTotpSubmitting(false)
    }
  }

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      const res = await authApi.googleLogin({ idToken: credentialResponse.credential })
      if (!res.data.success) throw new Error(res.data.message)
      const { accessToken, refreshToken, session } = res.data.data
      completeLogin(accessToken, refreshToken, session)
      redirectAfterLogin()
    } catch (err) {
      toast.error(err?.response?.data?.message ?? err?.message ?? 'Google login failed.')
    }
  }

  const leftPanel = (
    <div className="hidden lg:flex lg:w-1/2 bg-brand-600 flex-col justify-between p-12">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
          <BarChart3 className="w-5 h-5 text-white" />
        </div>
        <span className="text-white font-semibold text-lg">EnterpriseApp</span>
      </div>
      <div>
        <blockquote className="text-white/90 text-xl font-medium leading-relaxed mb-4">
          "One platform to manage your entire operation — from inventory to invoicing."
        </blockquote>
        <p className="text-white/60 text-sm">Built for teams that demand reliability at scale.</p>
      </div>
      <p className="text-white/40 text-xs">© {new Date().getFullYear()} EnterpriseApp</p>
    </div>
  )

  // ── 2FA step ──
  if (twoFactorToken) {
    return (
      <div className="min-h-screen flex bg-gray-50 dark:bg-gray-950">
        {leftPanel}
        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <div className="w-full max-w-sm">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-brand-100 dark:bg-brand-900/40 mb-6 mx-auto">
              <ShieldCheck className="w-6 h-6 text-brand-600" />
            </div>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-1 text-center">Two-factor verification</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-8 text-center">
              Enter the 6-digit code from your authenticator app.
            </p>
            <form onSubmit={onTotpSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2 items-center">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Authenticator code</label>
                <OtpInput
                  value={totpCode}
                  onChange={v => { setTotpCode(v); setTotpError('') }}
                  error={totpError}
                  disabled={totpSubmitting}
                />
              </div>
              <Button type="submit" loading={totpSubmitting} className="w-full" disabled={totpCode.length < 6}>
                Verify
              </Button>
              <button
                type="button"
                onClick={() => { setTwoFactorToken(null); setTotpCode(''); setTotpError('') }}
                className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-center"
              >
                Back to sign in
              </button>
            </form>
          </div>
        </div>
      </div>
    )
  }

  // ── Normal login step ──
  return (
    <div className="min-h-screen flex bg-gray-50 dark:bg-gray-950">
      {leftPanel}

      {/* Right panel */}
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-7 h-7 rounded-lg bg-brand-600 flex items-center justify-center">
              <BarChart3 className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-gray-900 dark:text-gray-100">EnterpriseApp</span>
          </div>

          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-1">Welcome back</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">Sign in to your account to continue.</p>

          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <Input
              label="Username or email"
              placeholder="admin"
              autoComplete="username"
              error={errors.username?.message}
              {...register('username')}
            />
            <Input
              label="Password"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              autoComplete="current-password"
              error={errors.password?.message}
              rightIcon={
                <button type="button" onClick={() => setShowPassword(p => !p)} className="text-gray-400 hover:text-gray-600">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              }
              {...register('password')}
            />

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="w-3.5 h-3.5 rounded text-brand-600" {...register('rememberMe')} />
                <span className="text-gray-600 dark:text-gray-400">Remember me</span>
              </label>
              <Link to="/forgot-password" className="text-brand-600 hover:text-brand-700 font-medium">
                Forgot password?
              </Link>
            </div>

            <Button type="submit" loading={isSubmitting} className="w-full mt-1">
              Sign in
            </Button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200 dark:border-gray-700" /></div>
            <div className="relative flex justify-center text-xs text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-950 px-3 w-fit mx-auto">or</div>
          </div>

          <button
            type="button"
            disabled
            className="w-full flex items-center justify-center gap-3 px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-medium text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-800/50 cursor-not-allowed"
          >
            <svg className="w-4 h-4 opacity-40" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
            <span className="ml-1 text-xs bg-gray-200 text-gray-500 px-1.5 py-0.5 rounded-full">Coming Soon</span>
          </button>

          {/* Dev hint */}
          {import.meta.env.DEV && (
            <div className="mt-6 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-xs text-amber-700 dark:text-amber-400">
              <p className="font-semibold mb-1">Dev credentials</p>
              <p>admin / Admin@123</p>
              <p>superadmin / SuperAdmin@123</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Forgot Password Page ─────────────────────────────────────────────────
const forgotSchema = z.object({ email: z.string().email('Enter a valid email') })

export function ForgotPasswordPage() {
  const [sent, setSent] = useState(false)
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(forgotSchema),
  })

  const onSubmit = async (data) => {
    try {
      await authApi.forgotPassword(data)
      setSent(true)
    } catch {
      toast.error('Something went wrong. Please try again.')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-6">
      <div className="w-full max-w-sm">
        <Link to="/login" className="text-sm text-gray-500 hover:text-gray-700 mb-8 flex items-center gap-1">
          ← Back to sign in
        </Link>

        {sent ? (
          <div className="text-center">
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24">
                <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Check your email</h1>
            <p className="text-sm text-gray-500">
              If that address is registered, we've sent a password reset link.
            </p>
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-1">Reset password</h1>
            <p className="text-sm text-gray-500 mb-8">Enter your email and we'll send a reset link.</p>

            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
              <Input label="Email" type="email" placeholder="you@company.com" error={errors.email?.message} {...register('email')} />
              <Button type="submit" loading={isSubmitting} className="w-full">Send reset link</Button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Reset Password Page ──────────────────────────────────────────────────
const resetSchema = z.object({
  newPassword: z.string().min(8, 'At least 8 characters'),
  confirmPassword: z.string(),
}).refine(d => d.newPassword === d.confirmPassword, { message: 'Passwords do not match', path: ['confirmPassword'] })

export function ResetPasswordPage() {
  const navigate = useNavigate()
  const params = new URLSearchParams(window.location.search)
  const token = params.get('token') ?? ''
  const email = params.get('email') ?? ''

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(resetSchema),
  })

  const onSubmit = async (data) => {
    try {
      await authApi.resetPassword({ token, email, ...data })
      toast.success('Password reset. You can now sign in.')
      navigate('/login')
    } catch {
      toast.error('Reset link is invalid or expired.')
    }
  }

  if (!token || !email) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6 text-center">
        <div>
          <p className="text-gray-600 mb-4">Invalid reset link.</p>
          <Link to="/forgot-password" className="text-brand-600 hover:underline text-sm">Request a new one</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-6">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-1">New password</h1>
        <p className="text-sm text-gray-500 mb-8">Choose a strong password for your account.</p>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <Input label="New password" type="password" placeholder="••••••••" error={errors.newPassword?.message} {...register('newPassword')} />
          <Input label="Confirm password" type="password" placeholder="••••••••" error={errors.confirmPassword?.message} {...register('confirmPassword')} />
          <Button type="submit" loading={isSubmitting} className="w-full">Set new password</Button>
        </form>
      </div>
    </div>
  )
}
