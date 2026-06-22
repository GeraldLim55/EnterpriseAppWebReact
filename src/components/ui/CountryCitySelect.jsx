import { useEffect } from 'react'
import { COUNTRIES, CITIES_BY_COUNTRY } from './CountryCityData'
import { Select } from './index'

/**
 * Country + City dropdowns. City list updates when country changes.
 *
 * Usage (React Hook Form):
 *   const { register, watch, setValue } = useForm(...)
 *   <CountryCitySelect
 *     countryProps={register('country')}
 *     cityProps={register('city')}
 *     watchedCountry={watch('country')}
 *     onClearCity={() => setValue('city', '')}
 *   />
 */
export function CountryCitySelect({
  countryProps,
  cityProps,
  watchedCountry,
  onClearCity,
  countryError,
  cityError,
}) {
  const cities = (watchedCountry && CITIES_BY_COUNTRY[watchedCountry]) ?? []

  // Reset city when country changes
  useEffect(() => {
    onClearCity?.()
  }, [watchedCountry]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <Select
        label="Country"
        placeholder="Select country"
        options={COUNTRIES.map(c => ({ value: c, label: c }))}
        error={countryError}
        {...countryProps}
      />
      <Select
        label="City"
        placeholder={watchedCountry ? 'Select city' : 'Select country first'}
        options={cities.map(c => ({ value: c, label: c }))}
        error={cityError}
        disabled={!watchedCountry || cities.length === 0}
        {...cityProps}
      />
    </>
  )
}
