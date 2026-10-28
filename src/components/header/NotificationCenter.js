import React, { useMemo, useState } from 'react'
import { CDropdown, CDropdownMenu, CDropdownToggle } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import {
  cilBell,
  cilInbox,
  cilCheckCircle,
  cilTrash,
  cilPeople,
  cilArrowRight,
} from '@coreui/icons'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import translations from '../../app/Language'
import { useNotificationCenter } from '../../context/NotificationCenterContext'
import './NotificationCenter.css'

const relativeTime = (ts, Language) => {
  const diff = Date.now() - ts
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return Language.notificationsJustNow || 'just now'
  if (mins < 60) return `${mins} ${Language.notificationsMinutesAgo || 'min ago'}`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} ${Language.notificationsHoursAgo || 'h ago'}`
  const days = Math.floor(hours / 24)
  return `${days}d`
}

const NotificationCenter = () => {
  const t = useSelector((state) => state.language)
  const Language = translations[t]
  const { events, unreadCount, isRead, markRead, markAllRead, clearAll } = useNotificationCenter()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  const renderIcon = (type) => {
    switch (type) {
      case 'newOrder':
        return <CIcon icon={cilInbox} />
      case 'orderReady':
        return <CIcon icon={cilCheckCircle} />
      case 'orderDelivered':
        return <CIcon icon={cilCheckCircle} />
      case 'support':
        return <CIcon icon={cilPeople} />
      case 'deleteOrder':
        return <CIcon icon={cilTrash} />
      case 'statusChange':
        return <CIcon icon={cilBell} />
      default:
        return <CIcon icon={cilBell} />
    }
  }

  const renderTitle = (e) => {
    if (e.type === 'newOrder') {
      const label = e.tableNumber
        ? `${Language.table || 'Table'} ${e.tableNumber}`
        : e.orderType === 'to-go'
          ? Language.togo || 'To-go'
          : Language.delivery || 'Delivery'
      return `${Language.notificationsNewOrder || 'New order'} · ${label}`
    }
    if (e.type === 'orderReady') {
      const label = e.tableNumber ? `${Language.table || 'Table'} ${e.tableNumber}` : ''
      return `${Language.notificationsOrderReady || 'Order ready'}${label ? ` · ${label}` : ''}`
    }
    if (e.type === 'orderDelivered') {
      const label = e.tableNumber ? `${Language.table || 'Table'} ${e.tableNumber}` : ''
      return `${Language.notificationsOrderDelivered || 'Order delivered'}${
        label ? ` · ${label}` : ''
      }`
    }
    if (e.type === 'support') {
      const label = e.tableNumber ? `${Language.table || 'Table'} ${e.tableNumber}` : ''
      return `${Language.notificationsSupport || 'Support call'}${label ? ` · ${label}` : ''}`
    }
    if (e.type === 'deleteOrder') {
      return Language.notificationsDeleteOrder || 'Order deleted'
    }
    if (e.type === 'statusChange') {
      return `${Language.notificationsStatusChange || 'Order updated'} → ${e.status}`
    }
    return 'Notification'
  }

  const handleClick = (e) => {
    markRead(e.id)
    setOpen(false)
    if (e.type === 'support') {
      // Support calls live on their own screen
      navigate('/support')
      return
    }
    if (e.orderId) {
      // Navigate to the orders list; it can deep-link later if you want.
      navigate('/orders/ordersList')
    }
  }

  const sorted = useMemo(
    () => [...events].sort((a, b) => b.createdAt - a.createdAt).slice(0, 20),
    [events],
  )

  return (
    <CDropdown
      variant="nav-item"
      placement="bottom-end"
      visible={open}
      onShow={() => setOpen(true)}
      onHide={() => setOpen(false)}
    >
      <CDropdownToggle
        caret={false}
        className="app-header-bell"
        aria-label={Language.notifications || 'Notifications'}
      >
        <CIcon icon={cilBell} size="lg" />
        {unreadCount > 0 && (
          <span className="app-header-bell-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
        )}
      </CDropdownToggle>

      <CDropdownMenu className="app-header-bell-menu">
        <div className="app-header-bell-header">
          <span className="app-header-bell-title">{Language.notifications || 'Notifications'}</span>
          {events.length > 0 && (
            <div className="app-header-bell-header-actions">
              <button
                type="button"
                className="app-header-bell-link"
                onClick={() => {
                  markAllRead()
                }}
              >
                {Language.notificationsMarkAllRead || 'Mark all as read'}
              </button>
              <button
                type="button"
                className="app-header-bell-link is-muted"
                onClick={() => {
                  clearAll()
                }}
              >
                {Language.notificationsClear || 'Clear'}
              </button>
            </div>
          )}
        </div>

        {sorted.length === 0 ? (
          <div className="app-header-bell-empty">
            <CIcon icon={cilBell} size="lg" />
            <div className="app-header-bell-empty-title">
              {Language.notificationsEmpty || 'No notifications yet'}
            </div>
            <div className="app-header-bell-empty-hint">
              {Language.notificationsEmptyHint ||
                "You'll see new orders, ready orders, and support calls here."}
            </div>
          </div>
        ) : (
          <div className="app-header-bell-list">
            {sorted.map((e) => {
              const read = isRead(e.id)
              return (
                <button
                  key={e.id}
                  type="button"
                  className={`app-header-bell-item ${read ? 'is-read' : ''}`}
                  onClick={() => handleClick(e)}
                >
                  <span className="app-header-bell-icon">{renderIcon(e.type)}</span>
                  <span className="app-header-bell-text">
                    <span className="app-header-bell-item-title">{renderTitle(e)}</span>
                    <span className="app-header-bell-item-time">
                      {relativeTime(e.createdAt, Language)}
                    </span>
                  </span>
                  {!read && <span className="app-header-bell-dot" />}
                  <CIcon icon={cilArrowRight} className="app-header-bell-chev" />
                </button>
              )
            })}
          </div>
        )}
      </CDropdownMenu>
    </CDropdown>
  )
}

export default NotificationCenter
