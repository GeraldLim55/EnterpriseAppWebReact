import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { invoicesApi } from '@/api'
import { PageHeader } from '@/components/layout'
import { Button, Input, Card, CardHeader, Spinner } from '@/components/ui'
import { toast } from 'react-hot-toast'
import { FileText } from 'lucide-react'

const schema = z.object({
  prefix: z.string().min(1, 'Prefix is required').max(20, 'Max 20 characters'),
  runningNumber: z.coerce.number().int().min(1, 'Must be at least 1'),
  paddingDigits: z.coerce.number().int().min(1).max(10, 'Max 10 digits'),
})

export default function InvoiceSettingsPage() {
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['invoice-settings'],
    queryFn: () => invoicesApi.getSettings().then(r => r.data?.data),
  })

  const { register, handleSubmit, reset, watch, formState: { errors, isDirty } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { prefix: 'INV-', runningNumber: 1, paddingDigits: 5 },
  })

  useEffect(() => {
    if (data) reset({ prefix: data.prefix, runningNumber: data.runningNumber, paddingDigits: data.paddingDigits })
  }, [data, reset])

  const save = useMutation({
    mutationFn: (values) => invoicesApi.saveSettings(values),
    onSuccess: () => {
      toast.success('Invoice settings saved')
      qc.invalidateQueries({ queryKey: ['invoice-settings'] })
    },
    onError: () => toast.error('Failed to save settings'),
  })

  const prefix = watch('prefix') ?? ''
  const running = watch('runningNumber') ?? 1
  const padding = watch('paddingDigits') ?? 5
  const preview = `${prefix}${String(running).padStart(Number(padding), '0')}`

  if (isLoading) return <div className="flex justify-center p-20"><Spinner /></div>

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <PageHeader
        title="Invoice Settings"
        description="Configure invoice number format and running counter."
        breadcrumbs={[{ label: 'Settings' }, { label: 'Invoice' }]}
      />

      <Card>
        <CardHeader title="Invoice Number Format" icon={<FileText className="w-4 h-4" />} />
        <form onSubmit={handleSubmit(v => save.mutate(v))} className="p-5 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Prefix"
              placeholder="e.g. INV-"
              error={errors.prefix?.message}
              {...register('prefix')}
            />
            <Input
              label="Number padding (digits)"
              type="number"
              min={1}
              max={10}
              error={errors.paddingDigits?.message}
              {...register('paddingDigits')}
            />
          </div>

          <Input
            label="Next running number"
            type="number"
            min={1}
            error={errors.runningNumber?.message}
            {...register('runningNumber')}
          />

          <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
            <p className="text-xs text-gray-500 mb-1">Next invoice number preview</p>
            <p className="text-lg font-semibold text-brand-700">{preview}</p>
          </div>

          <div className="flex justify-end">
            <Button type="submit" loading={save.isPending} disabled={!isDirty}>
              Save settings
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
