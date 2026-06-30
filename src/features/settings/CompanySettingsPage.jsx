import { useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { companyApi } from '@/api'
import { PageHeader } from '@/components/layout'
import { Button, Input, Textarea, Card, CardHeader, Spinner } from '@/components/ui'
import { PhoneInput } from '@/components/ui/PhoneInput'
import toast from 'react-hot-toast'
import { toastFormErrors } from '@/lib/utils'

const schema = z.object({
  companyName: z.string().min(1, 'Company name is required').max(200),
  address: z.string().max(500).optional().or(z.literal('')),
  phoneCountryCode: z.string().optional(),
  phone: z.string().max(50).optional().or(z.literal('')),
  email: z.string().email('Invalid email').max(200).optional().or(z.literal('')),
  website: z.string().max(500).optional().or(z.literal('')),
  taxNumber: z.string().max(100).optional().or(z.literal('')),
  businessRegNumber: z.string().max(100).optional().or(z.literal('')),
  paymentTerms: z.string().max(200).optional().or(z.literal('')),
  bankName: z.string().max(200).optional().or(z.literal('')),
  bankAccountName: z.string().max(200).optional().or(z.literal('')),
  bankAccountNumber: z.string().max(100).optional().or(z.literal('')),
  paymentNotes: z.string().max(2000).optional().or(z.literal('')),
})

export default function CompanySettingsPage() {
  const qc = useQueryClient()

  const { data: res, isLoading } = useQuery({
    queryKey: ['company-profile'],
    queryFn: () => companyApi.get().then(r => r.data.data),
  })

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { companyName: '' },
  })

  useEffect(() => {
    if (res) reset(Object.fromEntries(Object.entries(res).map(([k, v]) => [k, v ?? ''])))
  }, [res, reset])

  const mutation = useMutation({
    mutationFn: (data) => companyApi.save(data),
    onSuccess: () => {
      toast.success('Company profile saved')
      qc.invalidateQueries({ queryKey: ['company-profile'] })
    },
    onError: () => toast.error('Failed to save'),
  })

  if (isLoading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>

  return (
    <div>
      <PageHeader
        title="Company profile"
        description="Your company information."
        breadcrumbs={[{ label: 'Settings', href: '/settings' }, { label: 'Company' }]}
      />

      <form onSubmit={handleSubmit(d => mutation.mutate(d), e => toastFormErrors(e, toast))}>
        <div className="flex flex-col gap-5">

          {/* Identity */}
          <Card>
            <CardHeader title="Company identity" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Input label="Company name" required error={errors.companyName?.message} {...register('companyName')} />
              </div>
              <Input label="Email" type="email" error={errors.email?.message} {...register('email')} />
              <Input label="Website" {...register('website')} />
              <PhoneInput
                countryCodeProps={register('phoneCountryCode')}
                phoneProps={register('phone')}
              />
              <div className="sm:col-span-2">
                <Textarea label="Address" rows={2} {...register('address')} />
              </div>
            </div>
          </Card>

          {/* Registration */}
          <Card>
            <CardHeader title="Registration numbers" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="Tax number (e.g. GST / VAT)" {...register('taxNumber')} />
              <Input label="Business registration number" {...register('businessRegNumber')} />
            </div>
          </Card>

          {/* Payment */}
          <Card>
            <CardHeader title="Payment defaults" description="Pre-filled on new invoices — can be overridden per invoice." />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="Payment terms (e.g. Net 30)" {...register('paymentTerms')} />
              <Input label="Bank name" {...register('bankName')} />
              <Input label="Bank account name" {...register('bankAccountName')} />
              <Input label="Bank account number" {...register('bankAccountNumber')} />
              <div className="sm:col-span-2">
                <Textarea label="Payment notes (instructions shown on invoice)" rows={3} {...register('paymentNotes')} />
              </div>
            </div>
          </Card>

          <div className="flex justify-end">
            <Button type="submit" loading={isSubmitting}>Save company profile</Button>
          </div>

        </div>
      </form>
    </div>
  )
}
