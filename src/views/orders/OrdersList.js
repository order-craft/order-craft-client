import React, { useState, useEffect, useRef } from 'react'
import {
  CCard,
  CCardBody,
  CButton,
  CSpinner,
  CProgress,
  CToaster,
  CToast,
  CToastHeader,
  CToastBody,
} from '@coreui/react'
import { BaseUrl } from '../../helpers/BaseUrl'
import axios from 'axios'
import { io } from 'socket.io-client'
import { GetToken } from '../../helpers/GetToken'
import { useSelector } from 'react-redux'
import translations from '../../app/Language'
import CIcon from '@coreui/icons-react'
import {
  cilPrint,
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
  cilX,
} from '@coreui/icons'
import { formatDistanceToNow } from 'date-fns'
import { jwtDecode } from 'jwt-decode'
import { getDateLocale } from '../../helpers/dateLocale'
import { useSocket } from '../../context/SocketContext'
import './OrdersList.css'

const OrdersList = () => {
  const { reportSoundBlocked } = useSocket() || {}
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

  // Responsibility-based view scope (who this order list belongs to).
  // Also mirrored into refs because the socket listeners below are
  // attached once (mount-only effect) and would otherwise always read the
  // initial render's values — see belongsToMyScope.
  const [viewScope, setViewScope] = useState('all')
  const [assignedTables, setAssignedTables] = useState([])
  const [canPrepare, setCanPrepare] = useState(null)
  const [deliveringIds, setDeliveringIds] = useState(new Set())
  const viewScopeRef = useRef('all')
  const assignedTablesRef = useRef([])
  const canPrepareRef = useRef(null)

  // "shared_delivery" workflow mode. meCanDeliver is the CALLER's own
  // service-enabled flag — distinct from the per-row `canDeliver` computed
  // further down in renderOrderRow (whether THIS order's existing-mode
  // Deliver button should show), which is unrelated and untouched. No ref
  // needed for either: unlike viewScope/assignedTables/canPrepare, neither
  // is read inside the mount-only socket effect below, only at render time.
  const [orderWorkflowMode, setOrderWorkflowMode] = useState('existing')
  const [meCanDeliver, setMeCanDeliver] = useState(null)
  // "direct_service" tenants skip the "preparing" stage entirely: an order
  // goes straight from "pending" (labeled "Placed") to "completed" with one
  // click, and the Preparing tab is hidden since nothing ever lands there.
  const [preparationMode, setPreparationMode] = useState('required')
  const [claimingIds, setClaimingIds] = useState(new Set())

  const token = GetToken()
  const t = useSelector((state) => state.language)
  const Language = translations[t]
  const dateLocale = getDateLocale(t)

  const myIdentity = (() => {
    try {
      const decoded = jwtDecode(token)
      return { userId: decoded.userId, role: decoded.role }
    } catch {
      return { userId: null, role: null }
    }
  })()

  const [toasts, setToasts] = useState([])

  /* ---------- data ---------- */
  const fetchOrders = async () => {
    setLoading(true)
    try {
      const response = await axios.get(`${BaseUrl}/order/orders/ordersfifo`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setOrders(response.data.orders)
      setAvailablePlans(response.data.plans)
      setStatusFlowEnabled(response.data.statusFlowEnabled !== false)
      const scope = response.data.viewScope || 'all'
      const myTables = response.data.assignedTables || []
      setViewScope(scope)
      setAssignedTables(myTables)
      setCanPrepare(response.data.canPrepare)
      setOrderWorkflowMode(response.data.orderWorkflowMode || 'existing')
      setMeCanDeliver(response.data.canDeliver)
      setPreparationMode(response.data.preparationMode || 'required')
      viewScopeRef.current = scope
      assignedTablesRef.current = myTables
      canPrepareRef.current = response.data.canPrepare
    } catch (error) {
      console.error('Failed to fetch orders:', error)
    } finally {
      setLoading(false)
    }
  }

  // Backend already filters the initial REST fetch by view scope; live
  // socket pushes are broadcast tenant-wide (preparation/admin need every
  // order), so a table-service-only "mine" view must apply the same
  // filter client-side or a live update would leak another server's table.
  // Reads from refs, not state, because the socket listeners are attached
  // once on mount and would otherwise close over stale initial values.
  const belongsToMyScope = (order) => {
    if (viewScopeRef.current !== 'mine') return true
    const tableId = order?.table?._id || order?.table
    if (!tableId) return false
    return assignedTablesRef.current.some((tb) => tb._id === tableId || tb._id === String(tableId))
  }

  // True when this order's table is one of MY assigned tables — independent
  // of viewScope. A staffer who both preps and owns tables (viewScope
  // 'all', e.g. real account "mahmoud" with canPrepare + assigned tables)
  // still personally receives SocketContext's targeted notification:new
  // sound for their own tables, so this order must not also sound here.
  const isMyAssignedTable = (order) => {
    const tableId = order?.table?._id || order?.table
    if (!tableId) return false
    return assignedTablesRef.current.some((tb) => tb._id === tableId || tb._id === String(tableId))
  }

  useEffect(() => {
    fetchOrders()
    const socket = io(BaseUrl, { auth: { token } })

    socket.on('newOrder', (newOrder) => {
      if (typeof newOrder === 'string' || !newOrder?._id) return
      if (!belongsToMyScope(newOrder)) return
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
      // Skip when I'm personally the targeted recipient of this same order's
      // notification:new event — my own assigned table (new_order), or any
      // order at all if I'm prep staff (new_order_prep now fires, with
      // sound, for every new order) — those paths already play a sound in
      // SocketContext. Everyone else (someone else's table, an unassigned
      // table, takeaway, seen by a non-prep table-service/admin view) has no
      // targeted notification, so this broadcast sound is the only cue and
      // must play.
      if (!isMyAssignedTable(newOrder) && !canPrepareRef.current) playRingtone()
    })

    socket.on('orderUpdated', (updated) => {
      if (!updated?._id) return
      if (!belongsToMyScope(updated)) return
      setOrders((prev) => {
        const idx = prev.findIndex((o) => o._id === updated._id)
        if (idx === -1) return prev
        return prev.map((o, i) => (i === idx ? { ...o, ...updated } : o))
      })
    })

    socket.on('deleteOrder', (deletedOrderId) => {
      setOrders((prev) => prev.filter((o) => o._id !== deletedOrderId))
    })

    socket.on('tenantConfigChanged', (cfg) => {
      setStatusFlowEnabled(cfg.statusFlowEnabled !== false)
      fetchOrders()
    })

    return () => socket.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* ---------- ringtone ---------- */
  const [ringtone, setRingtone] = useState(null)
  const playRingtone = () => {
    stopRingtone()
    const audio = new Audio('/newOrder.mp3')
    audio.loop = false
    audio.play().catch((err) => {
      if (err && err.name === 'NotAllowedError') {
        console.warn('[OrdersList] New-order sound blocked by autoplay policy:', err)
        reportSoundBlocked?.()
      } else {
        console.error('[OrdersList] New-order sound failed to play:', err)
      }
    })
    setRingtone(audio)
  }
  const stopRingtone = () => {
    if (ringtone) {
      ringtone.pause()
      ringtone.currentTime = 0
    }
  }

  /* ---------- toasts ---------- */
  const showAlert = (msg, color = 'success') => {
    const id = Date.now() + Math.random()
    setToasts((prev) => [...prev, { id, msg, color }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((x) => x.id !== id))
    }, 5000)
  }
  const removeToast = (id) => setToasts((prev) => prev.filter((x) => x.id !== id))

  /* ---------- status update ---------- */
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

  const markDelivered = async (orderId) => {
    setDeliveringIds((prev) => new Set(prev).add(orderId))
    try {
      const response = await axios.patch(
        `${BaseUrl}/order/${orderId}/deliver`,
        {},
        { headers: { Authorization: `Bearer ${token}` } },
      )
      const updated = response.data.order
      setOrders((prev) =>
        prev.map((order) => (order._id === orderId ? { ...order, ...updated } : order)),
      )
      showAlert(Language.orderDelivered || 'Order marked as delivered', 'success')
    } catch (error) {
      console.error('Failed to mark order delivered:', error)
      showAlert(error.response?.data?.error || Language.saveError || 'Failed to update', 'danger')
    } finally {
      setDeliveringIds((prev) => {
        const next = new Set(prev)
        next.delete(orderId)
        return next
      })
    }
  }

  // "shared_delivery" mode only — claims a ready, unclaimed order for the
  // caller. The backend enforces the atomic first-come-first-served rule;
  // a 409 here means someone else claimed it a moment earlier.
  const claimDelivery = async (orderId) => {
    setClaimingIds((prev) => new Set(prev).add(orderId))
    try {
      const response = await axios.patch(
        `${BaseUrl}/order/${orderId}/claim-delivery`,
        {},
        { headers: { Authorization: `Bearer ${token}` } },
      )
      const updated = response.data.order
      setOrders((prev) =>
        prev.map((order) => (order._id === orderId ? { ...order, ...updated } : order)),
      )
      showAlert(response.data.message || 'Order claimed', 'success')
    } catch (error) {
      console.error('Failed to claim delivery:', error)
      if (error.response?.status === 409) {
        // Someone else won the race — refresh so it drops out of the queue.
        fetchOrders()
      }
      showAlert(error.response?.data?.error || Language.saveError || 'Failed to update', 'danger')
    } finally {
      setClaimingIds((prev) => {
        const next = new Set(prev)
        next.delete(orderId)
        return next
      })
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

  /* ---------- filters ---------- */
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

  const getFilteredOrders = () => {
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
  }

  const filteredOrders = getFilteredOrders()

  const getTabCount = (status) =>
    status === '__available__'
      ? filteredOrders.filter(
          (o) => o.status === 'completed' && !o.deliveryClaimedBy && !o.deliveredAt,
        ).length
      : filteredOrders.filter((o) => o.status === status).length

  const safeActiveKey = (() => {
    if (preparationMode === 'direct_service' && activeKey === 2) return 1
    if (statusFlowEnabled) return activeKey
    if (activeKey === 1 && getTabCount('pending') === 0) return 3
    if (activeKey === 2 && getTabCount('preparing') === 0) return 3
    return activeKey
  })()

  /* ---------- helpers ---------- */
  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'warning'
      case 'preparing':
        return 'info'
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
      case 'pending':
        return <CIcon icon={cilClock} className="me-1" />
      case 'preparing':
        return <CIcon icon={cilFire} className="me-1" />
      case 'completed':
        return <CIcon icon={cilCheckCircle} className="me-1" />
      case 'cancelled':
        return <CIcon icon={cilBan} className="me-1" />
      default:
        return <CIcon icon={cilInfo} className="me-1" />
    }
  }

  // True for an order that was born already "completed" because
  // statusFlowEnabled is off — distinguished from a normally-completed
  // order using the existing statusTimestamps data (no schema change
  // needed): a real pending→...→completed order always has a "pending"
  // stamp, a born-completed order never does.
  const skippedPreparation = (order) =>
    order.status === 'completed' && !order.statusTimestamps?.pending

  const statusLabel = (order) => {
    const status = order.status
    if (status === 'pending') {
      // "direct_service" tenants never see a "Preparing" stage — the order
      // just sits here, labeled "Placed", until someone completes it directly.
      return directService ? Language.placed || 'Placed' : Language.pending || 'Pending'
    }
    if (status === 'preparing') return Language.preparing || 'Preparing'
    if (status === 'completed') {
      return !statusFlowEnabled || skippedPreparation(order)
        ? Language.placed || 'Placed'
        : Language.completed || 'Completed'
    }
    if (status === 'cancelled') return Language.cancelled || 'Cancelled'
    return status
  }

  const statusPillClass = (order) => {
    if (order.status === 'completed' && (!statusFlowEnabled || skippedPreparation(order))) {
      return 'placed'
    }
    if (order.status === 'pending' && directService) return 'placed'
    return order.status
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

  /* ---------- render ---------- */
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

    const canMove =
      (statusFlowEnabled || order.status === 'pending' || order.status === 'preparing') &&
      order.status !== 'completed' &&
      order.status !== 'cancelled'

    // Accepting an order into preparation, or marking it ready, is a
    // preparation-staff action — a service/delivery-only staffer (canDeliver,
    // no canPrepare) must not see it, only Accept/claim it afterward (see
    // claimButton below) once it's already Completed. That split holds in
    // "direct_service" mode too: prep still completes it, delivery still
    // only claims it — direct_service just removes the "Preparing" stage.
    const canAdvanceStatus = canPrepare === true || myIdentity.role === 'superClient'

    // "direct_service" skips "preparing" entirely: a pending ("Placed")
    // order goes straight to "completed" in one click.
    const nextStatus = directService
      ? 'completed'
      : order.status === 'pending'
        ? 'preparing'
        : 'completed'

    const statusButtons = canMove ? (
      <>
        {canAdvanceStatus && (
          <CButton
            color={nextStatus === 'preparing' ? 'info' : 'success'}
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              updateOrderStatus(order._id, nextStatus)
            }}
            disabled={loading}
          >
            {loading ? (
              <CSpinner size="sm" />
            ) : nextStatus === 'preparing' ? (
              <>
                <CIcon icon={cilFire} className="me-1" />
                {Language.moveToPreparing || 'Preparing'}
              </>
            ) : (
              <>
                <CIcon icon={cilCheckCircle} className="me-1" />
                {Language.moveToCompleted || 'Completed'}
              </>
            )}
          </CButton>
        )}
        {order.status === 'pending' && (
          <CButton
            color="danger"
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              cancelOrder(order._id)
            }}
            disabled={loading}
          >
            <CIcon icon={cilBan} className="me-1" />
            {Language.cancelOrder || 'Cancel'}
          </CButton>
        )}
      </>
    ) : null

    // Who may mark a ready order delivered: an admin, the table's assigned
    // server, or — only when that table has no assigned server — anyone
    // with table-service responsibility, so a ready order can never get
    // stuck with no one permitted to deliver it. Enforced for real on the
    // backend; this only decides whether to show the button.
    //
    // A prior delivery claim (e.g. from "shared_delivery" mode, before the
    // tenant switched to "existing") overrides table assignment entirely:
    // the claimer can always finish it, and nobody else can take it from
    // them, regardless of who the table is currently assigned to.
    const claimedById = order.deliveryClaimedBy?._id || order.deliveryClaimedBy || null
    const iAmClaimer = claimedById && String(claimedById) === String(myIdentity.userId || '')
    const claimedBySomeoneElse = claimedById && !iAmClaimer
    const assignedServerId = order.table?.user ? String(order.table.user) : null
    const canDeliver =
      orderWorkflowMode !== 'shared_delivery' &&
      order.status === 'completed' &&
      !order.deliveredAt &&
      !claimedBySomeoneElse &&
      (myIdentity.role === 'superClient' ||
        iAmClaimer ||
        assignedServerId === String(myIdentity.userId || '') ||
        (!assignedServerId && assignedTables.length > 0))

    const deliverButton = canDeliver ? (
      <CButton
        color="primary"
        size="sm"
        onClick={(e) => {
          e.stopPropagation()
          markDelivered(order._id)
        }}
        disabled={deliveringIds.has(order._id)}
      >
        {deliveringIds.has(order._id) ? (
          <CSpinner size="sm" />
        ) : (
          <>
            <CIcon icon={cilCheckCircle} className="me-1" />
            {Language.delivered || 'Delivered'}
          </>
        )}
      </CButton>
    ) : null

    // "shared_delivery" mode: the Accept action only ever appears inside
    // the "Available Deliveries" tab itself (visibleTab is a closure over
    // the current render, safe to read here) — every other tab only shows
    // the read-only "Claimed by" pill above once claimed.
    const canClaim =
      visibleTab.status === '__available__' &&
      order.status === 'completed' &&
      !order.deliveryClaimedBy &&
      !order.deliveredAt &&
      (myIdentity.role === 'superClient' || meCanDeliver === true)

    const claimButton = canClaim ? (
      <CButton
        color="primary"
        size="sm"
        onClick={(e) => {
          e.stopPropagation()
          claimDelivery(order._id)
        }}
        disabled={claimingIds.has(order._id)}
      >
        {claimingIds.has(order._id) ? (
          <CSpinner size="sm" />
        ) : (
          <>
            <CIcon icon={cilCheckCircle} className="me-1" />
            {Language.accept || 'Accept'}
          </>
        )}
      </CButton>
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
              <span className={`ol-pill ${statusPillClass(order)}`}>
                {getStatusIcon(order.status)}
                {statusLabel(order)}
              </span>
              {order.deliveryClaimedBy && (
                <span className="ol-pill completed">
                  <CIcon icon={cilCheckCircle} className="me-1" />
                  {Language.claimedBy || 'Claimed by'} {order.deliveryClaimedBy.fullName || '—'}
                </span>
              )}
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
                  locale: dateLocale,
                })}
              </span>
            </div>
          </div>

          <div className="ol-row-price">{totalPrice} TND</div>

          <div className="ol-row-actions">
            {statusButtons}
            {deliverButton}
            {claimButton}
          </div>

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
            {/* Items */}
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

            {/* Time-in-status (only when flow enabled) */}
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

            {/* Comment */}
            {order.comment && (
              <div className="ol-expand-section">
                <div className="ol-expand-title">{Language.comment || 'Comment'}</div>
                <div className="ol-comment">{order.comment}</div>
              </div>
            )}

            {/* Mobile-only action buttons */}
            {canMove && <div className="ol-expand-actions d-lg-none">{statusButtons}</div>}
          </div>
        )}
      </React.Fragment>
    )
  }

  /* ---------- tab list ---------- */
  const directService = preparationMode === 'direct_service'
  const tabs = []
  if (statusFlowEnabled || getTabCount('pending') > 0) {
    tabs.push({
      key: 1,
      icon: cilClock,
      label: directService ? Language.placed || 'Placed' : Language.pending || 'Pending',
      status: 'pending',
    })
  }
  if (!directService && (statusFlowEnabled || getTabCount('preparing') > 0)) {
    tabs.push({
      key: 2,
      icon: cilFire,
      label: Language.preparing || 'Preparing',
      status: 'preparing',
    })
  }
  tabs.push({
    key: 3,
    icon: cilCheckCircle,
    label: statusFlowEnabled ? Language.completed || 'Completed' : Language.placed || 'Placed',
    status: 'completed',
  })
  tabs.push({ key: 4, icon: cilBan, label: Language.cancelled || 'Cancelled', status: 'cancelled' })
  // "shared_delivery" mode only, and only for staff who can actually act on
  // it (admin, or a service-enabled staffer) — a prep-only staffer already
  // sees every completed order via the tab above, so this would just be a
  // duplicate list with a button they can't use.
  if (
    orderWorkflowMode === 'shared_delivery' &&
    (meCanDeliver || myIdentity.role === 'superClient')
  ) {
    tabs.push({
      key: 5,
      icon: cilListRich,
      label: Language.availableDeliveries || 'Available Deliveries',
      status: '__available__',
    })
  }

  const visibleTab = tabs.find((t) => t.key === safeActiveKey) || tabs[0]
  const visibleOrders =
    visibleTab.status === '__available__'
      ? filteredOrders.filter(
          (o) => o.status === 'completed' && !o.deliveryClaimedBy && !o.deliveredAt,
        )
      : filteredOrders.filter((o) => o.status === visibleTab.status)

  return (
    <>
      <CToaster position="top-end">
        {toasts.map(({ id, msg, color }) => (
          <CToast
            key={id}
            autohide
            delay={5000}
            color={color}
            visible
            onClose={() => removeToast(id)}
          >
            <CToastHeader closeButton>{color === 'danger' ? 'Error' : 'Notification'}</CToastHeader>
            <CToastBody>{msg}</CToastBody>
          </CToast>
        ))}
      </CToaster>

      <CCard className="mb-4">
        {/* ---- Header ---- */}
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
              {viewScope === 'mine' && assignedTables.length > 0 && (
                <div className="ol-scope-badge">
                  {Language.showingYourTables || 'Showing your tables:'}{' '}
                  {assignedTables.map((tb) => tb.number).join(', ')}
                </div>
              )}
              {viewScope === 'all' && canPrepare && (
                <div className="ol-scope-badge is-prep">
                  {Language.showingAllPreparation || 'All orders — preparation access'}
                </div>
              )}
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

          {/* Filters row: mode + plan/type */}
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

          {/* Tabs */}
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
              {safeActiveKey === 4 && visibleOrders.length > 0 && (
                <div className="d-flex justify-content-end mb-3">
                  <CButton color="danger" onClick={deleteAllCancelledOrders}>
                    <CIcon icon={cilTrash} className="me-1" />
                    {Language.deleteAll || 'Delete all cancelled'}
                  </CButton>
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
