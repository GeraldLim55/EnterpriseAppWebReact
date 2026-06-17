import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { authApi, systemApi } from '@/api'
import { getAccessToken, getRefreshToken, setTokens, clearTokens, SESSION_KEY } from '@/api/client'
import { ROLE_LEVELS } from '@/types'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(() => {
    try {
      const stored = localStorage.getItem(SESSION_KEY)
      return stored ? JSON.parse(stored) : null
    } catch {
      return null
    }
  })
  const [isLoading, setIsLoading] = useState(true)

  // On mount: check system health first, then verify stored token.
  // If the API is unreachable, the axios interceptor redirects to /system-down.
  useEffect(() => {
    const init = async () => {
      try {
        await systemApi.health()
      } catch {
        // Network errors are caught by the axios interceptor → /system-down.
        // Any other error (4xx etc.) means the server is up, so continue.
      }
      const token = getAccessToken()
      if (!token || !session) {
        setSession(null)
        clearTokens()
      }
      setIsLoading(false)
    }
    init()
  }, [])

  const login = useCallback(async (data) => {
    const res = await authApi.login(data)
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.message ?? 'Login failed')
    }
    const { accessToken, refreshToken, session: userSession } = res.data.data
    setTokens(accessToken, refreshToken)
    localStorage.setItem(SESSION_KEY, JSON.stringify(userSession))
    setSession(userSession)
  }, [])

  const logout = useCallback(async () => {
    try {
      const refreshToken = getRefreshToken()
      if (refreshToken) await authApi.logout(refreshToken)
    } finally {
      clearTokens()
      setSession(null)
    }
  }, [])

  const hasRole = useCallback(
    (...roles) => {
      if (!session) return false
      return roles.includes(session.roleName)
    },
    [session],
  )

  const hasMinLevel = useCallback(
    (level) => {
      if (!session) return false
      return session.userLevel >= level
    },
    [session],
  )

  const hasModule = useCallback(
    (key) => {
      if (!session?.modules) return false
      return session.modules.some(m => m.key === key)
    },
    [session],
  )

  const updateSession = useCallback((newSession) => {
    localStorage.setItem(SESSION_KEY, JSON.stringify(newSession))
    setSession(newSession)
  }, [])

  return (
    <AuthContext.Provider
      value={{
        session,
        isAuthenticated: !!session && !!getAccessToken(),
        isLoading,
        login,
        logout,
        hasRole,
        hasMinLevel,
        hasModule,
        updateSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}

// Convenience hooks
export function useIsAdmin() {
  const { hasMinLevel } = useAuth()
  return hasMinLevel(ROLE_LEVELS.Admin)
}

export function useIsManager() {
  const { hasMinLevel } = useAuth()
  return hasMinLevel(ROLE_LEVELS.Manager)
}
