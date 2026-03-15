import React, { createContext, useContext, useState, useEffect } from 'react'
import { getMe } from '../utils/api'

const AuthCtx = createContext(null)

/**
 * AuthProvider
 * ─────────────
 * Wraps the whole app. On mount it reads the JWT from localStorage
 * and validates it against GET /api/auth/me so sessions survive
 * a hard refresh.
 *
 * Provides: { user, loading, isAuthenticated, login(data), logout() }
 */
export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    const saved = localStorage.getItem('user')
    if (token && saved) {
      // Restore from cache immediately so UI doesn't flash
      setUser(JSON.parse(saved))
      // Then validate with the server
      getMe()
        .then(fresh => {
          setUser(fresh)
          localStorage.setItem('user', JSON.stringify(fresh))
        })
        .catch(() => {
          // Token invalid/expired — clear session
          localStorage.removeItem('token')
          localStorage.removeItem('user')
          setUser(null)
        })
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  function login(data) {
    // data = { access_token, user }
    localStorage.setItem('token', data.access_token)
    localStorage.setItem('user',  JSON.stringify(data.user))
    setUser(data.user)
  }

  function logout() {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
  }

  return (
    <AuthCtx.Provider value={{ user, loading, isAuthenticated: !!user, login, logout }}>
      {children}
    </AuthCtx.Provider>
  )
}

export const useAuth = () => useContext(AuthCtx)