export const COUNTRY_CODES = [
  { code: '93',  label: 'Afghanistan (+93)' },
  { code: '971', label: 'United Arab Emirates (+971)' },
  { code: '54',  label: 'Argentina (+54)' },
  { code: '61',  label: 'Australia (+61)' },
  { code: '43',  label: 'Austria (+43)' },
  { code: '994', label: 'Azerbaijan (+994)' },
  { code: '973', label: 'Bahrain (+973)' },
  { code: '880', label: 'Bangladesh (+880)' },
  { code: '32',  label: 'Belgium (+32)' },
  { code: '55',  label: 'Brazil (+55)' },
  { code: '1',   label: 'Canada / United States (+1)' },
  { code: '56',  label: 'Chile (+56)' },
  { code: '86',  label: 'China (+86)' },
  { code: '57',  label: 'Colombia (+57)' },
  { code: '45',  label: 'Denmark (+45)' },
  { code: '213', label: 'Algeria (+213)' },
  { code: '20',  label: 'Egypt (+20)' },
  { code: '34',  label: 'Spain (+34)' },
  { code: '33',  label: 'France (+33)' },
  { code: '44',  label: 'United Kingdom (+44)' },
  { code: '995', label: 'Georgia (+995)' },
  { code: '30',  label: 'Greece (+30)' },
  { code: '36',  label: 'Hungary (+36)' },
  { code: '62',  label: 'Indonesia (+62)' },
  { code: '91',  label: 'India (+91)' },
  { code: '98',  label: 'Iran (+98)' },
  { code: '39',  label: 'Italy (+39)' },
  { code: '972', label: 'Israel (+972)' },
  { code: '81',  label: 'Japan (+81)' },
  { code: '254', label: 'Kenya (+254)' },
  { code: '996', label: 'Kyrgyzstan (+996)' },
  { code: '82',  label: 'South Korea (+82)' },
  { code: '94',  label: 'Sri Lanka (+94)' },
  { code: '218', label: 'Libya (+218)' },
  { code: '212', label: 'Morocco (+212)' },
  { code: '52',  label: 'Mexico (+52)' },
  { code: '95',  label: 'Myanmar (+95)' },
  { code: '60',  label: 'Malaysia (+60)' },
  { code: '234', label: 'Nigeria (+234)' },
  { code: '31',  label: 'Netherlands (+31)' },
  { code: '47',  label: 'Norway (+47)' },
  { code: '64',  label: 'New Zealand (+64)' },
  { code: '51',  label: 'Peru (+51)' },
  { code: '63',  label: 'Philippines (+63)' },
  { code: '92',  label: 'Pakistan (+92)' },
  { code: '48',  label: 'Poland (+48)' },
  { code: '974', label: 'Qatar (+974)' },
  { code: '40',  label: 'Romania (+40)' },
  { code: '7',   label: 'Russia (+7)' },
  { code: '966', label: 'Saudi Arabia (+966)' },
  { code: '46',  label: 'Sweden (+46)' },
  { code: '65',  label: 'Singapore (+65)' },
  { code: '41',  label: 'Switzerland (+41)' },
  { code: '992', label: 'Tajikistan (+992)' },
  { code: '66',  label: 'Thailand (+66)' },
  { code: '216', label: 'Tunisia (+216)' },
  { code: '90',  label: 'Turkey (+90)' },
  { code: '255', label: 'Tanzania (+255)' },
  { code: '256', label: 'Uganda (+256)' },
  { code: '998', label: 'Uzbekistan (+998)' },
  { code: '58',  label: 'Venezuela (+58)' },
  { code: '84',  label: 'Vietnam (+84)' },
  { code: '27',  label: 'South Africa (+27)' },
]

/**
 * Phone input with country code selector.
 * Expects two separate register() bindings:
 *   countryCodeProps = register('phoneCountryCode')
 *   phoneProps       = register('phoneNumber')  or register('phone')
 * Saves country code as bare digits e.g. "60", phone as "101234567".
 */
export function PhoneInput({ label = 'Phone number', countryCodeProps, phoneProps, placeholder = '101234567', colSpan2 = true }) {
  return (
    <div className={colSpan2 ? 'sm:col-span-2' : ''}>
      {label && <label className="text-sm font-medium text-gray-700 block mb-1.5">{label}</label>}
      <div className="flex gap-2">
        <select
          className="h-9 rounded-lg border border-gray-300 bg-white px-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 w-52 flex-shrink-0"
          {...countryCodeProps}
        >
          {COUNTRY_CODES.map(c => (
            <option key={c.code} value={c.code}>{c.label}</option>
          ))}
        </select>
        <input
          type="tel"
          placeholder={placeholder}
          className="flex-1 h-9 rounded-lg border border-gray-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          {...phoneProps}
        />
      </div>
    </div>
  )
}
