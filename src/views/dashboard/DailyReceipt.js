import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CButton, CCard, CCardBody, CSpinner } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import {
  cilFile,
  cilCloudDownload,
  cilCheckCircle,
  cilWarning,
  cilChevronBottom,
  cilChevronTop,
  cilInfo,
} from '@coreui/icons'
import axios from 'axios'
import jsPDF from 'jspdf'
import 'jspdf-autotable'
import { format } from 'date-fns'
import { GetToken } from '../../helpers/GetToken'
import { BaseUrl } from '../../helpers/BaseUrl'
import { useSelector } from 'react-redux'
import translations from '../../app/Language'
import './receipt.css'
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

const OrdersComponent = () => {
  const [orders, setOrders] = useState([])
  const [totalRevenue, setTotalRevenue] = useState(0)
  const [totalTips, setTotalTips] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [expandedId, setExpandedId] = useState(null)
  const [closing, setClosing] = useState(false)
  const token = GetToken()
  const navigate = useNavigate()

  const t = useSelector((state) => state.language)
  const Language = translations[t]

  const { showToast } = useToast()

  /* ---------- data ---------- */
  const fetchOrders = useCallback(async () => {
    if (!token) {
      setError('Authentication token not found')
      return
    }
    try {
      setLoading(true)
      setError(null)
      const response = await axios.get(`${BaseUrl}/dashboard/daily-receipt`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setOrders(response.data.orders || [])
      setTotalRevenue(response.data.totalRevenue || 0)
      const tips = (response.data.orders || []).reduce((sum, o) => sum + (o.tips || 0), 0)
      setTotalTips(tips)
    } catch (error) {
      console.error('Error fetching orders', error)
      setError(error.response?.data?.message || 'Failed to fetch orders')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  /* ---------- PDF ---------- */
  const generatePDFReceipt = useCallback((closedOrders) => {
    const doc = new jsPDF()
    const date = format(new Date(), 'yyyy-MM-dd HH:mm')
    const pageWidth = doc.internal.pageSize.width

    // Header
    doc.setFontSize(18)
    doc.setFont('helvetica', 'bold')
    doc.text('Daily Receipt Summary', 14, 18)

    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(120)
    doc.text(`Generated on: ${date}`, 14, 25)

    // Totals block (right aligned)
    const revenue = closedOrders.reduce(
      (sum, order) => sum + (order.products || []).reduce((acc, p) => acc + (p.total || 0), 0),
      0,
    )
    const tips = closedOrders.reduce((sum, order) => sum + (order.tips || 0), 0)

    doc.setTextColor(0)
    doc.setFontSize(11)
    doc.text(`Total Revenue: ${revenue.toFixed(2)} TND`, pageWidth - 15, 18, {
      align: 'right',
    })
    doc.text(`Total Tips: ${tips.toFixed(2)} TND`, pageWidth - 15, 25, {
      align: 'right',
    })
    doc.setFont('helvetica', 'bold')
    doc.text(`Grand Total: ${(revenue + tips).toFixed(2)} TND`, pageWidth - 15, 32, {
      align: 'right',
    })

    // Table
    const tableData = closedOrders.flatMap((order) =>
      (order.products || []).map((product) => [
        product.name || 'N/A',
        product.quantity || 0,
        `${(product.price || 0).toFixed(2)}`,
        `${(product.total || 0).toFixed(2)}`,
        `${(order.tips || 0).toFixed(2)}`,
        format(new Date(order.timestamp), 'yyyy-MM-dd HH:mm'),
      ]),
    )

    doc.autoTable({
      head: [['Product', 'Qty', 'Unit Price', 'Total', 'Tips', 'Date']],
      body: tableData,
      startY: 40,
      headStyles: {
        fillColor: [41, 128, 185],
        textColor: 255,
        fontStyle: 'bold',
        fontSize: 10,
      },
      bodyStyles: { fontSize: 9 },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      margin: { top: 40, left: 14, right: 14 },
    })

    doc.save(`daily-receipt-${date}.pdf`)
  }, [])

  const handleCloseOrdersAndPrintReceipt = useCallback(async () => {
    if (!token) {
      setError('Authentication token not found')
      return
    }
    setClosing(true)
    try {
      const response = await axios.post(`${BaseUrl}/dashboard/close-daily`, null, {
        headers: { Authorization: `Bearer ${token}` },
      })
      generatePDFReceipt(response.data.closedOrders || [])
      showToast(Language.dailyClosed || 'Daily closed · receipt generated')
      await fetchOrders()
    } catch (error) {
      console.error('Error closing orders', error)
      const msg = error.response?.data?.message || 'Failed to close orders'
      setError(msg)
      showToast(msg, 'danger')
    } finally {
      setClosing(false)
    }
  }, [token, fetchOrders, generatePDFReceipt, Language])

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

  /* ---------- render ---------- */
  return (
    <>
      <CCard className="mb-4">
        {/* ---- Top strip ---- */}
        <div className="rc-header">
          <div className="rc-header-inner">
            <div className="rc-header-left">
              <h5 className="rc-title">{Language.dailyReceipt || 'Daily receipt'}</h5>
              <div className="rc-subtitle">
                <strong>{orders.length}</strong> {orders.length === 1 ? 'order' : 'orders'}
                {' · '}
                {format(new Date(), 'MMMM d, yyyy')}
              </div>
            </div>

            <div className="rc-header-right">
              <CButton
                color="secondary"
                variant="outline"
                onClick={() => orders.length > 0 && generatePDFReceipt(orders)}
                disabled={orders.length === 0}
              >
                <CIcon icon={cilCloudDownload} className="me-2" />
                {Language.exportPDF || 'Export PDF'}
              </CButton>
              <CButton
                color="primary"
                onClick={handleCloseOrdersAndPrintReceipt}
                disabled={closing || orders.length === 0}
              >
                {closing ? (
                  <>
                    <CSpinner size="sm" className="me-2" />
                    {Language.closing || 'Closing…'}
                  </>
                ) : (
                  <>
                    <CIcon icon={cilCheckCircle} className="me-2" />
                    {Language.closeDaily || 'Close daily'}
                  </>
                )}
              </CButton>
            </div>
          </div>
        </div>

        {/* ---- Stats ---- */}
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

        {/* ---- Content ---- */}
        <CCardBody className="p-0">
          {loading && orders.length === 0 ? (
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
              <CButton color="primary" onClick={fetchOrders}>
                {Language.retry || 'Retry'}
              </CButton>
            </div>
          ) : orders.length === 0 ? (
            <div className="rc-empty">
              <CIcon icon={cilFile} size="xl" />
              <div className="rc-empty-title">{Language.noOrders || 'No orders yet'}</div>
              <div className="rc-empty-body">
                {Language.noOrdersHint || "Archived orders will appear here as they're paid."}
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
                              const total = Number(p.totalPrice || unit * qty)
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

export default OrdersComponent
