import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { io } from 'socket.io-client'
import { BaseUrl } from '../helpers/BaseUrl'
import { GetToken } from '../helpers/GetToken'

const NotificationCenterContext = createContext(null)

const MAX_EVENTS = 100 // ring buffer size in memory
const MAX_READ_IDS = 500 // localStorage cap

const STORAGE_READ_KEY = 'notificationCenterReadIds'

const readReadIds = () => {
  try {
    const raw = localStorage.getItem(STORAGE_READ_KEY)
    if (!raw) return new Set()
    const arr = JSON.parse(raw)
    return Array.isArray(arr) ? new Set(arr) : new Set()
  } catch {
    return new Set()
  }
}

const writeReadIds = (set) => {
  try {
    // Keep the last MAX_READ_IDS by insertion order
    const arr = Array.from(set).slice(-MAX_READ_IDS)
    localStorage.setItem(STORAGE_READ_KEY, JSON.stringify(arr))
  } catch {
    /* ignore quota */
  }
}

// Turn a socket event into a normalized notification entry.
// Returns null if the event should not be stored.
const normalizeEvent = (eventName, payload) => {
  if (!payload) return null

  const id = `${eventName}:${payload._id || payload.orderId || payload.supportId || Date.now()}:${Date.now()}`

  if (eventName === 'newOrder') {
    if (!payload._id) return null
    return {
      id,
      type: 'newOrder',
      orderId: payload._id,
      tableNumber: payload.table?.number || null,
      orderNumber: payload.orderNumber || null,
      orderType: payload.orderType || 'dine-in',
      createdAt: Date.now(),
      raw: payload,
    }
  }

  if (eventName === 'orderReady') {
    if (!payload.orderId) return null
    return {
      id,
      type: 'orderReady',
      orderId: payload.orderId,
      tableNumber: payload.tableNumber || null,
      planName: payload.planName || null,
      createdAt: Date.now(),
      raw: payload,
    }
  }

  if (eventName === 'orderDelivered') {
    if (!payload.orderId) return null
    return {
      id,
      type: 'orderDelivered',
      orderId: payload.orderId,
      tableNumber: payload.tableNumber || null,
      createdAt: Date.now(),
      raw: payload,
    }
  }

  if (eventName === 'supportNotification') {
    if (!payload.supportId) return null
    return {
      id,
      type: 'support',
      supportId: payload.supportId,
      tableNumber: payload.tableNumber || null,
      requestTypeName: payload.requestTypeName || null,
      createdAt: Date.now(),
      raw: payload,
    }
  }

  if (eventName === 'deleteOrder') {
    // payload is the order _id string in some paths, or an object in others
    const orderId = typeof payload === 'string' ? payload : payload._id || payload.orderId
    if (!orderId) return null
    return {
      id,
      type: 'deleteOrder',
      orderId,
      createdAt: Date.now(),
      raw: payload,
    }
  }

  if (eventName === 'orderUpdated') {
    // Only store if it carries a status update — otherwise skip to avoid
    // flooding the list with payment events.
    const status = payload.status
    if (!status) return null
    return {
      id,
      type: 'statusChange',
      orderId: payload._id,
      status,
      tableNumber: payload.table?.number || null,
      createdAt: Date.now(),
      raw: payload,
    }
  }

  return null
}

export const NotificationCenterProvider = ({ children }) => {
  const [events, setEvents] = useState([])
  const [readIds, setReadIds] = useState(() => readReadIds())
  const socketRef = useRef(null)
  const token = GetToken()

  // ── Socket subscription ──────────────────────────────────
  useEffect(() => {
    if (!token) return undefined

    const socket = io(BaseUrl, { auth: { token } })
    socketRef.current = socket

    const push = (eventName) => (payload) => {
      const event = normalizeEvent(eventName, payload)
      if (!event) return
      setEvents((prev) => {
        const next = [event, ...prev]
        return next.length > MAX_EVENTS ? next.slice(0, MAX_EVENTS) : next
      })
    }

    const handlers = {
      newOrder: push('newOrder'),
      orderReady: push('orderReady'),
      orderDelivered: push('orderDelivered'),
      supportNotification: push('supportNotification'),
      deleteOrder: push('deleteOrder'),
      orderUpdated: push('orderUpdated'),
    }

    Object.entries(handlers).forEach(([name, fn]) => socket.on(name, fn))

    return () => {
      Object.entries(handlers).forEach(([name, fn]) => socket.off(name, fn))
      socket.disconnect()
      socketRef.current = null
    }
  }, [token])

  // ── Persist read ids whenever they change ────────────────
  useEffect(() => {
    writeReadIds(readIds)
  }, [readIds])

  // ── Actions ──────────────────────────────────────────────
  const markRead = useCallback((id) => {
    setReadIds((prev) => {
      if (prev.has(id)) return prev
      const next = new Set(prev)
      next.add(id)
      return next
    })
  }, [])

  const markAllRead = useCallback(() => {
    setReadIds((prev) => {
      const next = new Set(prev)
      events.forEach((e) => next.add(e.id))
      return next
    })
  }, [events])

  const clearAll = useCallback(() => {
    // Remove all events from memory; also mark them all read so the
    // unread count resets.
    setReadIds((prev) => {
      const next = new Set(prev)
      events.forEach((e) => next.add(e.id))
      return next
    })
    setEvents([])
  }, [events])

  // ── Derived ──────────────────────────────────────────────
  const unreadCount = useMemo(
    () => events.reduce((acc, e) => (readIds.has(e.id) ? acc : acc + 1), 0),
    [events, readIds],
  )

  const value = useMemo(
    () => ({
      events,
      unreadCount,
      isRead: (id) => readIds.has(id),
      markRead,
      markAllRead,
      clearAll,
    }),
    [events, unreadCount, readIds, markRead, markAllRead, clearAll],
  )

  return (
    <NotificationCenterContext.Provider value={value}>
      {children}
    </NotificationCenterContext.Provider>
  )
}

export const useNotificationCenter = () => {
  const ctx = useContext(NotificationCenterContext)
  if (!ctx) {
    throw new Error('useNotificationCenter must be used inside a NotificationCenterProvider')
  }
  return ctx
}
