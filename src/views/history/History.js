import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { CButton, CCard, CCardBody, CSpinner } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import {
  cilSearch,
  cilCloudDownload,
  cilWarning,
  cilHistory,
  cilChevronBottom,
  cilChevronTop,
  cilUser,
} from '@coreui/icons'
import axios from 'axios'
import jsPDF from 'jspdf'
import 'jspdf-autotable'
import { format } from 'date-fns'
import { GetToken } from '../../helpers/GetToken'
import { BaseUrl } from '../../helpers/BaseUrl'
import { useSelector } from 'react-redux'
import translations from '../../app/Language'
import { useAuth } from '../../context/AuthContext'
import '../dashboard/receipt.css'
import { useToast } from '../../components/toast/ToastProvider'

const palette = [
  '#0d6efd',
  '#6610f2',
  '#d63384',
  '#fd7e14',
  '#198754',
  '#20c997',
  '#0dcaf0',
  '#e83e8c',
]
const colorFor = (id) => {
  let h = 0
  const s = String(id || '')
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return palette[Math.abs(h) % palette.length]
}

const ArchivedOrdersByDate = () => {
  const token = GetToken()
  const t = useSelector((state) => state.language)
  const Language = translations[t]
  const { role } = useAuth()
  const isSuperClient = role === 'superClient'

  const todayStr = format(new Date(), 'yyyy-MM-dd')
  const sevenDaysAgoStr = format(new Date(Date.now() - 6 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd')

  const [startDate, setStartDate] = useState(sevenDaysAgoStr)
  const [endDate, setEndDate] = useState(todayStr)
  const [selectedWaiterId, setSelectedWaiterId] = useState('all')
  const [waiters, setWaiters] = useState([])

  const [orders, setOrders] = useState([])
  const [totalRevenue, setTotalRevenue] = useState(0)
  const [totalTips, setTotalTips] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [loaded, setLoaded] = useState(false)
  const [expandedId, setExpandedId] = useState(null)

  const { showToast } = useToast()

  /* ---------- fetch waiters (superClient only) ---------- */
  useEffect(() => {
    if (!isSuperClient || !token) return
    const loadWaiters = async () => {
      try {
        const response = await axios.get(`${BaseUrl}/auth/superClient/getUsers`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        setWaiters(response.data || [])
      } catch (err) {
        console.error('Failed to load waiters:', err)
      }
    }
    loadWaiters()
  }, [isSuperClient, token])

  /* ---------- data ---------- */
  const fetchOrdersByRange = useCallback(async () => {
    if (!token) {
      setError('Authentication token not found')
      return
    }
    try {
      setLoading(true)
      setError(null)

      const body = { startDate, endDate }
      if (isSuperClient && selectedWaiterId !== 'all') {
        body.userId = selectedWaiterId
      }

      const res = await axios.post(`${BaseUrl}/dashboard/history`, body, {
        headers: { Authorization: `Bearer ${token}` },
      })

      const data = res.data || {}
      const list = data.orders || []
      setOrders(list)
      setTotalRevenue(data.totalRevenue || 0)
      setTotalTips(list.reduce((sum, o) => sum + (o.tips || 0), 0))
      setLoaded(true)
    } catch (err) {
      console.error(err)
      setError(err.response?.data?.message || 'Failed to fetch orders')
      showToast('Failed to fetch orders', 'danger')
    } finally {
      setLoading(false)
    }
  }, [token, startDate, endDate, isSuperClient, selectedWaiterId])

  /* re-fetch when a superClient changes the waiter filter (if already loaded) */
  useEffect(() => {
    if (loaded) fetchOrdersByRange()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedWaiterId])

  /* ---------- PDF ---------- */
  const generatePDF = useCallback(() => {
    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.width
    const genDate = format(new Date(), 'yyyy-MM-dd HH:mm')

    doc.setFontSize(18)
    doc.setFont('helvetica', 'bold')
    doc.text('Archived Orders', 14, 18)

    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(120)
    doc.text(`Range: ${startDate} → ${endDate}`, 14, 25)
    if (isSuperClient && selectedWaiterId !== 'all') {
      const w = waiters.find((x) => x._id === selectedWaiterId)
      if (w) {
        doc.text(`Waiter: ${w.fullName}`, 14, 31)
      }
    }
    doc.text(`Generated on: ${genDate}`, 14, 37)

    doc.setTextColor(0)
    doc.setFontSize(11)
    doc.text(`Total Revenue: ${totalRevenue.toFixed(2)} TND`, pageWidth - 15, 18, {
      align: 'right',
    })
    doc.text(`Total Tips: ${totalTips.toFixed(2)} TND`, pageWidth - 15, 25, {
      align: 'right',
    })
    doc.setFont('helvetica', 'bold')
    doc.text(`Grand Total: ${(totalRevenue + totalTips).toFixed(2)} TND`, pageWidth - 15, 32, {
      align: 'right',
    })

    const tableData = orders.flatMap((order) =>
      (order.products || []).map((p) => [
        p.productName || 'N/A',
        p.quantity || 0,
        `${(p.productPrice || 0).toFixed(2)}`,
        `${(p.totalPrice || p.total || 0).toFixed(2)}`,
        `${(order.tips || 0).toFixed(2)}`,
        formatDate(order.timestamp),
      ]),
    )

    doc.autoTable({
      head: [['Product', 'Qty', 'Unit Price', 'Total', 'Tips', 'Date']],
      body: tableData,
      startY: 45,
      headStyles: {
        fillColor: [41, 128, 185],
        textColor: 255,
        fontStyle: 'bold',
        fontSize: 10,
      },
      bodyStyles: { fontSize: 9 },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      margin: { top: 45, left: 14, right: 14 },
    })

    doc.save(`archived-orders-${startDate}-to-${endDate}.pdf`)
  }, [
    orders,
    startDate,
    endDate,
    totalRevenue,
    totalTips,
    isSuperClient,
    selectedWaiterId,
    waiters,
  ])

  /* ---------- helpers ---------- */
  const formatDate = (dateString) => {
    try {
      return format(new Date(dateString), 'yyyy-MM-dd HH:mm')
    } catch {
      return dateString || 'N/A'
    }
  }

  const preview = (order) => {
    const names = (order.products || [])
      .slice(0, 2)
      .map((p) => p.productName || p.name)
      .filter(Boolean)
    if (names.length === 0) return 'No items'
    const more = (order.products?.length || 0) - names.length
    return `${names.join(', ')}${more > 0 ? ` +${more}` : ''}`
  }

  const toggleRow = (id) => {
    setExpandedId((prev) => (prev === id ? null : id))
  }

  const canFetch = !!startDate && !!endDate && !loading && startDate <= endDate

  const selectedWaiter = useMemo(
    () => waiters.find((w) => w._id === selectedWaiterId),
    [waiters, selectedWaiterId],
  )

  /* ---------- render ---------- */
  return (
    <>
      <CCard className="mb-4">
        {/* ---- Top strip ---- */}
        <div className="rc-header">
          <div className="rc-header-inner">
            <div className="rc-header-left">
              <h5 className="rc-title">{Language.history || 'Order history'}</h5>
              <div className="rc-subtitle">
                {loaded ? (
                  <>
                    <strong>{orders.length}</strong> {orders.length === 1 ? 'order' : 'orders'}
                    {selectedWaiter && (
                      <>
                        {' · '}
                        {selectedWaiter.fullName}
                      </>
                    )}
                    {' · '}
                    {startDate} → {endDate}
                  </>
                ) : (
                  'Pick a date range and load the orders.'
                )}
              </div>
            </div>

            <div className="rc-header-right">
              {isSuperClient && (
                <div className="rc-date" style={{ minWidth: 160 }}>
                  <CIcon icon={cilUser} className="rc-date-icon" />
                  <select
                    value={selectedWaiterId}
                    onChange={(e) => setSelectedWaiterId(e.target.value)}
                    aria-label="Filter by waiter"
                    style={{
                      border: 'none',
                      outline: 'none',
                      background: 'transparent',
                      fontSize: '0.88rem',
                      color: '#1a1a1a',
                      cursor: 'pointer',
                      width: '100%',
                    }}
                  >
                    <option value="all">All waiters</option>
                    {waiters.map((w) => (
                      <option key={w._id} value={w._id}>
                        {w.fullName}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="rc-date-group">
                <div className="rc-date">
                  <CIcon icon={cilSearch} className="rc-date-icon" />
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    max={endDate}
                  />
                </div>
                <span className="rc-date-sep">to</span>
                <div className="rc-date">
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    min={startDate}
                    max={todayStr}
                  />
                </div>
              </div>

              <CButton color="primary" onClick={fetchOrdersByRange} disabled={!canFetch}>
                {loading ? (
                  <>
                    <CSpinner size="sm" className="me-2" />
                    {Language.loading || 'Loading…'}
                  </>
                ) : (
                  <>
                    <CIcon icon={cilSearch} className="me-2" />
                    {Language.apply || 'Apply'}
                  </>
                )}
              </CButton>

              <CButton
                color="secondary"
                variant="outline"
                onClick={generatePDF}
                disabled={orders.length === 0}
              >
                <CIcon icon={cilCloudDownload} className="me-2" />
                {Language.exportPDF || 'Export PDF'}
              </CButton>
            </div>
          </div>
        </div>

        {/* ---- Stats ---- */}
        {loaded && orders.length > 0 && (
          <div className="rc-stats">
            <div className="rc-stat">
              <div className="rc-stat-label">{Language.totalRevenue || 'Revenue'}</div>
              <div className="rc-stat-value is-primary">
                {totalRevenue.toFixed(2)}
                <span className="rc-stat-unit">TND</span>
              </div>
            </div>
            <div className="rc-stat">
              <div className="rc-stat-label">{Language.totalTips || 'Tips'}</div>
              <div className="rc-stat-value is-success">
                {totalTips.toFixed(2)}
                <span className="rc-stat-unit">TND</span>
              </div>
            </div>
            <div className="rc-stat">
              <div className="rc-stat-label">{Language.orders || 'Orders'}</div>
              <div className="rc-stat-value">{orders.length}</div>
            </div>
          </div>
        )}

        {/* ---- Content ---- */}
        <CCardBody className="p-0">
          {!loaded && !loading ? (
            <div className="rc-empty">
              <CIcon icon={cilHistory} size="xl" />
              <div className="rc-empty-title">{Language.pickRange || 'Pick a date range'}</div>
              <div className="rc-empty-body">
                {Language.pickRangeHint || 'Select a start and end date, then tap Apply.'}
              </div>
            </div>
          ) : loading && orders.length === 0 ? (
            <div className="rc-skeleton">
              <div className="rc-skeleton-row" />
              <div className="rc-skeleton-row" />
              <div className="rc-skeleton-row" />
            </div>
          ) : error && orders.length === 0 ? (
            <div className="rc-empty">
              <CIcon icon={cilWarning} size="xl" />
              <div className="rc-empty-title">
                {Language.errorMessage || 'Something went wrong'}
              </div>
              <div className="rc-empty-body">{error}</div>
              <CButton color="primary" onClick={fetchOrdersByRange}>
                {Language.retry || 'Retry'}
              </CButton>
            </div>
          ) : orders.length === 0 ? (
            <div className="rc-empty">
              <CIcon icon={cilHistory} size="xl" />
              <div className="rc-empty-title">{Language.noOrders || 'No orders in this range'}</div>
              <div className="rc-empty-body">
                {selectedWaiter
                  ? `${selectedWaiter.fullName} has no orders in this range.`
                  : Language.noOrdersInRangeHint || 'Try a different date range.'}
              </div>
            </div>
          ) : (
            <div className="rc-list">
              {orders.map((order, index) => {
                const isOpen = expandedId === order.orderId
                return (
                  <React.Fragment key={order.orderId || index}>
                    <div
                      className={`rc-row ${isOpen ? 'is-expanded' : ''}`}
                      onClick={() => toggleRow(order.orderId)}
                      role="button"
                      tabIndex={0}
                    >
                      <div className="rc-avatar" style={{ background: colorFor(order.orderId) }}>
                        {index + 1}
                      </div>

                      <div className="rc-info">
                        <p className="rc-preview">{preview(order)}</p>
                        <div className="rc-meta">
                          <span>{formatDate(order.timestamp)}</span>
                          {order.userFullName && <span>· {order.userFullName}</span>}
                          {order.tips > 0 && (
                            <span className="rc-tip">+{Number(order.tips).toFixed(2)} TND tip</span>
                          )}
                        </div>
                      </div>

                      <div className="rc-price">{Number(order.totalPrice || 0).toFixed(2)} TND</div>

                      <div className="rc-chevron">
                        <CIcon icon={isOpen ? cilChevronTop : cilChevronBottom} />
                      </div>
                    </div>

                    {isOpen && (
                      <div className="rc-expand">
                        <table>
                          <thead>
                            <tr>
                              <th>Item</th>
                              <th className="num">Qty</th>
                              <th className="num">Unit</th>
                              <th className="num">Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(order.products || []).map((p, i) => {
                              const unit = Number(p.productPrice || p.price || 0)
                              const qty = Number(p.quantity || 0)
                              const total = Number(p.totalPrice || p.total || unit * qty)
                              return (
                                <tr key={i}>
                                  <td>{p.productName || p.name || 'Item'}</td>
                                  <td className="num">{qty}</td>
                                  <td className="num">{unit.toFixed(2)}</td>
                                  <td className="num">{total.toFixed(2)}</td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </React.Fragment>
                )
              })}
            </div>
          )}
        </CCardBody>
      </CCard>
    </>
  )
}

export default ArchivedOrdersByDate
