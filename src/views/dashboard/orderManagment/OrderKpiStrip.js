import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { CSpinner } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import {
  cilClock,
  cilInbox,
  cilListRich,
  cilTablet,
  cilCheckCircle,
  cilBan,
  cilWarning,
} from '@coreui/icons'
import axios from 'axios'
import { io } from 'socket.io-client'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { BaseUrl } from '../../../helpers/BaseUrl'
import { GetToken } from '../../../helpers/GetToken'
import translations from '../../../app/Language'
import './OrderKpiStrip.css'

const IN_FLIGHT = ['pending', 'placed', 'preparing', 'ready']

// Freshness thresholds — turn a KPI amber or red if we're running behind.
// Tuned for a café; can be made tenant-configurable later.
const PENDING_WARN_MS = 5 * 60 * 1000 // 5 min
const PENDING_DANGER_MS = 10 * 60 * 1000 // 10 min
const READY_WARN_COUNT = 3
const READY_DANGER_COUNT = 6

const OrderKpiStrip = () => {
  const token = GetToken()
  const navigate = useNavigate()
  const t = useSelector((state) => state.language)
  const Language = translations[t]

  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [now, setNow] = useState(Date.now())

  // ── Data ─────────────────────────────────────────────────
  const fetchOrders = useCallback(async () => {
    try {
      const res = await axios.get(`${BaseUrl}/order/orders/ordersfifo`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setOrders(res.data?.orders || [])
    } catch (err) {
      console.error('Failed to fetch KPI orders:', err)
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    fetchOrders()
    const socket = io(BaseUrl, { auth: { token } })
    const refresh = () => fetchOrders()
    socket.on('newOrder', refresh)
    socket.on('orderUpdated', refresh)
    socket.on('orderReady', refresh)
    socket.on('orderDelivered', refresh)
    socket.on('deleteOrder', refresh)
    socket.on('tenantConfigChanged', refresh)
    return () => socket.disconnect()
  }, [token, fetchOrders])

  // Recompute "oldest pending" once a minute so the timer doesn't freeze.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000)
    return () => clearInterval(id)
  }, [])

  // ── Derived metrics ──────────────────────────────────────
  const metrics = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayMs = today.getTime()

    const isToday = (iso) => {
      if (!iso) return false
      return new Date(iso).getTime() >= todayMs
    }

    const inFlight = []
    let readyQueue = 0
    let cancelledToday = 0
    let ordersToday = 0
    let oldestPendingMs = null
    const activeTableIds = new Set()

    for (const o of orders) {
      const isTodayOrder = isToday(o.timestamp || o.createdAt)
      if (isTodayOrder) ordersToday += 1
      if (o.status === 'cancelled' && isTodayOrder) cancelledToday += 1

      if (IN_FLIGHT.includes(o.status)) {
        inFlight.push(o)
        if (o.table?._id) activeTableIds.add(String(o.table._id))
      }

      if (o.status === 'ready') readyQueue += 1

      if (o.status === 'pending' || o.status === 'placed') {
        const anchor =
          o.statusTimestamps?.pending || o.statusTimestamps?.placed || o.timestamp || o.createdAt
        if (anchor) {
          const age = now - new Date(anchor).getTime()
          if (age > 0 && (oldestPendingMs == null || age > oldestPendingMs)) {
            oldestPendingMs = age
          }
        }
      }
    }

    return {
      inFlight: inFlight.length,
      readyQueue,
      oldestPendingMs,
      activeTables: activeTableIds.size,
      ordersToday,
      cancelledToday,
    }
  }, [orders, now])

  // ── Formatting ───────────────────────────────────────────
  const formatDuration = (ms) => {
    if (ms == null) return '—'
    const total = Math.round(ms / 1000)
    if (total < 60) return `${total}${Language.kpiSec || 's'}`
    const m = Math.floor(total / 60)
    const s = total % 60
    return s > 0 ? `${m}${Language.kpiMin || 'min'} ${s}s` : `${m}${Language.kpiMin || 'min'}`
  }

  const pendingTone = () => {
    if (metrics.oldestPendingMs == null) return ''
    if (metrics.oldestPendingMs >= PENDING_DANGER_MS) return 'is-danger'
    if (metrics.oldestPendingMs >= PENDING_WARN_MS) return 'is-warning'
    return ''
  }

  const readyTone = () => {
    if (metrics.readyQueue >= READY_DANGER_COUNT) return 'is-danger'
    if (metrics.readyQueue >= READY_WARN_COUNT) return 'is-warning'
    return ''
  }

  // ── Render ───────────────────────────────────────────────
  if (loading && orders.length === 0) {
    return (
      <div
        className="om-kpi-strip"
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: 96,
        }}
      >
        <CSpinner color="primary" />
      </div>
    )
  }

  if (!loading && orders.length === 0) {
    return (
      <div className="om-kpi-strip">
        <div className="om-kpi-empty">
          <CIcon icon={cilListRich} size="xl" />
          <div>{Language.kpiEmptyHint || 'No orders yet today.'}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="om-kpi-strip">
      {/* In flight */}
      <div
        className="om-kpi is-clickable"
        onClick={() => navigate('/orders/ordersList')}
        role="button"
        tabIndex={0}
      >
        <div className="om-kpi-label">
          <CIcon icon={cilListRich} />
          {Language.kpiInFlight || 'In flight'}
        </div>
        <div className="om-kpi-value is-primary">{metrics.inFlight}</div>
        <div className="om-kpi-hint">
          {Language.kpiInFlightHint || 'Orders not yet delivered or completed'}
        </div>
      </div>

      {/* Oldest pending */}
      <div className={`om-kpi ${pendingTone()}`}>
        <div className="om-kpi-label">
          <CIcon icon={cilClock} />
          {Language.kpiOldestPending || 'Oldest pending'}
        </div>
        <div
          className={`om-kpi-value ${
            pendingTone() === 'is-danger'
              ? 'is-danger'
              : pendingTone() === 'is-warning'
                ? 'is-warning'
                : ''
          }`}
        >
          {formatDuration(metrics.oldestPendingMs)}
        </div>
        <div className="om-kpi-hint">
          {Language.kpiOldestPendingHint || 'Time since the oldest pending order was placed'}
        </div>
      </div>

      {/* Ready queue */}
      <div className={`om-kpi ${readyTone()}`}>
        <div className="om-kpi-label">
          <CIcon icon={cilInbox} />
          {Language.kpiReadyQueue || 'Ready queue'}
        </div>
        <div
          className={`om-kpi-value ${
            readyTone() === 'is-danger'
              ? 'is-danger'
              : readyTone() === 'is-warning'
                ? 'is-warning'
                : 'is-success'
          }`}
        >
          {metrics.readyQueue}
        </div>
        <div className="om-kpi-hint">
          {Language.kpiReadyQueueHint || 'Orders waiting to be delivered'}
        </div>
      </div>

      {/* Active tables */}
      <div
        className="om-kpi is-clickable"
        onClick={() => navigate('/tables/tablesList')}
        role="button"
        tabIndex={0}
      >
        <div className="om-kpi-label">
          <CIcon icon={cilTablet} />
          {Language.kpiActiveTables || 'Active tables'}
        </div>
        <div className="om-kpi-value">{metrics.activeTables}</div>
        <div className="om-kpi-hint">
          {Language.kpiActiveTablesHint || 'Tables with at least one open order'}
        </div>
      </div>

      {/* Orders today */}
      <div className="om-kpi">
        <div className="om-kpi-label">
          <CIcon icon={cilCheckCircle} />
          {Language.kpiOrdersToday || 'Orders today'}
        </div>
        <div className="om-kpi-value">{metrics.ordersToday}</div>
        <div className="om-kpi-hint">
          {Language.kpiOrdersTodayHint || 'Total orders placed today'}
        </div>
      </div>

      {/* Cancelled today */}
      <div className="om-kpi">
        <div className="om-kpi-label">
          <CIcon icon={cilBan} />
          {Language.kpiCancelledToday || 'Cancelled today'}
        </div>
        <div className={`om-kpi-value ${metrics.cancelledToday > 0 ? 'is-danger' : ''}`}>
          {metrics.cancelledToday}
        </div>
        <div className="om-kpi-hint">
          {Language.kpiCancelledTodayHint || 'Cancelled orders today'}
        </div>
      </div>
    </div>
  )
}

export default OrderKpiStrip
