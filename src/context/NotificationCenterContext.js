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
import { useSelector } from 'react-redux'
import { BaseUrl } from '../helpers/BaseUrl'
import { GetToken } from '../helpers/GetToken'
import { useToast } from '../components/toast/ToastProvider'
import translations from '../app/Language'

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
      playSound: payload.playSound !== false,
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
      playSound: payload.playSound !== false,
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
      playSound: payload.playSound !== false,
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
      playSound: payload.playSound !== false,
      raw: payload,
    }
  }

  if (eventName === 'deleteOrder') {
    const orderId = typeof payload === 'string' ? payload : payload._id || payload.orderId
    if (!orderId) return null
    return {
      id,
      type: 'deleteOrder',
      orderId,
      createdAt: Date.now(),
      playSound: false, // never ring on delete
      raw: payload,
    }
  }

  if (eventName === 'orderUpdated') {
    const status = payload.status
    if (!status) return null
    return {
      id,
      type: 'statusChange',
      orderId: payload._id,
      status,
      tableNumber: payload.table?.number || null,
      createdAt: Date.now(),
      playSound: payload.playSound !== false,
      raw: payload,
    }
  }

  return null
}

const buildToastMessage = (event, Language) => {
  if (event.type === 'newOrder') {
    const label = event.tableNumber
      ? `${Language.table || 'Table'} ${event.tableNumber}`
      : event.orderType === 'to-go'
        ? Language.togo || 'To-go'
        : Language.delivery || 'Delivery'
    return `${Language.notificationsNewOrder || 'New order'} · ${label}`
  }
  if (event.type === 'orderReady') {
    const label = event.tableNumber ? ` · ${Language.table || 'Table'} ${event.tableNumber}` : ''
    return `${Language.notificationsOrderReady || 'Order ready'}${label}`
  }
  if (event.type === 'orderDelivered') {
    const label = event.tableNumber ? ` · ${Language.table || 'Table'} ${event.tableNumber}` : ''
    return `${Language.notificationsOrderDelivered || 'Order delivered'}${label}`
  }
  if (event.type === 'support') {
    const label = event.tableNumber ? ` · ${Language.table || 'Table'} ${event.tableNumber}` : ''
    const req = event.requestTypeName ? ` (${event.requestTypeName})` : ''
    return `${Language.notificationsSupport || 'Support call'}${label}${req}`
  }
  if (event.type === 'deleteOrder') {
    return Language.notificationsDeleteOrder || 'Order deleted'
  }
  // Skip generic status changes — ready/delivered deserve the toast.
  return null
}

// Which event types deserve a ring. Support and new order are the loudest;
// ready/delivered are shorter cues. Delete never rings.
const SHOULD_RING = {
  newOrder: true,
  orderReady: true,
  orderDelivered: true,
  support: true,
  deleteOrder: false,
  statusChange: false,
}

export const NotificationCenterProvider = ({ children }) => {
  const [events, setEvents] = useState([])
  const [readIds, setReadIds] = useState(() => readReadIds())
  const socketRef = useRef(null)
  const audioRef = useRef(null)
  const token = GetToken()

  const { showToast } = useToast()
  const t = useSelector((state) => state.language)
  const Language = translations[t]

  // ── Ringtone ─────────────────────────────────────────────
  const stopRingtone = useCallback(() => {
    if (audioRef.current) {
      try {
        audioRef.current.pause()
        audioRef.current.currentTime = 0
      } catch {
        /* ignore */
      }
      audioRef.current = null
    }
  }, [])

  const playRingtone = useCallback(() => {
    stopRingtone()
    try {
      const audio = new Audio('/newOrder.mp3')
      audio.loop = false
      audio.play().catch(() => {})
      audioRef.current = audio
    } catch {
      /* ignore */
    }
  }, [stopRingtone])

  // Stop the ringtone on unmount so it doesn't linger across logout.
  useEffect(() => {
    return () => stopRingtone()
  }, [stopRingtone])

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

      // ── Toast anywhere in the app ────────────────────────
      // Muting is honored: `playSound === false` suppresses both toast and
      // ring (the bell still records the event).
      if (event.playSound) {
        const message = buildToastMessage(event, Language)
        if (message) {
          const tone =
            event.type === 'support'
              ? 'warning'
              : event.type === 'deleteOrder'
                ? 'danger'
                : event.type === 'orderDelivered'
                  ? 'success'
                  : 'info'
          showToast(message, tone)
        }
      }

      // ── Ringtone anywhere in the app ─────────────────────
      if (event.playSound && SHOULD_RING[event.type]) {
        playRingtone()
      }
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
      stopRingtone()
    }
  }, [token, showToast, Language, playRingtone, stopRingtone])

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
    stopRingtone()
    setReadIds((prev) => {
      const next = new Set(prev)
      events.forEach((e) => next.add(e.id))
      return next
    })
    setEvents([])
  }, [events, stopRingtone])

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
      // Exposed so any page can stop the ring on an acknowledged action.
      stopRingtone,
    }),
    [events, unreadCount, readIds, markRead, markAllRead, clearAll, stopRingtone],
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
