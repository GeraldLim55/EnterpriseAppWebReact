import { createContext, useContext, useEffect, useState } from 'react'

const ThemeContext = createContext(null)

const THEME_KEY = 'app-theme'

function applyTheme(preference) {
  const root = document.documentElement
  if (preference === 'dark') {
    root.classList.add('dark')
  } else if (preference === 'light') {
    root.classList.remove('dark')
  } else {
    // system
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    root.classList.toggle('dark', prefersDark)
  }
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => localStorage.getItem(THEME_KEY) ?? 'system')

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  // Re-apply when OS preference changes (only matters when theme === 'system')
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => { if (theme === 'system') applyTheme('system') }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [theme])

  const setAndSave = (value) => {
    localStorage.setItem(THEME_KEY, value)
    setTheme(value)
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme: setAndSave }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>')
  return ctx
}
