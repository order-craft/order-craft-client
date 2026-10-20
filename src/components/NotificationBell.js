import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { CSpinner } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import {
  cilBell,
  cilCheckCircle,
  cilClock,
  cilFire,
  cilInbox,
  cilWifiSignalOff,
} from '@coreui/icons'
import { formatDistanceToNow } from 'date-fns'
import { useSocket } from '../context/SocketContext'
import { getDateLocale } from '../helpers/dateLocale'
import translations from '../app/Language'
import './NotificationBell.css'

const TYPE_ICON = {
  new_order: cilClock,
  order_ready: cilFire,
  new_order_prep: cilClock,
  support_request: cilBell,
}

const NotificationBell = () => {
  const navigate = useNavigate()
  const t = useSelector((state) => state.language)
  const Language = translations[t]
  const dateLocale = getDateLocale(t)
  const {
    notifications,
    unreadCount,
    notifLoading,
    notifError,
    toastQueue,
    soundBlocked,
    dismissToast,
    markNotificationRead,
    markAllNotificationsRead,
    respondToSupportFromBell,
    refetchNotifications,
  } = useSocket() || {}

  const [open, setOpen] = useState(false)
  const wrapRef = useRef(null)

  useEffect(() => {
    const onClickOutside = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  // Auto-dismiss toasts after a few seconds.
  useEffect(() => {
    if (!toastQueue || toastQueue.length === 0) return undefined
    const timers = toastQueue.map((n) => setTimeout(() => dismissToast(n._id), 6000))
    return () => timers.forEach(clearTimeout)
  }, [toastQueue, dismissToast])

  const handleOpenNotification = (n) => {
    if (n.type === 'support_request') return // handled via Accept/Decline only
    if (!n.read) markNotificationRead(n._id)
    setOpen(false)
    navigate('/orders/ordersList')
  }

  const list = notifications || []

  return (
    <div className="nb-wrap" ref={wrapRef}>
      <button
        type="button"
        className="nb-trigger"
        onClick={() => setOpen((v) => !v)}
        aria-label={Language.notifications || 'Notifications'}
      >
        <CIcon icon={cilBell} size="lg" />
        {unreadCount > 0 && (
          <span className="nb-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
        )}
      </button>

      {open && (
        <div className="nb-panel">
          <div className="nb-panel-head">
            <span>{Language.notifications || 'Notifications'}</span>
            {unreadCount > 0 && (
              <button type="button" className="nb-mark-all" onClick={markAllNotificationsRead}>
                {Language.markAllRead || 'Mark all read'}
              </button>
            )}
          </div>

          <div className="nb-panel-body">
            {notifLoading && list.length === 0 ? (
              <div className="nb-state">
                <CSpinner size="sm" />
              </div>
            ) : notifError && list.length === 0 ? (
              <div className="nb-state">
                <CIcon icon={cilWifiSignalOff} />
                <span>{Language.notifLoadError || "Couldn't load notifications"}</span>
                <button type="button" className="nb-retry" onClick={refetchNotifications}>
                  {Language.retry || 'Retry'}
                </button>
              </div>
            ) : list.length === 0 ? (
              <div className="nb-state">
                <CIcon icon={cilInbox} />
                <span>{Language.noNotificationsYet || 'No notifications yet'}</span>
              </div>
            ) : (
              list.map((n) =>
                n.type === 'support_request' && !n.read ? (
                  <div key={n._id} className="nb-item nb-item-pending is-unread">
                    <span className={`nb-item-icon nb-${n.type}`}>
                      <CIcon icon={TYPE_ICON[n.type] || cilCheckCircle} />
                    </span>
                    <span className="nb-item-body">
                      <span className="nb-item-msg">{n.message}</span>
                      <span className="nb-item-time">
                        {formatDistanceToNow(new Date(n.createdAt), {
                          addSuffix: true,
                          locale: dateLocale,
                        })}
                      </span>
                      <span className="nb-item-actions">
                        <button
                          type="button"
                          className="nb-action nb-action-accept"
                          onClick={() => respondToSupportFromBell(n, true)}
                        >
                          {Language.accept || 'Accept'}
                        </button>
                        <button
                          type="button"
                          className="nb-action nb-action-decline"
                          onClick={() => respondToSupportFromBell(n, false)}
                        >
                          {Language.decline || 'Decline'}
                        </button>
                      </span>
                    </span>
                  </div>
                ) : (
                  <button
                    type="button"
                    key={n._id}
                    className={`nb-item ${n.read ? '' : 'is-unread'}`}
                    onClick={() => handleOpenNotification(n)}
                  >
                    <span className={`nb-item-icon nb-${n.type}`}>
                      <CIcon icon={TYPE_ICON[n.type] || cilCheckCircle} />
                    </span>
                    <span className="nb-item-body">
                      <span className="nb-item-msg">{n.message}</span>
                      <span className="nb-item-time">
                        {formatDistanceToNow(new Date(n.createdAt), {
                          addSuffix: true,
                          locale: dateLocale,
                        })}
                      </span>
                    </span>
                    {!n.read && <span className="nb-dot" />}
                  </button>
                ),
              )
            )}
          </div>
        </div>
      )}

      {soundBlocked && (
        <div className="nb-toasts">
          <div className="nb-toast nb-sound-blocked" role="status">
            <CIcon icon={cilBell} className="me-2" />
            <span>
              {Language.soundBlockedHint ||
                'Click anywhere on the page to enable notification sounds'}
            </span>
          </div>
        </div>
      )}

      {/* Toasts for new live events */}
      <div className="nb-toasts">
        {(toastQueue || []).map((n) => (
          <div
            key={n._id}
            className={`nb-toast nb-${n.type}`}
            role="button"
            tabIndex={0}
            onClick={() => {
              dismissToast(n._id)
              handleOpenNotification(n)
            }}
          >
            <CIcon icon={TYPE_ICON[n.type] || cilCheckCircle} className="me-2" />
            <span>{n.message}</span>
            <button
              type="button"
              className="nb-toast-close"
              onClick={(e) => {
                e.stopPropagation()
                dismissToast(n._id)
              }}
              aria-label="Dismiss"
            >
              &times;
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

export default NotificationBell
