import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { Building2 } from 'lucide-react'

import { settingsApi } from '@/api'
import { PageHeader } from '@/components/layout'
import { Button, Input, Card, CardHeader, Spinner } from '@/components/ui'
import { useAuth } from '@/context/AuthContext'
import { MODULES } from '@/types'
import toast from 'react-hot-toast'

// ─── Options ──────────────────────────────────────────────────────────────
const TIMEZONE_OPTIONS = [
  { value: 'Dateline Standard Time',        label: '(UTC-12:00) International Date Line West' },
  { value: 'UTC-11',                         label: '(UTC-11:00) Coordinated Universal Time-11' },
  { value: 'Hawaiian Standard Time',         label: '(UTC-10:00) Hawaii' },
  { value: 'Alaskan Standard Time',          label: '(UTC-09:00) Alaska' },
  { value: 'Pacific Standard Time',          label: '(UTC-08:00) Pacific Time (US & Canada)' },
  { value: 'Mountain Standard Time',         label: '(UTC-07:00) Mountain Time (US & Canada)' },
  { value: 'Central Standard Time',          label: '(UTC-06:00) Central Time (US & Canada)' },
  { value: 'Eastern Standard Time',          label: '(UTC-05:00) Eastern Time (US & Canada)' },
  { value: 'SA Eastern Standard Time',       label: '(UTC-03:00) Cayenne, Fortaleza' },
  { value: 'E. South America Standard Time', label: '(UTC-03:00) Brasilia' },
  { value: 'UTC-02',                         label: '(UTC-02:00) Coordinated Universal Time-02' },
  { value: 'Azores Standard Time',           label: '(UTC-01:00) Azores' },
  { value: 'UTC',                            label: '(UTC) Coordinated Universal Time' },
  { value: 'GMT Standard Time',              label: '(UTC+00:00) Dublin, Edinburgh, Lisbon, London' },
  { value: 'W. Europe Standard Time',        label: '(UTC+01:00) Amsterdam, Berlin, Rome, Vienna' },
  { value: 'Romance Standard Time',          label: '(UTC+01:00) Brussels, Copenhagen, Madrid, Paris' },
  { value: 'Central Europe Standard Time',   label: '(UTC+01:00) Warsaw, Budapest, Prague' },
  { value: 'South Africa Standard Time',     label: '(UTC+02:00) Harare, Pretoria' },
  { value: 'GTB Standard Time',              label: '(UTC+02:00) Athens, Bucharest' },
  { value: 'Egypt Standard Time',            label: '(UTC+02:00) Cairo' },
  { value: 'E. Europe Standard Time',        label: '(UTC+02:00) Nicosia' },
  { value: 'Turkey Standard Time',           label: '(UTC+03:00) Istanbul' },
  { value: 'Arab Standard Time',             label: '(UTC+03:00) Kuwait, Riyadh' },
  { value: 'Arabic Standard Time',           label: '(UTC+03:00) Baghdad' },
  { value: 'Russia Time Zone 3',             label: '(UTC+04:00) Izhevsk, Samara' },
  { value: 'Arabian Standard Time',          label: '(UTC+04:00) Abu Dhabi, Muscat' },
  { value: 'Afghanistan Standard Time',      label: '(UTC+04:30) Kabul' },
  { value: 'West Asia Standard Time',        label: '(UTC+05:00) Ashgabat, Tashkent' },
  { value: 'Pakistan Standard Time',         label: '(UTC+05:00) Islamabad, Karachi' },
  { value: 'India Standard Time',            label: '(UTC+05:30) Chennai, Kolkata, Mumbai, New Delhi' },
  { value: 'Sri Lanka Standard Time',        label: '(UTC+05:30) Sri Jayawardenepura' },
  { value: 'Nepal Standard Time',            label: '(UTC+05:45) Kathmandu' },
  { value: 'Central Asia Standard Time',     label: '(UTC+06:00) Astana' },
  { value: 'Bangladesh Standard Time',       label: '(UTC+06:00) Dhaka' },
  { value: 'SE Asia Standard Time',          label: '(UTC+07:00) Bangkok, Hanoi, Jakarta' },
  { value: 'China Standard Time',            label: '(UTC+08:00) Beijing, Chongqing, Hong Kong, Urumqi' },
  { value: 'Singapore Standard Time',        label: '(UTC+08:00) Kuala Lumpur, Singapore' },
  { value: 'Taipei Standard Time',           label: '(UTC+08:00) Taipei' },
  { value: 'W. Australia Standard Time',     label: '(UTC+08:00) Perth' },
  { value: 'Korea Standard Time',            label: '(UTC+09:00) Seoul' },
  { value: 'Tokyo Standard Time',            label: '(UTC+09:00) Osaka, Sapporo, Tokyo' },
  { value: 'AUS Eastern Standard Time',      label: '(UTC+10:00) Canberra, Melbourne, Sydney' },
  { value: 'New Zealand Standard Time',      label: '(UTC+12:00) Auckland, Wellington' },
]

const CURRENCY_OPTIONS = [
  { value: 'USD', label: 'USD – US Dollar ($)' },
  { value: 'EUR', label: 'EUR – Euro (€)' },
  { value: 'GBP', label: 'GBP – British Pound (£)' },
  { value: 'MYR', label: 'MYR – Malaysian Ringgit (RM)' },
  { value: 'SGD', label: 'SGD – Singapore Dollar (S$)' },
  { value: 'AUD', label: 'AUD – Australian Dollar (A$)' },
  { value: 'CAD', label: 'CAD – Canadian Dollar (C$)' },
  { value: 'JPY', label: 'JPY – Japanese Yen (¥)' },
  { value: 'CNY', label: 'CNY – Chinese Yuan (¥)' },
  { value: 'INR', label: 'INR – Indian Rupee (₹)' },
  { value: 'IDR', label: 'IDR – Indonesian Rupiah (Rp)' },
  { value: 'THB', label: 'THB – Thai Baht (฿)' },
  { value: 'VND', label: 'VND – Vietnamese Dong (₫)' },
  { value: 'KRW', label: 'KRW – South Korean Won (₩)' },
  { value: 'HKD', label: 'HKD – Hong Kong Dollar (HK$)' },
  { value: 'NZD', label: 'NZD – New Zealand Dollar (NZ$)' },
  { value: 'AED', label: 'AED – UAE Dirham (د.إ)' },
  { value: 'SAR', label: 'SAR – Saudi Riyal (﷼)' },
  { value: 'CHF', label: 'CHF – Swiss Franc (Fr)' },
  { value: 'BRL', label: 'BRL – Brazilian Real (R$)' },
]

const SELF_REGISTRATION_OPTIONS = [
  { value: 'true',  label: 'Enabled – anyone can register' },
  { value: 'false', label: 'Disabled – invite only' },
]

const LOCALE_OPTIONS = [
  { value: 'en-US', label: 'English (United States)' },
  { value: 'en-GB', label: 'English (United Kingdom)' },
  { value: 'en-AU', label: 'English (Australia)' },
  { value: 'en-MY', label: 'English (Malaysia)' },
  { value: 'en-SG', label: 'English (Singapore)' },
  { value: 'en-NZ', label: 'English (New Zealand)' },
  { value: 'en-IN', label: 'English (India)' },
  { value: 'zh-CN', label: 'Chinese (Simplified)' },
  { value: 'zh-TW', label: 'Chinese (Traditional)' },
  { value: 'ms-MY', label: 'Malay (Malaysia)' },
  { value: 'id-ID', label: 'Indonesian (Indonesia)' },
  { value: 'th-TH', label: 'Thai (Thailand)' },
  { value: 'vi-VN', label: 'Vietnamese (Vietnam)' },
  { value: 'ja-JP', label: 'Japanese (Japan)' },
  { value: 'ko-KR', label: 'Korean (South Korea)' },
  { value: 'fr-FR', label: 'French (France)' },
  { value: 'de-DE', label: 'German (Germany)' },
  { value: 'es-ES', label: 'Spanish (Spain)' },
  { value: 'es-MX', label: 'Spanish (Mexico)' },
  { value: 'pt-BR', label: 'Portuguese (Brazil)' },
  { value: 'ar-SA', label: 'Arabic (Saudi Arabia)' },
  { value: 'tr-TR', label: 'Turkish (Turkey)' },
  { value: 'ru-RU', label: 'Russian (Russia)' },
  { value: 'nl-NL', label: 'Dutch (Netherlands)' },
  { value: 'pl-PL', label: 'Polish (Poland)' },
  { value: 'it-IT', label: 'Italian (Italy)' },
]

// ─── Settings Page ────────────────────────────────────────────────────────
export default function SettingsPage() {
  const { hasModule } = useAuth()
  const qc = useQueryClient()

  const { data: res, isLoading } = useQuery({
    queryKey: ['settings-all'],
    queryFn: () => settingsApi.getAll().then(r => r.data.data ?? []),
  })

  const updateMutation = useMutation({
    mutationFn: ({ key, value }) => settingsApi.update(key, value),
    onSuccess: () => { toast.success('Setting updated'); qc.invalidateQueries({ queryKey: ['settings-all'] }) },
    onError: () => toast.error('Failed to update setting'),
  })

  const DATE_FORMAT_OPTIONS = [
    { value: 'dd/MM/yyyy', label: 'DD/MM/YYYY (09/06/2026)' },
    { value: 'yyyy-MM-dd', label: 'YYYY-MM-DD (2026-06-09)' },
    { value: 'MM-dd-yyyy', label: 'MM-DD-YYYY (06-09-2026)' },
    { value: 'dd MMM yyyy', label: 'DD MMM YYYY (09 Jun 2026)' },
  ]

  if (isLoading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>

  const settings = res ?? []
  const getVal = (key) => settings.find(s => s.key === key)?.value ?? ''

  return (
    <div>
      <PageHeader title="Settings" description="Configure system-wide preferences." breadcrumbs={[{ label: 'Settings' }]} />

      <div className="flex flex-col gap-6">
        {/* Date & Locale */}
        <Card>
          <CardHeader title="Date & localisation" description="Controls how dates are displayed throughout the app." />
          <div className="flex flex-col gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1.5">Date display format</label>
              <select
                className="w-full h-9 rounded-lg border border-gray-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                value={getVal('DateDisplayFormat')}
                onChange={e => updateMutation.mutate({ key: 'DateDisplayFormat', value: e.target.value })}
              >
                {DATE_FORMAT_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <SettingSelect
              label="Timezone"
              value={getVal('Timezone')}
              options={TIMEZONE_OPTIONS}
              onSave={value => updateMutation.mutate({ key: 'Timezone', value })}
            />
            <SettingSelect
              label="Locale"
              value={getVal('Locale')}
              options={LOCALE_OPTIONS}
              onSave={value => updateMutation.mutate({ key: 'Locale', value })}
            />
          </div>
        </Card>

        {/* Company profile — ERP module only */}
        {hasModule(MODULES.Erp) && (
          <Link to="/settings/company" className="block">
            <Card className="hover:border-brand-300 hover:bg-brand-50 transition-colors cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-brand-100 rounded-lg">
                  <Building2 className="w-5 h-5 text-brand-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">Company profile</p>
                  <p className="text-xs text-gray-500">Your company information</p>
                </div>
              </div>
            </Card>
          </Link>
        )}

        {/* Finance — ERP module only */}
        {hasModule(MODULES.Erp) && <Card>
          <CardHeader title="Finance" />
          <div className="flex flex-col gap-4">
            <SettingSelect
              label="Currency"
              value={getVal('CurrencySymbol')}
              options={CURRENCY_OPTIONS}
              onSave={value => updateMutation.mutate({ key: 'CurrencySymbol', value })}
            />
            <SettingInput
              label="Default tax rate (%)"
              settingKey="DefaultTaxRate"
              value={getVal('DefaultTaxRate')}
              hint="Applied to new invoices by default"
              onSave={value => updateMutation.mutate({ key: 'DefaultTaxRate', value })}
            />
          </div>
        </Card>}

        {/* Security */}
        <Card>
          <CardHeader title="Security" />
          <SettingSelect
            label="Allow self-registration"
            value={getVal('AllowSelfRegistration')}
            options={SELF_REGISTRATION_OPTIONS}
            onSave={value => updateMutation.mutate({ key: 'AllowSelfRegistration', value })}
          />
        </Card>

      </div>
    </div>
  )
}

// ─── Setting Input ────────────────────────────────────────────────────────
function SettingInput({ label, settingKey, value, hint, onSave }) {
  const { register, handleSubmit } = useForm({ defaultValues: { value } })
  return (
    <form onSubmit={handleSubmit(d => onSave(d.value))} className="flex items-end gap-3">
      <div className="flex-1">
        <Input label={label} hint={hint} {...register('value')} />
      </div>
      <Button type="submit" size="sm" variant="outline">Save</Button>
    </form>
  )
}

// ─── Setting Select ───────────────────────────────────────────────────────
function SettingSelect({ label, value, options, onSave }) {
  const { register, handleSubmit } = useForm({ defaultValues: { value } })
  return (
    <form onSubmit={handleSubmit(d => onSave(d.value))} className="flex items-end gap-3">
      <div className="flex-1">
        <label className="text-sm font-medium text-gray-700 block mb-1.5">{label}</label>
        <select
          className="w-full h-9 rounded-lg border border-gray-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          {...register('value')}
        >
          {options.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>
      <Button type="submit" size="sm" variant="outline">Save</Button>
    </form>
  )
}

