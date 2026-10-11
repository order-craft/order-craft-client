import React, { useState, useEffect } from 'react'
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
import './OrdersList.css'

const OrdersList = () => {
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

  const token = GetToken()
  const t = useSelector((state) => state.language)
  const Language = translations[t]

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
      playRingtone()
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
    audio.play().catch(() => {})
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

  const getTabCount = (status) => filteredOrders.filter((o) => o.status === status).length

  const safeActiveKey = (() => {
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

  const statusLabel = (status) => {
    if (status === 'pending') return Language.pending || 'Pending'
    if (status === 'preparing') return Language.preparing || 'Preparing'
    if (status === 'completed')
      return statusFlowEnabled ? Language.completed || 'Completed' : Language.placed || 'Placed'
    if (status === 'cancelled') return Language.cancelled || 'Cancelled'
    return status
  }

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

    const statusButtons = canMove ? (
      <>
        <CButton
          color={order.status === 'pending' ? 'info' : 'success'}
          size="sm"
          onClick={(e) => {
            e.stopPropagation()
            const newStatus = order.status === 'pending' ? 'preparing' : 'completed'
            updateOrderStatus(order._id, newStatus)
          }}
          disabled={loading}
        >
          {loading ? (
            <CSpinner size="sm" />
          ) : order.status === 'pending' ? (
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
  const tabs = []
  if (statusFlowEnabled || getTabCount('pending') > 0) {
    tabs.push({ key: 1, icon: cilClock, label: Language.pending || 'Pending', status: 'pending' })
  }
  if (statusFlowEnabled || getTabCount('preparing') > 0) {
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

  const visibleTab = tabs.find((t) => t.key === safeActiveKey) || tabs[0]
  const visibleOrders = filteredOrders.filter((o) => o.status === visibleTab.status)

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
