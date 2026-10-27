import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { jwtDecode } from 'jwt-decode'
import { io } from 'socket.io-client'
import { BaseUrl } from '../helpers/BaseUrl'

const AuthContext = createContext()

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────
const decodeToken = (token) => {
  if (!token) return null
  try {
    const decoded = jwtDecode(token)
    return {
      userId: decoded.userId || null,
      role: decoded.role || null,
      superClientId: decoded.superClientId || null,
      exp: decoded.exp || null,
    }
  } catch {
    return null
  }
}

const readJSON = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw)
  } catch {
    return fallback
  }
}

const writeJSON = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* ignore */
  }
}

const DEFAULT_EDIT_WINDOW = { enabled: true, minutes: 3, from: 'placed' }

// ─────────────────────────────────────────────────────────────
// Provider
// ─────────────────────────────────────────────────────────────
export const AuthProvider = ({ children }) => {
  const navigate = useNavigate()

  // ── Session ────────────────────────────────────────────────
  const initialToken = localStorage.getItem('token')
  const [token, setToken] = useState(initialToken)
  const [user, setUser] = useState(() => decodeToken(initialToken))

  const isAuthenticated = Boolean(token && user && (!user.exp || user.exp * 1000 > Date.now()))

  // ── Staff-only fields (role === "client") ──────────────────
  const [staffRole, setStaffRole] = useState(localStorage.getItem('staffRole') || 'both')
  const [assignedPlanIds, setAssignedPlanIds] = useState(() => readJSON('assignedPlanIds', []))
  const [assignedTableIds, setAssignedTableIds] = useState(() => readJSON('assignedTableIds', []))
  const [staffNotifications, setStaffNotifications] = useState(() =>
    readJSON('staffNotifications', {}),
  )

  // ── Tenant-level config ────────────────────────────────────
  const [orderFlow, setOrderFlowState] = useState(localStorage.getItem('orderFlow') || 'three-step')
  const [customerEditWindow, setCustomerEditWindowState] = useState(() =>
    readJSON('customerEditWindow', DEFAULT_EDIT_WINDOW),
  )

  // ── Persist setters ────────────────────────────────────────
  const setOrderFlow = useCallback((flow) => {
    if (!flow) return
    setOrderFlowState(flow)
    localStorage.setItem('orderFlow', flow)
  }, [])

  const setCustomerEditWindow = useCallback((win) => {
    if (!win || typeof win !== 'object') return
    const safe = {
      enabled: typeof win.enabled === 'boolean' ? win.enabled : true,
      minutes: Number.isFinite(Number(win.minutes)) ? Number(win.minutes) : 3,
      from: ['placed', 'preparing'].includes(win.from) ? win.from : 'placed',
    }
    setCustomerEditWindowState(safe)
    writeJSON('customerEditWindow', safe)
  }, [])

  // ── Login / logout ─────────────────────────────────────────
  const login = useCallback(
    (newToken) => {
      localStorage.setItem('token', newToken)
      setToken(newToken)
      setUser(decodeToken(newToken))
      navigate('/admin')
    },
    [navigate],
  )

  const logout = useCallback(() => {
    localStorage.removeItem('token')
    setToken(null)
    setUser(null)
    navigate('/login')
    window.location.reload()
  }, [navigate])

  // ── Token expiry watcher ───────────────────────────────────
  useEffect(() => {
    const check = () => {
      const current = localStorage.getItem('token')
      const decoded = decodeToken(current)
      if (!current || !decoded || (decoded.exp && decoded.exp * 1000 < Date.now())) {
        if (current) logout()
      }
    }
    check()
    const interval = setInterval(check, 60_000)
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Hydrate identity + tenant config on mount / token change ──
  useEffect(() => {
    if (!token) return undefined

    let cancelled = false

    const load = async () => {
      try {
        // 1) Identity: staff fields (safe for both roles — /auth/me returns what
        //    the caller is allowed to see; extra fields are ignored for superClient)
        const meRes = await fetch(`${BaseUrl}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (meRes.ok && !cancelled) {
          const me = await meRes.json()
          if (me.role === 'client') {
            const safeRole = ['preparer', 'deliverer', 'both'].includes(me.staffRole)
              ? me.staffRole
              : 'both'
            setStaffRole(safeRole)
            localStorage.setItem('staffRole', safeRole)

            const plans = Array.isArray(me.assignedPlanIds) ? me.assignedPlanIds : []
            const tables = Array.isArray(me.assignedTableIds) ? me.assignedTableIds : []
            setAssignedPlanIds(plans)
            setAssignedTableIds(tables)
            writeJSON('assignedPlanIds', plans)
            writeJSON('assignedTableIds', tables)

            if (me.notifications && typeof me.notifications === 'object') {
              setStaffNotifications(me.notifications)
              writeJSON('staffNotifications', me.notifications)
            }
          }
        }
      } catch (err) {
        console.error('Failed to load /auth/me:', err)
      }

      // 2) Tenant config: orderFlow + customerEditWindow
      //    /auth/get-user currently requires superClient; if the caller is a
      //    client, it returns 403, which is fine — the client will get these
      //    values via the `tenantConfigChanged` socket event below.
      try {
        const userRes = await fetch(`${BaseUrl}/auth/get-user`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (userRes.ok && !cancelled) {
          const data = await userRes.json()
          const flow =
            data.orderFlow || (data.statusFlowEnabled === false ? 'two-step' : 'three-step')
          setOrderFlow(flow)
          if (data.customerEditWindow) {
            setCustomerEditWindow(data.customerEditWindow)
          }
        }
      } catch {
        /* ignore 403 / network noise */
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [token, setOrderFlow, setCustomerEditWindow])

  // ── Live tenant config updates via socket ──────────────────
  useEffect(() => {
    if (!token) return undefined

    const socket = io(BaseUrl, { auth: { token } })

    const onTenantConfig = (cfg) => {
      if (!cfg || typeof cfg !== 'object') return
      if (typeof cfg.orderFlow === 'string') {
        setOrderFlow(cfg.orderFlow)
      }
      if (cfg.customerEditWindow && typeof cfg.customerEditWindow === 'object') {
        setCustomerEditWindow(cfg.customerEditWindow)
      }
    }

    socket.on('tenantConfigChanged', onTenantConfig)
    const onAssignmentChanged = async () => {
      try {
        const res = await fetch(`${BaseUrl}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (res.ok) {
          const me = await res.json()
          if (me.role === 'client') {
            if (me.staffRole) setStaffRole(me.staffRole)
            if (Array.isArray(me.assignedPlanIds)) setAssignedPlanIds(me.assignedPlanIds)
            if (Array.isArray(me.assignedTableIds)) setAssignedTableIds(me.assignedTableIds)
            if (me.notifications) setStaffNotifications(me.notifications)
          }
        }
      } catch {}
      socket.disconnect()
      socket.connect()
    }

    socket.on('staffAssignmentChanged', onAssignmentChanged)
    return () => {
      socket.off('tenantConfigChanged', onTenantConfig)
      socket.off('staffAssignmentChanged', onAssignmentChanged)

      socket.disconnect()
    }
  }, [token, setOrderFlow, setCustomerEditWindow])

  // ── Context value ──────────────────────────────────────────
  const value = useMemo(
    () => ({
      isAuthenticated,
      role: user?.role || null,
      userId: user?.userId || null,
      // Staff
      staffRole,
      assignedPlanIds,
      assignedTableIds,
      staffNotifications,
      // Tenant
      orderFlow,
      customerEditWindow,
      // Setters (used by components that fetch fresh data)
      setStaffRole,
      setAssignedPlanIds,
      setAssignedTableIds,
      setStaffNotifications,
      setOrderFlow,
      setCustomerEditWindow,
      // Session
      login,
      logout,
    }),
    [
      isAuthenticated,
      user,
      staffRole,
      assignedPlanIds,
      assignedTableIds,
      staffNotifications,
      orderFlow,
      customerEditWindow,
      setOrderFlow,
      setCustomerEditWindow,
      login,
      logout,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// ─────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────
export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used inside an AuthProvider')
  }
  return ctx
}
