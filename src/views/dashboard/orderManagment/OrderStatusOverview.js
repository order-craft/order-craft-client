import React, { useEffect, useMemo, useState } from 'react'
import { CButton, CSpinner } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import {
  cilClock,
  cilFire,
  cilCheckCircle,
  cilInfo,
  cilListRich,
  cilReload,
  cilWarning,
} from '@coreui/icons'
import axios from 'axios'
import { io } from 'socket.io-client'
import { BaseUrl } from '../../../helpers/BaseUrl'
import { GetToken } from '../../../helpers/GetToken'
import { useSelector } from 'react-redux'
import translations from '../../../app/Language'
import './orderManagement.css'

/* ---------- helpers ---------- */
const convertMinutesToDHM = (minutes) => {
  const m = Number(minutes) || 0
  const days = Math.floor(m / (24 * 60))
  const hours = Math.floor((m % (24 * 60)) / 60)
  const mins = m % 60
  const parts = []
  if (days > 0) parts.push(`${days}d`)
  if (hours > 0) parts.push(`${hours}h`)
  if (mins > 0 || parts.length === 0) parts.push(`${mins}m`)
  return parts.join(' ')
}

const STATUS_TONES = {
  pending: {
    pill: { background: '#fff3cd', color: '#664d03' },
    bar: '#d97706',
    icon: cilClock,
  },
  preparing: {
    pill: { background: '#cff4fc', color: '#055160' },
    bar: '#0891b2',
    icon: cilFire,
  },
  completed: {
    pill: { background: '#d1e7dd', color: '#0f5132' },
    bar: '#198754',
    icon: cilCheckCircle,
  },
  default: {
    pill: { background: '#e2e3e5', color: '#41464b' },
    bar: '#6c757d',
    icon: cilInfo,
  },
}

/* ---------- main ---------- */
const OrderStatusOverview = () => {
  const token = GetToken()
  const t = useSelector((state) => state.language)
  const Language = translations[t]

  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeKey, setActiveKey] = useState(1)
  const [filterOption, setFilterOption] = useState('today')
  const [statusFlowEnabled, setStatusFlowEnabled] = useState(true)

  /* ---------- data ---------- */
  const fetchOrders = async () => {
    setLoading(true)
    try {
      const response = await axios.get(`${BaseUrl}/order/orders/ordersfifo`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setOrders(response.data.orders || [])
      if (typeof response.data.statusFlowEnabled === 'boolean') {
        setStatusFlowEnabled(response.data.statusFlowEnabled)
      }
    } catch (error) {
      console.error('Failed to fetch orders:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOrders()
    const socket = io(BaseUrl, { auth: { token } })
    socket.on('newOrder', fetchOrders)
    socket.on('orderUpdated', fetchOrders)
    socket.on('tenantConfigChanged', (cfg) => {
      setStatusFlowEnabled(cfg.statusFlowEnabled !== false)
      fetchOrders()
    })
    return () => socket.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* ---------- filters ---------- */
  const filteredOrders = useMemo(() => {
    if (filterOption === 'all') return orders
    const now = new Date()
    const today = new Date(now)
    today.setHours(0, 0, 0, 0)
    const weekStart = new Date(today)
    weekStart.setDate(today.getDate() - today.getDay())
    return orders.filter((order) => {
      const raw = order.timestamp || order.createdAt
      if (!raw) return false
      const d = new Date(raw)
      if (filterOption === 'today') return d >= today
      if (filterOption === 'thisWeek') return d >= weekStart
      return true
    })
  }, [orders, filterOption])

  const pendingOrders = useMemo(
    () => filteredOrders.filter((o) => o.status === 'pending'),
    [filteredOrders],
  )
  const preparingOrders = useMemo(
    () => filteredOrders.filter((o) => o.status === 'preparing'),
    [filteredOrders],
  )
  const completedOrders = useMemo(
    () => filteredOrders.filter((o) => o.status === 'completed'),
    [filteredOrders],
  )

  /* ---------- tab visibility (respect flow) ---------- */
  const tabs = useMemo(() => {
    const list = []
    if (statusFlowEnabled || pendingOrders.length > 0) {
      list.push({
        key: 1,
        icon: cilClock,
        label: Language.pending || 'Pending',
        count: pendingOrders.length,
      })
    }
    if (statusFlowEnabled || preparingOrders.length > 0) {
      list.push({
        key: 2,
        icon: cilFire,
        label: Language.preparing || 'Preparing',
        count: preparingOrders.length,
      })
    }
    list.push({
      key: 3,
      icon: cilCheckCircle,
      label: statusFlowEnabled ? Language.completed || 'Completed' : Language.placed || 'Placed',
      count: completedOrders.length,
    })
    return list
  }, [
    statusFlowEnabled,
    pendingOrders.length,
    preparingOrders.length,
    completedOrders.length,
    Language,
  ])

  const safeActiveKey = tabs.some((t) => t.key === activeKey) ? activeKey : tabs[0]?.key || 3

  const visibleOrders =
    safeActiveKey === 1 ? pendingOrders : safeActiveKey === 2 ? preparingOrders : completedOrders

  /* ---------- render order card ---------- */
  const renderOrderCard = (order) => {
    const products = order.products || []
    const totalPrice = products
      .reduce((sum, p) => {
        const price = Number(p.product?.price) || 0
        const qty = Number(p.quantity) || 0
        return sum + price * qty
      }, 0)
      .toFixed(2)

    const tone = STATUS_TONES[order.status] || STATUS_TONES.default
    const StatusIcon = tone.icon
    const timestamp = order.timestamp || order.createdAt

    return (
      <div className="om-order" key={order._id}>
        <div className="om-order-head">
          <div className="om-order-head-left">
            <div className="om-order-title">
              <CIcon icon={cilListRich} />
              {order.table
                ? `${Language.Table || 'Table'} ${order.table.number}`
                : `${Language.order || 'Order'} #${order.orderNumber ?? '—'}`}
            </div>
            <div className="om-order-meta">
              <span
                className="om-pill"
                style={{
                  background: tone.pill.background,
                  color: tone.pill.color,
                }}
              >
                <CIcon icon={StatusIcon} />
                {order.status === 'pending'
                  ? Language.pending || 'Pending'
                  : order.status === 'preparing'
                    ? Language.preparing || 'Preparing'
                    : statusFlowEnabled
                      ? Language.completed || 'Completed'
                      : Language.placed || 'Placed'}
              </span>
              {order.orderNumber && order.table && <span>· #{order.orderNumber}</span>}
              {timestamp && <span>· {new Date(timestamp).toLocaleTimeString()}</span>}
            </div>
          </div>
          <div className="om-order-price">
            {totalPrice} <span className="unit">TND</span>
          </div>
        </div>

        <div className="om-order-items">
          {products.map((p, i) => {
            const price = Number(p.product?.price) || 0
            const qty = Number(p.quantity) || 0
            return (
              <div className="om-item-row" key={i}>
                <div className="om-item-name">
                  <span className="fw-medium">{p.product?.name || 'Item'}</span>
                  {p.notes && (
                    <div className="om-item-note">
                      <CIcon icon={cilInfo} />
                      {p.notes}
                    </div>
                  )}
                </div>
                <div className="om-item-qty">×{qty}</div>
                <div className="om-item-total">{(price * qty).toFixed(2)} TND</div>
              </div>
            )
          })}
        </div>

        {statusFlowEnabled && order.statusDurations && (
          <div className="om-durations">
            <div className="om-durations-title">
              <CIcon icon={cilClock} />
              {Language.TimeSpent || 'Time spent'}
            </div>
            {Object.entries(order.statusDurations).map(([status, duration]) => {
              const minutes = Math.floor((Number(duration) || 0) / 60000)
              const pct = Math.min((minutes / 120) * 100, 100)
              const sTone = STATUS_TONES[status] || STATUS_TONES.default
              return (
                <div className="om-duration-row" key={status}>
                  <span className="om-duration-label">{status}</span>
                  <div className="om-bar-track">
                    <div
                      className="om-bar-fill"
                      style={{
                        width: `${pct}%`,
                        background: sTone.bar,
                      }}
                    />
                  </div>
                  <span className="om-duration-value">{convertMinutesToDHM(minutes)}</span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  /* ---------- render ---------- */
  return (
    <div className="om-card">
      {/* ---------- Header ---------- */}
      <div className="om-card-header">
        <div className="om-card-header-left">
          <h5 className="om-card-title">
            <CIcon icon={cilListRich} />
            {Language.OrderStatusOverview || 'Order status overview'}
          </h5>
          <div className="om-card-subtitle">
            <strong>{filteredOrders.length}</strong>{' '}
            {filteredOrders.length === 1 ? 'order' : 'orders'} ·{' '}
            {pendingOrders.length + preparingOrders.length} active
          </div>
        </div>

        <div className="om-card-header-right">
          <div className="om-segments" role="tablist">
            {[
              { key: 'today', label: Language.Today || 'Today' },
              { key: 'thisWeek', label: Language.ThisWeek || 'This week' },
              { key: 'all', label: Language.AllTime || 'All time' },
            ].map((p) => (
              <button
                key={p.key}
                type="button"
                className={`om-segment ${filterOption === p.key ? 'is-active' : ''}`}
                onClick={() => setFilterOption(p.key)}
              >
                {p.label}
              </button>
            ))}
          </div>
          <CButton
            color="secondary"
            variant="outline"
            onClick={fetchOrders}
            disabled={loading}
            aria-label={Language.Refresh || 'Refresh'}
          >
            <CIcon icon={cilReload} />
          </CButton>
        </div>
      </div>

      {/* ---------- Tabs ---------- */}
      <div className="om-tabs" role="tablist">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={`om-tab ${safeActiveKey === tab.key ? 'is-active' : ''}`}
            onClick={() => setActiveKey(tab.key)}
          >
            <CIcon icon={tab.icon} />
            {tab.label}
            <span className="om-tab-count">{tab.count}</span>
          </button>
        ))}
      </div>

      {/* ---------- Body ---------- */}
      {loading && orders.length === 0 ? (
        <div className="om-skeleton">
          <div className="om-skeleton-block" />
          <div className="om-skeleton-block" />
        </div>
      ) : visibleOrders.length === 0 ? (
        <div className="om-empty">
          <CIcon icon={safeActiveKey === 3 ? cilCheckCircle : cilWarning} size="xl" />
          <div className="om-empty-title">
            {safeActiveKey === 1
              ? Language.Nopendingordersatthemoment || 'No pending orders right now'
              : safeActiveKey === 2
                ? Language.Noordersbeingpreparedcurrently || 'Nothing being prepared'
                : Language.Nocompletedordersintheselectedtimeframe ||
                  'No completed orders in this range'}
          </div>
          <div className="om-empty-body">
            {Language.ordersTabHint || 'New orders will appear here automatically.'}
          </div>
        </div>
      ) : (
        <div className="om-orders-list">{visibleOrders.map(renderOrderCard)}</div>
      )}
    </div>
  )
}

export default OrderStatusOverview
