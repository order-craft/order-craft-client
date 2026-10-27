import React, { useState, useEffect } from 'react'
import { CCard, CCardBody, CButton, CSpinner, CProgress } from '@coreui/react'
import { BaseUrl } from '../../helpers/BaseUrl'
import axios from 'axios'
import { io } from 'socket.io-client'
import { GetToken } from '../../helpers/GetToken'
import { useSelector } from 'react-redux'
import translations from '../../app/Language'
import CIcon from '@coreui/icons-react'
import {
  cilClock,
  cilFire,
  cilCheckCircle,
  cilBan,
  cilInfo,
  cilListRich,
  cilReload,
  cilFilter,
  cilTrash,
  cilChevronBottom,
  cilChevronTop,
  cilSearch,
  cilUser,
  cilInbox,
} from '@coreui/icons'
import { formatDistanceToNow } from 'date-fns'
import './OrdersList.css'
import { useToast } from '../../components/toast/ToastProvider'
import { useAuth } from '../../context/AuthContext'

// ─────────────────────────────────────────────────────────────
// Flow helpers — mirror the server-side state machine
// ─────────────────────────────────────────────────────────────
const ALL_STATUSES = [
  'placed',
  'pending',
  'preparing',
  'ready',
  'delivered',
  'completed',
  'archived',
  'cancelled',
]

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

  // Show "cancelled" only when it has orders
  if ((orders || []).some((o) => o.status === 'cancelled')) {
    wanted.add('cancelled')
  }

  return ALL_STATUSES.filter((s) => wanted.has(s))
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
    if (s === 'pending' && isPrep) actions.push({ to: 'preparing', kind: 'info' })
    if (s === 'preparing' && isPrep) actions.push({ to: 'completed', kind: 'success' })
  } else if (flow === 'four-step') {
    if (s === 'pending' && isPrep) actions.push({ to: 'preparing', kind: 'info' })
    if (s === 'preparing' && isPrep) actions.push({ to: 'ready', kind: 'success' })
    if (s === 'ready' && isDel) actions.push({ to: 'delivered', kind: 'success' })
  } else if (flow === 'delivery-only') {
    if (s === 'placed' && isDel) actions.push({ to: 'delivered', kind: 'success' })
  }

  if ((s === 'pending' || s === 'preparing' || s === 'placed') && role === 'superClient') {
    actions.push({ to: 'cancelled', kind: 'danger' })
  }
  if (s === 'ready' && role === 'superClient') {
    actions.push({ to: 'cancelled', kind: 'danger' })
  }

  return actions
}

const OrdersList = () => {
  // ── React state ────────────────────────────────────────────
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeKey, setActiveKey] = useState(1)
  const [updatedOrders, setUpdatedOrders] = useState({})
  const [selectedPlanFilter, setSelectedPlanFilter] = useState('all')
  const [availablePlans, setAvailablePlans] = useState([])
  const [onlyTakeawayDelivery, setOnlyTakeawayDelivery] = useState(false)
  const [typeFilter, setTypeFilter] = useState('all')
  const [timeFilter, setTimeFilter] = useState('today')
  const [statusFlowEnabled, setStatusFlowEnabled] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [expandedRows, setExpandedRows] = useState({})
  const [ringtone, setRingtone] = useState(null)

  // ── Hooks ──────────────────────────────────────────────────
  const token = GetToken()
  const t = useSelector((state) => state.language)
  const Language = translations[t]
  const { role, staffRole, orderFlow } = useAuth()
  const effectiveRole = role === 'superClient' ? 'superClient' : staffRole || 'both'
  const { showToast } = useToast()
  const showAlert = (msg, color = 'success') => showToast(msg, color)

  // Effective flow of the tenant. Prefer the new `orderFlow` from context;
  // fall back to the legacy `statusFlowEnabled` flag from the last fetch.
  const tenantFlow = orderFlow || (statusFlowEnabled ? 'three-step' : 'two-step')

  // ── Data ───────────────────────────────────────────────────
  const fetchOrders = async () => {
    setLoading(true)
    try {
      const response = await axios.get(`${BaseUrl}/order/orders/ordersfifo`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setOrders(response.data.orders)
      setAvailablePlans(response.data.plans)
      setStatusFlowEnabled(response.data.statusFlowEnabled !== false)
    } catch (error) {
      console.error('Failed to fetch orders:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOrders()
    const socket = io(BaseUrl, { auth: { token } })

    socket.on('newOrder', (newOrder) => {
      if (typeof newOrder === 'string' || !newOrder?._id) return

      setOrders((prev) => {
        const idx = prev.findIndex((o) => o._id === newOrder._id)
        if (idx > -1) {
          return prev.map((o, i) => (i === idx ? newOrder : o))
        }
        return [...prev, newOrder]
      })
      setUpdatedOrders((prev) => ({ ...prev, [newOrder._id]: true }))
      setTimeout(() => {
        setUpdatedOrders((prev) => {
          const next = { ...prev }
          delete next[newOrder._id]
          return next
        })
      }, 10000)
      if (newOrder.playSound !== false) {
        playRingtone()
      }
    })

    socket.on('deleteOrder', (deletedOrderId) => {
      setOrders((prev) => prev.filter((o) => o._id !== deletedOrderId))
    })

    socket.on('tenantConfigChanged', (cfg) => {
      if (typeof cfg?.statusFlowEnabled === 'boolean') {
        setStatusFlowEnabled(cfg.statusFlowEnabled)
      }
      fetchOrders()
    })

    socket.on('orderReady', (payload) => {
      if (!payload || !payload.orderId) return
      // The order just became ready — refetch so the "Ready" tab is accurate.
      fetchOrders()
      if (payload.playSound !== false) playRingtone()
      if (payload.tableNumber) {
        showToast(
          `${Language.orderReadyToast || 'Order ready for pickup'} · ${Language.table || 'Table'} ${payload.tableNumber}`,
          'info',
        )
      }
    })

    socket.on('orderDelivered', (payload) => {
      if (!payload || !payload.orderId) return
      fetchOrders()
      // Delivery should be quiet for the person who delivered it: play only
      // if the server flagged it (superClient / prep staff) — the deliverer's
      // own action doesn't emit `playSound` because it goes only to the tenant
      // and their own `user` room which they are in.
      if (payload.playSound !== false) playRingtone()
      if (payload.tableNumber) {
        showToast(
          `${Language.orderDeliveredToast || 'Order delivered'} · ${Language.table || 'Table'} ${payload.tableNumber}`,
          'success',
        )
      }
    })
    socket.on('orderUpdated', (payload) => {
      if (!payload) return
      // Payload can be a full order (from updateOrderStatus / updateOrder)
      // or a partial { _id, payed, status } (from confirm* handlers).
      const orderId = payload._id
      if (!orderId) {
        // Partial update; just refetch.
        fetchOrders()
        return
      }

      setOrders((prev) => {
        const idx = prev.findIndex((o) => o._id === orderId)
        if (idx === -1) {
          // Order isn't in the list — refetch to pick it up if it's a new one.
          fetchOrders()
          return prev
        }
        // Full order vs partial — merge shallowly
        return prev.map((o, i) => (i === idx ? { ...o, ...payload } : o))
      })

      if (payload.playSound !== false) playRingtone()
    })

    return () => socket.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Ringtone ───────────────────────────────────────────────
  const playRingtone = () => {
    stopRingtone()
    const audio = new Audio('/newOrder.mp3')
    audio.loop = false
    audio.play().catch(() => {})
    setRingtone(audio)
  }
  const stopRingtone = () => {
    if (ringtone) {
      ringtone.pause()
      ringtone.currentTime = 0
    }
  }

  // ── Status updates ─────────────────────────────────────────
  const cancelOrder = (orderId) => {
    if (confirm(Language.confirmCancelOrder || 'Cancel this order?')) {
      updateOrderStatus(orderId, 'cancelled')
    }
  }

  const updateOrderStatus = async (orderId, newStatus) => {
    setLoading(true)
    try {
      const response = await axios.patch(
        `${BaseUrl}/order/update-status/${orderId}`,
        { status: newStatus },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        },
      )

      if (response.status === 200) {
        const updatedOrder = response.data.order
        setOrders((prev) =>
          prev.map((order) =>
            order._id === orderId ? { ...order, status: newStatus, ...updatedOrder } : order,
          ),
        )
        showAlert(response.data.message || 'Order status updated successfully', 'success')
        if (response.data.warnings?.length > 0) {
          response.data.warnings.forEach((warning) =>
            setTimeout(() => showAlert(warning, 'warning'), 500),
          )
        }
        if (response.data.insufficientMaterials?.length > 0) {
          const materialsText = response.data.insufficientMaterials.join(', ')
          setTimeout(
            () => showAlert(`Insufficient stock for materials: ${materialsText}`, 'warning'),
            response.data.warnings?.length > 0 ? 1000 : 500,
          )
        }
        if (response.data.deficits?.length > 0) {
          response.data.deficits.forEach((d, idx) => {
            const msg = `${d.rawMaterialName}: needed ${d.needed}${d.unit}, had ${d.available}${d.unit} — ${d.deficit}${d.unit} short`
            setTimeout(
              () => showAlert(msg, 'warning'),
              (response.data.warnings?.length || 0) * 500 +
                (response.data.insufficientMaterials?.length || 0) * 500 +
                500 * (idx + 1),
            )
          })
        }
      } else {
        showAlert('Failed to update order status', 'danger')
      }
    } catch (error) {
      console.error('Update error:', error)
      let errorMessage = 'Failed to update order status'
      if (error.response) {
        errorMessage = error.response.data?.error || error.response.data?.message || errorMessage
        if (error.response.status === 400) fetchOrders()
      } else if (error.request) {
        errorMessage = 'Network error. Please check your connection.'
      }
      showAlert(errorMessage, 'danger')
    } finally {
      setLoading(false)
    }
  }

  const deleteAllCancelledOrders = async () => {
    if (!confirm(Language.confirmDeleteAllCancelled || 'Delete all cancelled orders?')) return
    setLoading(true)
    try {
      await axios.delete(`${BaseUrl}/order/delete/cancelled`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setOrders((prev) => prev.filter((o) => o.status !== 'cancelled'))
    } catch (error) {
      console.error('Failed to delete cancelled orders:', error)
    } finally {
      setLoading(false)
    }
  }

  // ── Filtering ──────────────────────────────────────────────
  const isToday = (isoString) => {
    const d = new Date(isoString)
    const now = new Date()
    return (
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate()
    )
  }

  const isThisWeek = (isoString) => {
    const d = new Date(isoString)
    const now = new Date()
    const weekStart = new Date(now.setDate(now.getDate() - now.getDay()))
    return d >= weekStart
  }

  const filteredOrders = (() => {
    let filtered = orders

    filtered = filtered.filter((order) => {
      if (timeFilter === 'today') return isToday(order.timestamp || order.createdAt)
      if (timeFilter === 'thisWeek') return isThisWeek(order.timestamp || order.createdAt)
      return true
    })

    if (searchTerm.trim()) {
      const q = searchTerm.trim().toLowerCase()
      filtered = filtered.filter((o) => {
        const tableNum = String(o.table?.number ?? '')
        const orderNum = String(o.orderNumber ?? '')
        return tableNum.includes(q) || orderNum.includes(q)
      })
    }

    if (onlyTakeawayDelivery) {
      filtered = filtered.filter((o) => {
        const okType =
          typeFilter === 'all'
            ? o.orderType === 'to-go' || o.orderType === 'delivery'
            : o.orderType === typeFilter
        return okType
      })
    } else {
      filtered = filtered.filter((o) => {
        if (!o.table) return false
        return selectedPlanFilter === 'all' || o.table.plan?._id === selectedPlanFilter
      })
    }

    return filtered
  })()

  const getTabCount = (status) => filteredOrders.filter((o) => o.status === status).length

  // ── Status maps (MUST be declared before `tabs`) ───────────
  const statusIcons = {
    placed: cilCheckCircle,
    pending: cilClock,
    preparing: cilFire,
    ready: cilCheckCircle,
    delivered: cilCheckCircle,
    completed: cilCheckCircle,
    cancelled: cilBan,
  }

  const statusLabels = {
    placed: Language.placed || 'Placed',
    pending: Language.pending || 'Pending',
    preparing: Language.preparing || 'Preparing',
    ready: Language.ready || 'Ready',
    delivered: Language.delivered || 'Delivered',
    completed: statusFlowEnabled ? Language.completed || 'Completed' : Language.placed || 'Placed',
    cancelled: Language.cancelled || 'Cancelled',
  }

  // ── Tab derivation (order matters) ─────────────────────────
  const tabStatuses = buildTabStatuses(tenantFlow, filteredOrders)
  const tabs = tabStatuses.map((status, idx) => ({
    key: idx + 1,
    status,
    icon: statusIcons[status] || cilInfo,
    label: statusLabels[status] || status,
    count: getTabCount(status),
  }))

  const safeActiveKey = (() => {
    if (tabs.some((tab) => tab.key === activeKey)) return activeKey
    const currentTab = tabs.find((tab) => tab.key === activeKey)
    if (!currentTab) return tabs[0]?.key || 1
    if (
      ['pending', 'preparing'].includes(currentTab.status) &&
      getTabCount(currentTab.status) === 0
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

  // ── Helpers used inside JSX ────────────────────────────────
  const getStatusColor = (status) => {
    switch (status) {
      case 'placed':
        return 'primary'
      case 'pending':
        return 'warning'
      case 'preparing':
        return 'info'
      case 'ready':
        return 'success'
      case 'delivered':
        return 'success'
      case 'completed':
        return 'success'
      case 'cancelled':
        return 'danger'
      default:
        return 'secondary'
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'placed':
        return <CIcon icon={cilCheckCircle} className="me-1" />
      case 'pending':
        return <CIcon icon={cilClock} className="me-1" />
      case 'preparing':
        return <CIcon icon={cilFire} className="me-1" />
      case 'ready':
      case 'delivered':
      case 'completed':
        return <CIcon icon={cilCheckCircle} className="me-1" />
      case 'cancelled':
        return <CIcon icon={cilBan} className="me-1" />
      default:
        return <CIcon icon={cilInfo} className="me-1" />
    }
  }

  const statusLabel = (status) => statusLabels[status] || status

  const statusPillClass = (status) => {
    if (!statusFlowEnabled && status === 'completed') return 'placed'
    return status
  }

  const formatDuration = (ms) => {
    const totalSeconds = Math.floor(ms / 1000)
    const hours = Math.floor(totalSeconds / 3600)
    const mins = Math.floor((totalSeconds % 3600) / 60)
    const secs = totalSeconds % 60
    const parts = []
    if (hours > 0) parts.push(`${hours}h`)
    if (mins > 0) parts.push(`${mins}m`)
    if (secs > 0 || parts.length === 0) parts.push(`${secs}s`)
    return parts.join(' ')
  }

  const currentStatusDuration = (order) => {
    if (!statusFlowEnabled) return null
    const durations = order.statusDurations || {}
    if (order.status === 'cancelled') return null
    const ms = durations[order.status]
    if (!ms || ms <= 0) return null
    return formatDuration(ms)
  }

  const toggleRow = (orderId) => {
    setExpandedRows((prev) => ({ ...prev, [orderId]: !prev[orderId] }))
  }

  // ── Row renderer ───────────────────────────────────────────
  const renderOrderRow = (order) => {
    if (!order) return null

    const products = order.products || []
    const totalPrice = products
      .reduce((sum, item) => {
        const product = item.product || {}
        const price = typeof product.price === 'number' ? product.price : 0
        const discount =
          typeof product.discountPercentage === 'number' ? product.discountPercentage : 0
        const unitPrice = discount > 0 ? price * (1 - discount / 100) : price
        return sum + unitPrice * (item.quantity || 0)
      }, 0)
      .toFixed(2)

    const isExpanded = !!expandedRows[order._id]
    const duration = currentStatusDuration(order)

    const actions = nextActionsFor(order, effectiveRole, tenantFlow)

    const actionLabel = (to) => {
      if (to === 'preparing') return Language.startPreparing || 'Start preparing'
      if (to === 'ready') return Language.markReady || 'Mark ready'
      if (to === 'delivered') return Language.markDelivered || 'Mark delivered'
      if (to === 'completed') return Language.moveToCompleted || 'Completed'
      if (to === 'cancelled') return Language.cancelOrder || 'Cancel'
      return to
    }

    const actionIcon = (to) => {
      if (to === 'preparing') return cilFire
      if (to === 'ready') return cilCheckCircle
      if (to === 'delivered') return cilCheckCircle
      if (to === 'completed') return cilCheckCircle
      if (to === 'cancelled') return cilBan
      return cilInfo
    }

    const statusButtons =
      actions.length > 0 ? (
        <>
          {actions.map((a) => (
            <CButton
              key={a.to}
              color={a.kind === 'danger' ? 'danger' : a.kind === 'info' ? 'info' : 'success'}
              variant={a.kind === 'danger' ? 'outline' : undefined}
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                if (a.to === 'cancelled') {
                  cancelOrder(order._id)
                } else {
                  updateOrderStatus(order._id, a.to)
                }
              }}
              disabled={loading}
            >
              {loading ? (
                <CSpinner size="sm" />
              ) : (
                <>
                  <CIcon icon={actionIcon(a.to)} className="me-1" />
                  {actionLabel(a.to)}
                </>
              )}
            </CButton>
          ))}
        </>
      ) : null

    return (
      <React.Fragment key={order._id}>
        <div
          className={`ol-row ${isExpanded ? 'is-expanded' : ''}`}
          data-status={order.status}
          onClick={() => toggleRow(order._id)}
          role="button"
          tabIndex={0}
        >
          <div className="ol-row-main">
            <div className="ol-row-title">
              <CIcon icon={cilListRich} />
              {order.table
                ? `${Language.table || 'Table'} ${order.table.number}`
                : `${
                    order.orderType === 'to-go'
                      ? Language.togo || 'To-go'
                      : Language.delivery || 'Delivery'
                  }${order.orderNumber ? ` #${order.orderNumber}` : ''}`}
              <span className={`ol-pill ${statusPillClass(order.status)}`}>
                {getStatusIcon(order.status)}
                {statusLabel(order.status)}
              </span>
              {duration && (
                <span className="ol-duration">
                  <CIcon icon={cilClock} className="me-1" />
                  {duration}
                </span>
              )}
              {updatedOrders[order._id] && (
                <span className="ol-pill placed">{Language.updated || 'New'}</span>
              )}
            </div>
            <div className="ol-row-meta">
              <span>
                {products.length}{' '}
                {products.length === 1 ? Language.item || 'item' : Language.items || 'items'}
              </span>
              <span>
                {formatDistanceToNow(new Date(order.timestamp || order.createdAt), {
                  addSuffix: true,
                })}
              </span>
            </div>
          </div>

          <div className="ol-row-price">{totalPrice} TND</div>

          <div className="ol-row-actions">{statusButtons}</div>

          <button
            type="button"
            className="ol-chevron"
            onClick={(e) => {
              e.stopPropagation()
              toggleRow(order._id)
            }}
            aria-label={isExpanded ? 'Collapse' : 'Expand'}
          >
            <CIcon icon={isExpanded ? cilChevronTop : cilChevronBottom} />
          </button>
        </div>

        {isExpanded && (
          <div className="ol-expand">
            <div className="ol-expand-section">
              <div className="ol-expand-title">{Language.items || 'Items'}</div>
              <table className="ol-items">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th className="num">Qty</th>
                    <th className="num">Unit</th>
                    <th className="num">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((item, idx) => {
                    const prod = item.product || {}
                    const name = prod.name || item.name || Language.unknownProduct
                    const qty = item.quantity || 0
                    const price = typeof prod.price === 'number' ? prod.price : 0
                    const discount =
                      typeof prod.discountPercentage === 'number' ? prod.discountPercentage : 0
                    const unit = discount > 0 ? price * (1 - discount / 100) : price
                    const total = (unit * qty).toFixed(2)
                    return (
                      <tr key={idx}>
                        <td>
                          <div className="ol-item-name">{name}</div>
                          {prod.description && (
                            <div className="ol-item-note">{prod.description}</div>
                          )}
                          {item.notes && (
                            <div className="ol-item-note">
                              <CIcon icon={cilInfo} className="me-1" />
                              {item.notes}
                            </div>
                          )}
                        </td>
                        <td className="num">{qty}</td>
                        <td className="num">{unit.toFixed(2)}</td>
                        <td className="num">{total}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Handoff panel — who prepped, who delivered */}
            {(order.preparedBy || order.deliveredBy) && (
              <div className="ol-expand-section">
                <div className="ol-expand-title">{Language.handoffTitle || 'Handoff'}</div>
                <div className="ol-handoff">
                  {order.preparedBy && (
                    <div className="ol-handoff-row">
                      <CIcon icon={cilUser} />
                      <span>
                        {Language.preparedBy || 'Prepared by'}:{' '}
                        <strong>
                          {order.preparedBy?.fullName ||
                            order.preparedBy?.name ||
                            Language.unknownStaff ||
                            'Unknown'}
                        </strong>
                      </span>
                    </div>
                  )}
                  {order.statusTimestamps?.ready && (
                    <div className="ol-handoff-row">
                      <CIcon icon={cilClock} />
                      <span>
                        {Language.readySince || 'Ready for'}:{' '}
                        <strong>
                          {formatDuration(
                            Math.max(
                              0,
                              Date.now() - new Date(order.statusTimestamps.ready).getTime(),
                            ),
                          )}
                        </strong>
                      </span>
                    </div>
                  )}
                  {order.deliveredBy && (
                    <div className="ol-handoff-row">
                      <CIcon icon={cilUser} />
                      <span>
                        {Language.deliveredBy || 'Delivered by'}:{' '}
                        <strong>
                          {order.deliveredBy?.fullName ||
                            order.deliveredBy?.name ||
                            Language.unknownStaff ||
                            'Unknown'}
                        </strong>
                      </span>
                    </div>
                  )}
                  {order.statusTimestamps?.delivered && (
                    <div className="ol-handoff-row">
                      <CIcon icon={cilClock} />
                      <span>
                        {Language.deliveredAt || 'Delivered'}:{' '}
                        <strong>
                          {new Date(order.statusTimestamps.delivered).toLocaleTimeString()}
                        </strong>
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {statusFlowEnabled && order.statusDurations && (
              <div className="ol-expand-section">
                <div className="ol-expand-title">{Language.timeSpent || 'Time spent'}</div>
                <div className="ol-durations">
                  {Object.entries(order.statusDurations).map(([status, ms], index) => {
                    const mins = Math.floor((ms || 0) / 60000)
                    const pct = Math.min((mins / 120) * 100, 100)
                    return (
                      <div className="ol-duration-row" key={index}>
                        <span className="ol-duration-label">{status}</span>
                        <CProgress thin color={getStatusColor(status)} value={pct} height={6} />
                        <span className="ol-duration-value">{formatDuration(ms || 0)}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {order.comment && (
              <div className="ol-expand-section">
                <div className="ol-expand-title">{Language.comment || 'Comment'}</div>
                <div className="ol-comment">{order.comment}</div>
              </div>
            )}

            {actions.length > 0 && (
              <div className="ol-expand-actions d-lg-none">{statusButtons}</div>
            )}
          </div>
        )}
      </React.Fragment>
    )
  }

  // ── Final render ───────────────────────────────────────────
  return (
    <>
      <CCard className="mb-4">
        <div className="ol-header">
          <div className="ol-header-top">
            <div>
              <h5 className="ol-title">
                <CIcon icon={cilListRich} className="me-2" />
                {Language.orders || 'Orders'}
              </h5>
              <div className="ol-subtitle">
                <strong>{filteredOrders.length}</strong>{' '}
                {filteredOrders.length === 1 ? 'order' : 'orders'}
                {' · '}
                <strong>
                  {filteredOrders.filter((o) => o.status === 'cancelled').length}
                </strong>{' '}
                cancelled
              </div>
            </div>

            <div className="ol-top-right">
              <div className="ol-search">
                <CIcon icon={cilSearch} className="ol-search-icon" />
                <input
                  type="text"
                  placeholder={Language.searchByTableNumber || 'Search table / order #'}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="ol-select">
                <CIcon icon={cilFilter} className="ol-select-icon" />
                <select
                  value={timeFilter}
                  onChange={(e) => setTimeFilter(e.target.value)}
                  aria-label="Time filter"
                >
                  <option value="today">{Language.today || 'Today'}</option>
                  <option value="thisWeek">{Language.thisWeek || 'This week'}</option>
                  <option value="all">{Language.allTime || 'All time'}</option>
                </select>
              </div>

              <CButton
                color="primary"
                className="ol-refresh"
                onClick={fetchOrders}
                disabled={loading}
                aria-label="Refresh"
              >
                <CIcon icon={cilReload} />
              </CButton>
            </div>
          </div>

          <div className="ol-header-top" style={{ paddingTop: 0 }}>
            <div className="d-flex gap-2 flex-wrap align-items-center">
              <CButton
                color={!onlyTakeawayDelivery ? 'primary' : 'secondary'}
                variant={!onlyTakeawayDelivery ? undefined : 'outline'}
                size="sm"
                onClick={() => setOnlyTakeawayDelivery(false)}
              >
                {Language.tables || 'Dine-in'}
              </CButton>
              <CButton
                color={onlyTakeawayDelivery ? 'primary' : 'secondary'}
                variant={onlyTakeawayDelivery ? undefined : 'outline'}
                size="sm"
                onClick={() => setOnlyTakeawayDelivery(true)}
              >
                {Language.takeawayDeliveryOnly || 'Takeaway / Delivery'}
              </CButton>
            </div>

            <div className="ol-top-right">
              {onlyTakeawayDelivery ? (
                <div className="ol-select">
                  <CIcon icon={cilFilter} className="ol-select-icon" />
                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    aria-label="Order type"
                  >
                    <option value="all">{Language.allTypes || 'All types'}</option>
                    <option value="to-go">{Language.togo || 'To-go'}</option>
                    <option value="delivery">{Language.delivery || 'Delivery'}</option>
                  </select>
                </div>
              ) : (
                <div className="ol-select">
                  <CIcon icon={cilFilter} className="ol-select-icon" />
                  <select
                    value={selectedPlanFilter}
                    onChange={(e) => setSelectedPlanFilter(e.target.value)}
                    aria-label="Plan"
                  >
                    <option value="all">{Language.allPlans || 'All plans'}</option>
                    {availablePlans.map((plan) => (
                      <option key={plan._id} value={plan._id}>
                        {plan.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          <div className="ol-tabs" role="tablist">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                role="tab"
                className={`ol-tab ${safeActiveKey === tab.key ? 'is-active' : ''}`}
                onClick={() => setActiveKey(tab.key)}
              >
                <CIcon icon={tab.icon} />
                {tab.label}
                <span className="ol-tab-count">{getTabCount(tab.status)}</span>
              </button>
            ))}
          </div>
        </div>

        <CCardBody>
          {loading && visibleOrders.length === 0 ? (
            <div className="text-center py-5">
              <CSpinner color="primary" />
              <div className="mt-3">{Language.loadingOrders || 'Loading orders...'}</div>
            </div>
          ) : visibleOrders.length === 0 ? (
            <div className="ol-empty">
              <CIcon icon={cilInfo} size="xl" />
              <div className="ol-empty-title">{Language.noOrdersInTab || 'No orders here'}</div>
              <div className="ol-empty-body">
                {Language.noOrdersInTabHint || 'New orders will appear as they come in.'}
              </div>
            </div>
          ) : (
            <>
              {safeTab?.status === 'cancelled' && visibleOrders.length > 0 && (
                <div className="d-flex justify-content-end mb-3">
                  <CButton color="danger" onClick={deleteAllCancelledOrders}>
                    <CIcon icon={cilTrash} className="me-1" />
                    {Language.deleteAll || 'Delete all cancelled'}
                  </CButton>
                </div>
              )}

              {/* Ready queue banner — visible only in the "ready" tab.
                  This is the deliverer's "what do I need to pick up next" view. */}
              {safeTab?.status === 'ready' && visibleOrders.length > 0 && (
                <div className="ol-ready-queue">
                  <div className="ol-ready-queue-head">
                    <div className="ol-ready-queue-title">
                      <CIcon icon={cilInbox} />
                      {Language.readyQueueTitle || 'Orders ready to deliver'}
                    </div>
                    <div className="ol-ready-queue-hint">
                      {Language.readyQueueHint || 'Pick up and deliver these to the table.'}
                    </div>
                  </div>
                  <div className="ol-ready-queue-list">
                    {visibleOrders.map((o) => {
                      const readyAt = o.statusTimestamps?.ready
                      const elapsed = readyAt
                        ? Math.max(0, Date.now() - new Date(readyAt).getTime())
                        : null
                      return (
                        <div className="ol-ready-queue-row" key={o._id}>
                          <div className="ol-ready-queue-label">
                            {o.table
                              ? `${Language.table || 'Table'} ${o.table.number}`
                              : `${
                                  o.orderType === 'to-go'
                                    ? Language.togo || 'To-go'
                                    : Language.delivery || 'Delivery'
                                }${o.orderNumber ? ` #${o.orderNumber}` : ''}`}
                          </div>
                          <div className="ol-ready-queue-time">
                            {elapsed != null
                              ? `${formatDuration(elapsed)} ${Language.readySince || 'ready'}`
                              : ''}
                          </div>
                          <CButton
                            size="sm"
                            color="success"
                            onClick={(e) => {
                              e.stopPropagation()
                              updateOrderStatus(o._id, 'delivered')
                            }}
                          >
                            {Language.markDelivered || 'Mark delivered'}
                          </CButton>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              <div className="ol-list">{visibleOrders.map(renderOrderRow)}</div>
            </>
          )}
        </CCardBody>
      </CCard>
    </>
  )
}

export default OrdersList
