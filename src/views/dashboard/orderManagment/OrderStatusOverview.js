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
import { useAuth } from '../../../context/AuthContext'

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
// ─────────────────────────────────────────────────────────────
// Flow helpers (kept in sync with OrdersList.js and the backend)
// ─────────────────────────────────────────────────────────────
const ACTIVE_TABS_BY_FLOW = {
  'two-step': ['placed'],
  'three-step': ['pending', 'preparing', 'completed'],
  'four-step': ['pending', 'preparing', 'ready', 'delivered'],
  'delivery-only': ['placed', 'delivered'],
}

const buildTabStatuses = (flow, orders) => {
  const wanted = new Set(ACTIVE_TABS_BY_FLOW[flow] || ['pending', 'preparing', 'completed'])
  ;(orders || []).forEach((o) => {
    if (o.status && o.status !== 'archived') wanted.add(o.status)
  })
  const order = ['placed', 'pending', 'preparing', 'ready', 'delivered', 'completed']
  return order.filter((s) => wanted.has(s))
}

const flowForOrder = (order, tenantFlow) => {
  if (order?.flowAtCreation) return order.flowAtCreation
  if (['pending', 'preparing', 'ready'].includes(order?.status)) {
    return order.status === 'ready' ? 'four-step' : 'three-step'
  }
  if (order?.status === 'completed') return 'three-step'
  if (order?.status === 'delivered') return 'delivery-only'
  if (order?.status === 'placed') return 'two-step'
  return tenantFlow || 'three-step'
}

const nextActionsFor = (order, role, tenantFlow) => {
  const flow = flowForOrder(order, tenantFlow)
  const s = order.status
  const actions = []
  const isPrep = role === 'preparer' || role === 'both' || role === 'superClient'
  const isDel = role === 'deliverer' || role === 'both' || role === 'superClient'

  if (flow === 'three-step') {
    if (s === 'pending' && isPrep) actions.push({ to: 'preparing' })
    if (s === 'preparing' && isPrep) actions.push({ to: 'completed' })
  } else if (flow === 'four-step') {
    if (s === 'pending' && isPrep) actions.push({ to: 'preparing' })
    if (s === 'preparing' && isPrep) actions.push({ to: 'ready' })
    if (s === 'ready' && isDel) actions.push({ to: 'delivered' })
  } else if (flow === 'delivery-only') {
    if (s === 'placed' && isDel) actions.push({ to: 'delivered' })
  }
  return actions
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
  ready: {
    pill: { background: '#dcfce7', color: '#14532d' },
    bar: '#16a34a',
    icon: cilCheckCircle,
  },
  delivered: {
    pill: { background: '#d1fae5', color: '#064e3b' },
    bar: '#059669',
    icon: cilCheckCircle,
  },
  placed: {
    pill: { background: '#cfe2ff', color: '#084298' },
    bar: '#0d6efd',
    icon: cilClock,
  },
}

/* ---------- main ---------- */
const OrderStatusOverview = () => {
  const token = GetToken()
  const t = useSelector((state) => state.language)
  const Language = translations[t]
  const { role, staffRole, orderFlow } = useAuth()
  const effectiveRole = role === 'superClient' ? 'superClient' : staffRole || 'both'
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
    const tenantFlow = orderFlow || (statusFlowEnabled ? 'three-step' : 'two-step')
    const statuses = buildTabStatuses(tenantFlow, filteredOrders)

    const iconFor = (s) => {
      if (s === 'pending' || s === 'placed') return cilClock
      if (s === 'preparing') return cilFire
      return cilCheckCircle
    }
    const labelFor = (s) => {
      if (s === 'placed') return Language.placed || 'Placed'
      if (s === 'pending') return Language.pending || 'Pending'
      if (s === 'preparing') return Language.preparing || 'Preparing'
      if (s === 'ready') return Language.ready || 'Ready'
      if (s === 'delivered') return Language.delivered || 'Delivered'
      if (s === 'completed')
        return statusFlowEnabled ? Language.completed || 'Completed' : Language.placed || 'Placed'
      return s
    }

    return statuses.map((status, idx) => ({
      key: idx + 1,
      status,
      icon: iconFor(status),
      label: labelFor(status),
      count: filteredOrders.filter((o) => o.status === status).length,
    }))
  }, [statusFlowEnabled, filteredOrders, Language])

  const safeActiveKey = (() => {
    if (tabs.some((tab) => tab.key === activeKey)) return activeKey

    const currentTab = tabs.find((tab) => tab.key === activeKey)
    if (!currentTab) return tabs[0]?.key || 1

    if (
      ['pending', 'preparing'].includes(currentTab.status) &&
      filteredOrders.filter((o) => o.status === currentTab.status).length === 0
    ) {
      const fallback =
        tabs.find((tab) => tab.status === 'completed') ||
        tabs.find((tab) => tab.count > 0) ||
        tabs[0]
      return fallback?.key || activeKey
    }

    return activeKey
  })()

  const safeTab =
    tabs.find((tab) => tab.key === safeActiveKey) || tabs.find((tab) => tab.count > 0) || tabs[0]

  const visibleOrders = safeTab ? filteredOrders.filter((o) => o.status === safeTab.status) : []

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
