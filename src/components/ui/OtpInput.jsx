import { useRef } from 'react'
import { cn } from '@/lib/utils'

export function OtpInput({ length = 6, value = '', onChange, error, disabled }) {
  const inputsRef = useRef([])

  const digits = Array.from({ length }, (_, i) => value[i] ?? '')

  const update = (index, char) => {
    const next = digits.slice()
    next[index] = char
    onChange(next.join(''))
  }

  const handleKeyDown = (e, index) => {
    if (e.key === 'Backspace') {
      e.preventDefault()
      if (digits[index]) {
        update(index, '')
      } else if (index > 0) {
        update(index - 1, '')
        inputsRef.current[index - 1]?.focus()
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputsRef.current[index - 1]?.focus()
    } else if (e.key === 'ArrowRight' && index < length - 1) {
      inputsRef.current[index + 1]?.focus()
    }
  }

  const handleInput = (e, index) => {
    const raw = e.target.value.replace(/\D/g, '')
    if (!raw) return

    if (raw.length > 1) {
      // Handle paste via input event
      const chars = raw.slice(0, length - index).split('')
      const next = digits.slice()
      chars.forEach((c, i) => { next[index + i] = c })
      onChange(next.join(''))
      const focusIndex = Math.min(index + chars.length, length - 1)
      inputsRef.current[focusIndex]?.focus()
      return
    }

    update(index, raw)
    if (index < length - 1) {
      inputsRef.current[index + 1]?.focus()
    }
  }

  const handlePaste = (e) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length)
    if (!pasted) return
    const next = Array.from({ length }, (_, i) => pasted[i] ?? '')
    onChange(next.join(''))
    const focusIndex = Math.min(pasted.length, length - 1)
    inputsRef.current[focusIndex]?.focus()
  }

  return (
    <div className="flex flex-col gap-2 items-center">
      <div className="flex gap-2 justify-center">
        {digits.map((digit, i) => (
          <input
            key={i}
            ref={el => { inputsRef.current[i] = el }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            disabled={disabled}
            onKeyDown={e => handleKeyDown(e, i)}
            onInput={e => handleInput(e, i)}
            onPaste={handlePaste}
            onChange={() => {}} // controlled via onInput
            className={cn(
              'w-11 h-12 rounded-lg border-2 text-center text-lg font-semibold',
              'bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100',
              'transition-all duration-150 focus:outline-none',
              error
                ? 'border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-400/30'
                : digit
                  ? 'border-brand-500 focus:border-brand-500 focus:ring-2 focus:ring-brand-400/30'
                  : 'border-gray-300 dark:border-gray-700 focus:border-brand-500 focus:ring-2 focus:ring-brand-400/30',
              'disabled:opacity-50 disabled:cursor-not-allowed',
            )}
          />
        ))}
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}
