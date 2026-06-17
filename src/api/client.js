import axios from 'axios'
import toast from 'react-hot-toast'

const BASE_URL = import.meta.env.VITE_API_URL ?? '/api/v1'

// Token storage keys
export const TOKEN_KEY = 'access_token'
export const REFRESH_KEY = 'refresh_token'
export const SESSION_KEY = 'user_session'

export const getAccessToken = () => localStorage.getItem(TOKEN_KEY)
export const getRefreshToken = () => localStorage.getItem(REFRESH_KEY)
export const setTokens = (access, refresh) => {
  localStorage.setItem(TOKEN_KEY, access)
  localStorage.setItem(REFRESH_KEY, refresh)
}
export const clearTokens = () => {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(REFRESH_KEY)
  localStorage.removeItem(SESSION_KEY)
}

const client = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
})

// Attach Bearer token to every request
client.interceptors.request.use((config) => {
  const token = getAccessToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Track if we're already refreshing to prevent multiple simultaneous refreshes
let isRefreshing = false
let refreshQueue = []

function processRefreshQueue(token) {
  refreshQueue.forEach(cb => cb(token))
  refreshQueue = []
}

// Response interceptor — handle token expiry and errors
client.interceptors.response.use(
  res => res,
  async (error) => {
    const originalRequest = error.config

    // Token expired — attempt silent refresh
    if (
      error.response?.status === 401 &&
      error.response.headers['token-expired'] === 'true' &&
      !originalRequest._retry
    ) {
      if (isRefreshing) {
        // Queue the request until refresh completes
        return new Promise(resolve => {
          refreshQueue.push((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`
            resolve(client(originalRequest))
          })
        })
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        const refreshToken = getRefreshToken()
        if (!refreshToken) throw new Error('No refresh token')

        const { data } = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken })
        const { accessToken, refreshToken: newRefresh } = data.data

        setTokens(accessToken, newRefresh)
        processRefreshQueue(accessToken)
        originalRequest.headers.Authorization = `Bearer ${accessToken}`
        return client(originalRequest)
      } catch {
        clearTokens()
        window.location.href = '/login'
        return Promise.reject(error)
      } finally {
        isRefreshing = false
      }
    }

    // 401 without token-expired header → session invalid (skip on login requests)
    if (error.response?.status === 401 && !originalRequest._retry && !originalRequest._isLoginRequest) {
      clearTokens()
      window.location.href = '/login'
      return Promise.reject(error)
    }

    // Network error — API is unreachable (no response at all)
    if (!error.response) {
      if (!window.location.pathname.startsWith('/system-down')) {
        window.location.href = '/system-down'
      }
      return Promise.reject(error)
    }

    // Show toast for server errors (500+)
    if (error.response.status >= 500) {
      const message = error.response.data?.userMessage
        ?? 'An unexpected error occurred. Please try again.'
      toast.error(message)
    }

    return Promise.reject(error)
  },
)

export default client
