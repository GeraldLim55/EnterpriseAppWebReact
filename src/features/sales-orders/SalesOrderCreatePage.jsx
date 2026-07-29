import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Trash2, ArrowLeft, FileText } from 'lucide-react'
import { salesOrdersApi, itemsApi } from '@/api'
import { PageHeader } from '@/components/layout'
import { Button, Input, Textarea, Card, Spinner, Empty } from '@/components/ui'
import { PhoneInput } from '@/components/ui/PhoneInput'
import { formatCurrency } from '@/lib/utils'
import { toastFormErrors } from '@/lib/utils'
import toast from 'react-hot-toast'

const itemSchema = z.object({
  itemId: z.coerce.number().optional().nullable(),
  itemName: z.string({ required_error: 'Item name is required' }).min(1, 'Item name is required'),
  description: z.string().optional(),
  quantity: z.coerce.number({ required_error: 'Quantity is required' }).min(1, 'Quantity must be at least 1'),
  unitPrice: z.coerce.number({ required_error: 'Unit price is required' }).min(0, 'Unit price must be 0 or more'),
  discountPercent: z.coerce.number().min(0).max(100).default(0),
})

const schema = z.object({
  orderDate: z.string({ required_error: 'Order date is required' }).min(1, 'Order date is required'),
  deliveryDate: z.string().optional().transform(v => v || undefined),
  customerName: z.string({ required_error: 'Customer name is required' }).min(1, 'Customer name is required'),
  customerEmail: z.string().email('Invalid email').optional().or(z.literal('')),
  customerPhone: z.string().optional(),
  customerPhoneCountryCode: z.string().optional(),
  customerAddress: z.string().optional(),
  discountAmount: z.coerce.number().min(0),
  notes: z.string().optional(),
  items: z.array(itemSchema).min(1, 'At least one item is required'),
})

export default function SalesOrderCreatePage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { id } = useParams()
  const isEdit = !!id

  const [activeTab, setActiveTab] = useState('Order')

  const { data: existingSO, isLoading: loadingExisting } = useQuery({
    queryKey: ['sales-order', id],
    queryFn: () => salesOrdersApi.getById(Number(id)).then(r => r.data.data),
    enabled: isEdit,
  })

  const { data: itemLookup = [] } = useQuery({
    queryKey: ['items-lookup'],
    queryFn: () => itemsApi.getLookup().then(r => r.data.data ?? []),
    staleTime: 1000 * 60 * 5,
  })

  const { register, control, handleSubmit, watch, setValue, reset, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      orderDate: new Date().toISOString().split('T')[0],
      discountAmount: 0,
      customerPhoneCountryCode: '60',
      items: [{ itemName: '', quantity: 1, unitPrice: 0, discountPercent: 0 }],
    },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'items' })

  useEffect(() => {
    if (isEdit && existingSO) {
      reset({
        orderDate: existingSO.orderDate?.split('T')[0] ?? '',
        deliveryDate: existingSO.deliveryDate?.split('T')[0] ?? '',
        customerName: existingSO.customerName ?? '',
        customerEmail: existingSO.customerEmail ?? '',
        customerPhoneCountryCode: existingSO.customerPhoneCountryCode ?? '60',
        customerPhone: existingSO.customerPhone ?? '',
        customerAddress: existingSO.customerAddress ?? '',
        discountAmount: existingSO.discountAmount,
        notes: existingSO.notes ?? '',
        items: existingSO.items.map(i => ({
          itemId: i.itemId,
          itemName: i.itemName,
          description: i.description ?? '',
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          discountPercent: i.discountPercent,
        })),
      })
    }
  }, [existingSO, isEdit, reset])

  const watchedItems = watch('items')
  const watchedDiscount = watch('discountAmount')

  const grossTotal = watchedItems?.reduce((sum, d) =>
    sum + (Number(d.quantity) * Number(d.unitPrice)), 0) ?? 0

  const subTotal = watchedItems?.reduce((sum, d) => {
    const disc = 1 - (Number(d.discountPercent) / 100)
    return sum + (Number(d.quantity) * Number(d.unitPrice) * disc)
  }, 0) ?? 0

  const lineDiscountTotal = grossTotal - subTotal
  const masterDiscount = Number(watchedDiscount) || 0
  const total = subTotal - masterDiscount

  const mutation = useMutation({
    mutationFn: (data) => isEdit
      ? salesOrdersApi.update(Number(id), data)
      : salesOrdersApi.create(data),
    onSuccess: (res) => {
      const so = res.data.data
      toast.success(isEdit ? 'Sales order updated' : `Sales order ${so?.orderNumber} created`)
      qc.invalidateQueries({ queryKey: ['sales-orders'] })
      navigate(`/sales-orders/${so?.id ?? id}`)
    },
    onError: (err) => toast.error(err?.response?.data?.message ?? 'Failed to save sales order'),
  })

  const handleItemSelect = (index, itemId) => {
    const item = itemLookup.find(i => i.id === Number(itemId))
    if (item) {
      setValue(`items.${index}.itemId`, item.id)
      setValue(`items.${index}.itemName`, item.name)
      setValue(`items.${index}.unitPrice`, item.price)
    }
  }

  if (isEdit && loadingExisting) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>
  if (isEdit && !existingSO) return <Empty title="Sales order not found" />

  const tabErrors = {
    Order: !!(errors.orderDate || errors.deliveryDate),
    Customer: !!(errors.customerName || errors.customerEmail),
  }

  return (
    <div>
      <PageHeader
        title={isEdit ? 'Edit Sales Order' : 'New Sales Order'}
        breadcrumbs={[{ label: 'Sales Orders', href: '/sales-orders' }, { label: isEdit ? 'Edit' : 'New' }]}
        action={<Button variant="ghost" size="sm" leftIcon={<ArrowLeft className="w-3.5 h-3.5" />} onClick={() => navigate(-1)}>Back</Button>}
      />

      <form onSubmit={e => e.preventDefault()}>
        <div className="flex flex-col gap-5">

          {/* Row 1 — Tabbed: Order / Customer */}
          <Card>
            <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700 mb-4">
              {['Order', 'Customer'].map(tab => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`relative px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                    activeTab === tab
                      ? 'text-brand-600 border-b-2 border-brand-600 -mb-px'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                >
                  {tab}
                  {tabErrors[tab] && (
                    <span className="absolute top-1.5 right-1 w-1.5 h-1.5 rounded-full bg-red-500" />
                  )}
                </button>
              ))}
            </div>

            {activeTab === 'Order' && (
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Order date" type="date" required
                  error={errors.orderDate?.message}
                  {...register('orderDate')}
                />
                <Input
                  label="Delivery date" type="date"
                  error={errors.deliveryDate?.message}
                  {...register('deliveryDate')}
                />
                <Input
                  label="Discount (MYR)" type="number" step="0.01"
                  error={errors.discountAmount?.message}
                  {...register('discountAmount')}
                />
                <div className="col-span-2">
                  <Textarea label="Notes" rows={2} placeholder="Additional notes..." {...register('notes')} />
                </div>
              </div>
            )}

            {activeTab === 'Customer' && (
              <div className="grid grid-cols-2 gap-4">
                <Input label="Customer name" required error={errors.customerName?.message} {...register('customerName')} />
                <Input label="Customer email" type="email" error={errors.customerEmail?.message} {...register('customerEmail')} />
                <PhoneInput
                  label="Customer phone"
                  countryCodeProps={register('customerPhoneCountryCode')}
                  phoneProps={register('customerPhone')}
                  colSpan2={false}
                />
                <div className="col-span-2">
                  <Textarea label="Address" rows={2} {...register('customerAddress')} />
                </div>
              </div>
            )}
          </Card>

          {/* Row 2 — Line items */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Line items</h2>
              <Button
                type="button" size="sm" variant="outline"
                leftIcon={<Plus className="w-3.5 h-3.5" />}
                onClick={() => append({ itemName: '', quantity: 1, unitPrice: 0, discountPercent: 0 })}
              >
                Add line
              </Button>
            </div>

            {fields.length === 0 ? (
              <Empty icon={<FileText className="w-8 h-8" />} title="No line items" description="Add at least one item to this sales order." />
            ) : (
              <>
                <div className="hidden sm:grid grid-cols-12 gap-2 px-3 mb-1 text-xs font-medium text-gray-500 uppercase tracking-wide">
                  <div className="col-span-2">Item</div>
                  <div className="col-span-2">Name</div>
                  <div className="col-span-2">Description</div>
                  <div className="col-span-1 text-center">Qty</div>
                  <div className="col-span-2 text-right">Unit price</div>
                  <div className="col-span-1 text-right">Disc %</div>
                  <div className="col-span-1 text-right">Total</div>
                </div>

                <div className="flex flex-col gap-2">
                  {fields.map((field, index) => {
                    const d = watchedItems?.[index] ?? {}
                    const lineTotal = Number(d.quantity) * Number(d.unitPrice) * (1 - (Number(d.discountPercent) || 0) / 100)
                    return (
                      <div key={field.id} className="grid grid-cols-12 gap-2 items-center px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        {/* Item picker */}
                        <div className="col-span-12 sm:col-span-2">
                          <select
                            className="w-full h-9 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                            onChange={e => handleItemSelect(index, e.target.value)}
                            defaultValue=""
                          >
                            <option value="">Custom…</option>
                            {itemLookup.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                          </select>
                        </div>
                        {/* Name */}
                        <div className="col-span-12 sm:col-span-2">
                          <Input
                            placeholder="Item name"
                            error={errors.items?.[index]?.itemName?.message}
                            {...register(`items.${index}.itemName`)}
                          />
                        </div>
                        {/* Description */}
                        <div className="col-span-12 sm:col-span-2">
                          <Input placeholder="Description" {...register(`items.${index}.description`)} />
                        </div>
                        {/* Qty */}
                        <div className="col-span-4 sm:col-span-1">
                          <Input type="number" min="1" placeholder="Qty"
                            error={errors.items?.[index]?.quantity?.message}
                            {...register(`items.${index}.quantity`)} />
                        </div>
                        {/* Unit price */}
                        <div className="col-span-4 sm:col-span-2">
                          <Input type="number" step="0.01" placeholder="0.00" className="text-right"
                            error={errors.items?.[index]?.unitPrice?.message}
                            {...register(`items.${index}.unitPrice`)} />
                        </div>
                        {/* Disc % */}
                        <div className="col-span-3 sm:col-span-1">
                          <Input type="number" step="0.1" placeholder="0" className="text-right" {...register(`items.${index}.discountPercent`)} />
                        </div>
                        {/* Line total */}
                        <div className="col-span-4 sm:col-span-1 text-right text-sm font-semibold text-gray-800 dark:text-gray-200 pr-1">
                          {formatCurrency(lineTotal)}
                        </div>
                        {/* Remove */}
                        <div className="col-span-1 flex justify-end">
                          <button
                            type="button"
                            onClick={() => remove(index)}
                            className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </>
            )}
            {errors.items?.message && (
              <p className="text-xs text-red-500 mt-2">{errors.items.message}</p>
            )}
          </Card>

          {/* Row 3 — Summary */}
          <Card>
            <div className="flex justify-end">
              <div className="w-80">
                <div className="flex flex-col gap-1.5 text-sm">
                  <div className="flex justify-between text-gray-500">
                    <span>Gross</span><span className="font-medium text-gray-800 dark:text-gray-200">{formatCurrency(grossTotal)}</span>
                  </div>
                  {lineDiscountTotal > 0 && (
                    <div className="flex justify-between text-gray-500">
                      <span>Line discount</span><span className="font-medium text-red-500">−{formatCurrency(lineDiscountTotal)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-gray-500">
                    <span>Subtotal</span><span className="font-medium text-gray-800 dark:text-gray-200">{formatCurrency(subTotal)}</span>
                  </div>
                  {masterDiscount > 0 && (
                    <div className="flex justify-between text-gray-500">
                      <span>Discount</span><span className="font-medium text-red-500">−{formatCurrency(masterDiscount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-2 border-t border-gray-200 dark:border-gray-700 text-base font-bold text-gray-900 dark:text-gray-100">
                    <span>Total</span><span>{formatCurrency(total)}</span>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          <div className="flex gap-3 justify-end">
            <Button type="button" variant="outline" onClick={() => navigate(-1)}>Cancel</Button>
            {isEdit ? (
              <Button
                type="button"
                loading={mutation.isPending}
                onClick={handleSubmit(d => mutation.mutate(d), e => toastFormErrors(e, toast))}
              >
                Update Sales Order
              </Button>
            ) : (
              <>
                <Button
                  type="button"
                  variant="outline"
                  loading={mutation.isPending}
                  onClick={handleSubmit(d => mutation.mutate({ ...d, status: 0 }), e => toastFormErrors(e, toast))}
                >
                  Save as Draft
                </Button>
                <Button
                  type="button"
                  loading={mutation.isPending}
                  onClick={handleSubmit(d => mutation.mutate({ ...d, status: 1 }), e => toastFormErrors(e, toast))}
                >
                  Save as Pending
                </Button>
              </>
            )}
          </div>

        </div>
      </form>
    </div>
  )
}
