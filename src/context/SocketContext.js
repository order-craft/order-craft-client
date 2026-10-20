// src/context/SocketContext.js
import React, { createContext, useContext, useEffect, useRef, useState } from 'react'
import { io } from 'socket.io-client'
import axios from 'axios'
import { BaseUrl } from '../helpers/BaseUrl'
import { GetToken } from '../helpers/GetToken'
import PropTypes from 'prop-types'
const SocketContext = createContext()

export const SocketProvider = ({ children }) => {
  // SocketProvider mounts once at the absolute app root (see index.js),
  // above AuthProvider and the Router, and is never re-rendered by a
  // same-tab login/logout (those only re-render their own descendants).
  // Reading GetToken() as a plain variable here — like the rest of this
  // app does inside route components — would freeze `token` at whatever
  // it was on first paint: null for the very common case of a user who
  // isn't already logged in when the page loads. That froze socket
  // connection + REST calls to an empty token forever, so notifications
  // (and their sound) silently never worked for anyone who logs in
  // normally instead of reloading an already-authenticated tab — the
  // actual cause behind "sound stopped working". `oc:auth-token-changed`
  // is dispatched by AuthContext right after login/logout.
  const [token, setToken] = useState(() => GetToken())
  useEffect(() => {
    const syncToken = () => setToken(GetToken())
    window.addEventListener('oc:auth-token-changed', syncToken)
    return () => {
      window.removeEventListener('oc:auth-token-changed', syncToken)
    }
    // Deliberately NOT listening to the cross-tab "storage" event: `token`
    // lives in plain localStorage (shared by every tab of this origin), so
    // reacting to it here would reconnect THIS tab's socket under whatever
    // account last logged in on ANY tab — e.g. an admin tab and a staff
    // tab open side by side on the same browser (a real shared-till setup)
    // would otherwise fight over the connection and drop live events in
    // the churn. Same-tab login/logout (the actual bug) is covered above.
  }, [])

  const [supportRequests, setSupportRequests] = useState([])
  const [activeTable, setActiveTable] = useState(null)
  const [activeSupportRequest, setActiveSupportRequest] = useState(null)
  const [RequestTypeName, setRequestTypeName] = useState('')

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [ringtone, setRingtone] = useState(null)

  // ---- Order notifications (new order / order ready for assigned tables) ----
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [notifLoading, setNotifLoading] = useState(false)
  const [notifError, setNotifError] = useState(false)
  const [toastQueue, setToastQueue] = useState([])
  const [soundBlocked, setSoundBlocked] = useState(false)
  const seenNotifIds = useRef(new Set())
  const audioUnlockedRef = useRef(false)
  const notificationsRef = useRef([])
  useEffect(() => {
    notificationsRef.current = notifications
  }, [notifications])

  // Browsers block audio with sound until the page has seen a real user
  // gesture (click/keydown/touch). Prime a muted play on the first one so
  // the first real notification sound isn't silently dropped.
  useEffect(() => {
    const unlock = () => {
      if (audioUnlockedRef.current) return
      const probe = new Audio('/newOrder.mp3')
      probe.volume = 0
      probe
        .play()
        .then(() => {
          probe.pause()
          probe.currentTime = 0
          audioUnlockedRef.current = true
          setSoundBlocked(false)
        })
        .catch(() => {})
    }
    document.addEventListener('click', unlock)
    document.addEventListener('keydown', unlock)
    document.addEventListener('touchstart', unlock)
    return () => {
      document.removeEventListener('click', unlock)
      document.removeEventListener('keydown', unlock)
      document.removeEventListener('touchstart', unlock)
    }
  }, [])

  // Single place that actually plays a notification sound, so new_order and
  // order_ready can't double-fire for the same event and every caller gets
  // the same autoplay-policy handling (surfaced, not swallowed).
  const playNotificationSound = (src) => {
    const audio = new Audio(src)
    audio.volume = 1
    audio.play().then(
      () => {
        audioUnlockedRef.current = true
      },
      (err) => {
        if (err && err.name === 'NotAllowedError') {
          console.warn('[SocketContext] Notification sound blocked by autoplay policy:', err)
          setSoundBlocked(true)
        } else {
          console.error('[SocketContext] Notification sound failed to play:', err)
        }
      },
    )
  }

  // Created fresh whenever `token` actually changes (login, logout, or a
  // different account), instead of once ever — a stale pre-login socket
  // would otherwise sit connected with no auth and never reconnect.
  const [socket, setSocket] = useState(null)
  useEffect(() => {
    if (!token) {
      setSocket(null)
      return undefined
    }
    const s = io(BaseUrl, { auth: { token } })
    setSocket(s)
    return () => {
      s.disconnect()
    }
  }, [token])

  // Recover anything missed while disconnected / before this page loaded.
  const fetchNotifications = async () => {
    if (!token) return
    setNotifLoading(true)
    setNotifError(false)
    try {
      const res = await axios.get(`${BaseUrl}/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const list = res.data.notifications || []
      list.forEach((n) => seenNotifIds.current.add(n._id))
      setNotifications(list)
      setUnreadCount(res.data.unreadCount || 0)
    } catch (err) {
      console.error('Failed to fetch notifications:', err)
      setNotifError(true)
    } finally {
      setNotifLoading(false)
    }
  }

  useEffect(() => {
    fetchNotifications()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  useEffect(() => {
    if (!socket) return undefined
    socket.on('supportNotification', (data) => {
      setSupportRequests((prevRequests) => [...prevRequests, data.tableNumber])
      setActiveTable(data.tableNumber)
      setActiveSupportRequest(data.supportId)
      setRequestTypeName(data.requestTypeName)
      setIsModalOpen(true)
      playRingtone()
    })

    socket.on('callAnswered', (data) => {
      if (data.tableNumber === activeTable) {
        stopRingtone()
        setIsModalOpen(false)
        setSupportRequests((prevRequests) =>
          prevRequests.filter((tableNumber) => tableNumber !== data.tableNumber),
        )
      }
      // Clear the matching bell item (if any) for whoever else had it
      // pending too (e.g. admin + assigned server both notified), so it
      // stops showing as unresolved once it's been accepted.
      const hadUnread = notificationsRef.current.some(
        (n) => n.support === data.supportId && !n.read,
      )
      if (hadUnread) {
        setNotifications((prev) =>
          prev.map((n) => (n.support === data.supportId ? { ...n, read: true } : n)),
        )
        setUnreadCount((prev) => Math.max(0, prev - 1))
      }
    })

    // New order / order ready for one of my assigned tables. Deduped by _id
    // so a reconnect + refetch never double-counts an event already pushed
    // live, and a retried emit can't double-insert either.
    socket.on('notification:new', (data) => {
      if (seenNotifIds.current.has(data._id)) return
      seenNotifIds.current.add(data._id)
      setNotifications((prev) => [data, ...prev])
      setUnreadCount((prev) => prev + 1)
      setToastQueue((prev) => [...prev, data])
      // Targeted notifications (assigned server, new order or ready; prep
      // staff's new-order heads-up) all get sound here, including outside
      // Order Management. OrdersList's own newOrder sound skips itself when
      // this is the same recipient (viewScope === 'mine' / isMyAssignedTable)
      // to avoid a double chime. support_request already gets the looping
      // ringtone from the 'supportNotification' event below — skip the
      // order chime here so the two don't overlap.
      if (data.type !== 'support_request') {
        playNotificationSound('/newOrder.mp3')
      }
    })

    // On reconnect (network blip, laptop sleep, etc.) recover anything the
    // socket missed while disconnected.
    socket.on('connect', () => {
      fetchNotifications()
    })

    return () => {
      socket.off('supportNotification')
      socket.off('callAnswered')
      socket.off('notification:new')
      socket.off('connect')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, activeTable])

  const playRingtone = () => {
    const audio = new Audio('/ringtone.mp3')
    audio.loop = true
    audio.play().then(
      () => {
        audioUnlockedRef.current = true
      },
      (err) => {
        if (err && err.name === 'NotAllowedError') {
          console.warn('[SocketContext] Support ringtone blocked by autoplay policy:', err)
          setSoundBlocked(true)
        }
      },
    )
    setRingtone(audio)
  }

  // Lets other sound sources outside this context (OrdersList's own
  // broadcast new-order chime) surface a blocked autoplay into the same
  // shared "click to enable sound" banner, instead of only logging it.
  const reportSoundBlocked = () => setSoundBlocked(true)

  const stopRingtone = () => {
    if (ringtone) {
      ringtone.pause()
      ringtone.currentTime = 0
    }
  }

  const handleAnswerCall = () => {
    stopRingtone()
    setIsModalOpen(false)
    console.log(activeSupportRequest)
    socket?.emit('supportCallAnswered', {
      tableNumber: activeTable,
      supportId: activeSupportRequest,
    })
  }

  const handleDismissCall = () => {
    stopRingtone()
    setIsModalOpen(false)
    socket?.emit('supportRequestDeclined', {
      tableNumber: activeTable,
      supportId: activeSupportRequest,
    })
  }

  // Accept/decline a support_request notification straight from the bell,
  // without needing the (single, modal-driven) activeTable/activeSupportRequest
  // state — the bell can have several pending support requests at once.
  // Accepting notifies the customer exactly like the modal's Answer button
  // (same supportCallAnswered emit); declining just marks it read locally,
  // same as the modal's Dismiss (no customer-facing effect either way).
  const respondToSupportFromBell = (notification, accepted) => {
    if (notification?.support) {
      socket?.emit(accepted ? 'supportCallAnswered' : 'supportRequestDeclined', {
        tableNumber: notification.tableNumber,
        supportId: notification.support,
      })
    }
    markNotificationRead(notification._id)
  }

  const markNotificationRead = async (id) => {
    setNotifications((prev) => prev.map((n) => (n._id === id ? { ...n, read: true } : n)))
    setUnreadCount((prev) => Math.max(0, prev - 1))
    try {
      await axios.patch(
        `${BaseUrl}/notifications/${id}/read`,
        {},
        { headers: { Authorization: `Bearer ${token}` } },
      )
    } catch (err) {
      console.error('Failed to mark notification read:', err)
    }
  }

  const markAllNotificationsRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    setUnreadCount(0)
    try {
      await axios.patch(
        `${BaseUrl}/notifications/read-all`,
        {},
        { headers: { Authorization: `Bearer ${token}` } },
      )
    } catch (err) {
      console.error('Failed to mark all notifications read:', err)
    }
  }

  const dismissToast = (id) => {
    setToastQueue((prev) => prev.filter((t) => t._id !== id))
  }

  return (
    <SocketContext.Provider
      value={{
        supportRequests,
        isModalOpen,
        activeTable,
        RequestTypeName,
        handleAnswerCall,
        handleDismissCall,
        notifications,
        unreadCount,
        notifLoading,
        notifError,
        toastQueue,
        soundBlocked,
        reportSoundBlocked,
        dismissToast,
        markNotificationRead,
        markAllNotificationsRead,
        respondToSupportFromBell,
        refetchNotifications: fetchNotifications,
      }}
    >
      {children}
    </SocketContext.Provider>
  )
}
SocketProvider.propTypes = {
  children: PropTypes.node.isRequired,
}

export const useSocket = () => useContext(SocketContext)
