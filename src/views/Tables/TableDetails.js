import { useEffect, useMemo, useState } from 'react'
import {
  CButton,
  CDropdown,
  CDropdownToggle,
  CDropdownMenu,
  CDropdownItem,
  CFormCheck,
  CBadge,
  CSpinner,
} from '@coreui/react'
import { CIcon } from '@coreui/icons-react'
import {
  cilArrowLeft,
  cilCreditCard,
  cilCheckCircle,
  cilPrint,
  cilPlus,
  cilChevronBottom,
  cilChevronTop,
  cilInfo,
} from '@coreui/icons'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { BaseUrl } from '../../helpers/BaseUrl'
import Loading from '../../helpers/Loading'
import './TableDetails.css'
import { GetToken } from '../../helpers/GetToken'
import ProductSelectionModal from './ProductSelectionModal'
import jsPDF from 'jspdf'
import ManualOrderModal from './OrderModal'
import { useToast } from '../../components/toast/ToastProvider'

const TableDetails = () => {
  const { tableId } = useParams()

  const [table, setTable] = useState(null)
  const [placeDetails, setPlaceDetails] = useState(null)
  const [methods, setMethods] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [showManualModal, setShowManualModal] = useState(false)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [selectedOrders, setSelectedOrders] = useState([])
  const [selectedOrderIndex, setSelectedOrderIndex] = useState()
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('')

  const [expandedRows, setExpandedRows] = useState({})

  const navigate = useNavigate()
  const token = GetToken()

  /* ---------- data fetching ---------- */
  const fetchTableDetails = async () => {
    setLoading(true)
    try {
      const response = await axios.get(`${BaseUrl}/tables/${tableId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setTable(response.data)
    } catch (err) {
      setError('Error fetching table details')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const fetchPlaceDetails = async () => {
    try {
      const response = await axios.get(`${BaseUrl}/auth/place-details`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setPlaceDetails(response.data)
    } catch (err) {
      console.error('Error fetching place details', err)
    }
  }

  const fetchMethods = async () => {
    try {
      const res = await axios.get(`${BaseUrl}/payment-methods`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })
      setMethods(res.data)
    } catch (err) {
      console.error('Failed to fetch payment methods', err)
    }
  }

  useEffect(() => {
    fetchTableDetails()
    fetchPlaceDetails()
    fetchMethods()
  }, [tableId])

  /* ---------- selection ---------- */
  const handleSelectOrder = (orderId, orderPrice, isPayed) => {
    if (isPayed) return
    setSelectedOrders((prev) => {
      if (prev.some((o) => o.orderId === orderId)) {
        return prev.filter((o) => o.orderId !== orderId)
      }
      return [...prev, { orderId, orderPrice }]
    })
  }

  const toggleRow = (orderId) => {
    setExpandedRows((prev) => ({ ...prev, [orderId]: !prev[orderId] }))
  }

  /* ---------- totals ---------- */
  const computeOrderUnpaid = (order) => {
    return order.products.reduce((acc, product) => {
      const unpaidQuantity = product.quantity - (product.payedQuantity || 0)
      const discount =
        product.product.discountPercentage > 0
          ? (product.product.discountPercentage / 100) * product.product.price
          : 0
      const discountedPrice = product.product.price - discount
      return acc + unpaidQuantity * discountedPrice
    }, 0)
  }

  const totals = useMemo(() => {
    if (!table?.orders) {
      return { unpaid: 0, tips: 0, tipsPaid: 0, withTips: 0 }
    }
    let unpaid = 0
    let tips = 0
    let tipsPaid = 0
    table.orders.forEach((order) => {
      unpaid += computeOrderUnpaid(order)
      tips += order.tips || 0
      if (order.payed) tipsPaid += order.tips || 0
    })
    return { unpaid, tips, tipsPaid, withTips: unpaid + tips }
  }, [table])

  const selectedTotal = useMemo(() => {
    if (!table?.orders) return 0
    return selectedOrders
      .reduce((total, sel) => {
        const fullOrder = table.orders.find((o) => o._id === sel.orderId)
        if (!fullOrder) return total
        return total + computeOrderUnpaid(fullOrder)
      }, 0)
      .toFixed(2)
  }, [selectedOrders, table])

  const { showToast } = useToast()
  /* ---------- payment ---------- */
  const handleConfirmPayment = async (orderIds) => {
    if (!selectedPaymentMethod) {
      showToast('Please select a payment method first.', 'warning')
      return
    }
    setLoading(true)
    try {
      const response = await axios.put(
        `${BaseUrl}/order/confirm/confirm-payment`,
        { orderIds, paymentMethod: selectedPaymentMethod },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        },
      )

      const {
        message = 'Payment confirmed successfully',
        warnings = [],
        insufficientMaterials = [],
        deficits = [],
      } = response.data

      showToast(message, 'success')
      warnings.forEach((w, i) => setTimeout(() => showToast(w, 'warning'), 400 * (i + 1)))
      if (insufficientMaterials.length > 0) {
        setTimeout(
          () =>
            showToast(
              `Insufficient stock for materials: ${insufficientMaterials.join(', ')}`,
              'warning',
            ),
          400 * (warnings.length + 1),
        )
      }
      deficits.forEach((d, i) => {
        const msg = `${d.rawMaterialName}: needed ${d.needed}${d.unit}, had ${d.available}${d.unit} — ${d.deficit}${d.unit} short`
        setTimeout(
          () => showToast(msg, 'warning'),
          400 * (warnings.length + insufficientMaterials.length + 1 + i),
        )
      })

      fetchTableDetails()
      setSelectedOrders([])
    } catch (err) {
      const msg =
        err.response?.data?.error || err.response?.data?.message || 'Error confirming payment'
      showToast(msg, 'danger')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleConfirmAllPayments = () => {
    const all = table.orders.map((o) => o._id)
    handleConfirmPayment(all)
  }

  const handleConfirmSelectedPayments = () => {
    const ids = selectedOrders.map((o) => o.orderId)
    handleConfirmPayment(ids)
  }

  /* ---------- modals ---------- */
  const handleCloseDetailsModal = () => setShowDetailsModal(false)
  const handleDetailsClick = (index) => {
    setSelectedOrderIndex(index)
    setShowDetailsModal(true)
  }
  const handleRefetchData = () => fetchTableDetails()

  const handlePlaceOrder = () => {
    showToast('Order placed successfully', 'success')
    fetchTableDetails()
    fetchPlaceDetails()
  }

  /* ---------- print ---------- */
  const handlePrintReceipt = () => {
    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()
    const marginLeft = 10
    let yPos = 20

    const logoUrl = 'https://th.bing.com/th/id/OIP.REqzysVeL8E29CU3Is72ywHaE7?rs=1&pid=ImgDetMain'
    const logoWidth = 50
    const logoHeight = 20
    const logoX = (pageWidth - logoWidth) / 2
    doc.addImage(logoUrl, 'PNG', logoX, yPos, logoWidth, logoHeight)
    yPos += 25

    doc.setFontSize(18)
    doc.setFont('helvetica', 'bold')
    const name = placeDetails?.placeName || ''
    doc.text(name, (pageWidth - doc.getTextWidth(name)) / 2, yPos)
    yPos += 10

    doc.setFontSize(12)
    doc.setFont('helvetica', 'normal')
    const loc = 'location'
    doc.text(loc, (pageWidth - doc.getTextWidth(loc)) / 2, yPos)
    yPos += 10

    const lines = [
      `Table Number: ${table?.number}`,
      "Waiter's Name: John Doe",
      `Order Date: ${new Date().toLocaleDateString()}`,
      `Print Date: ${new Date().toLocaleDateString()}`,
      'WiFi Password: guest123',
    ]
    lines.forEach((line) => {
      doc.text(line, (pageWidth - doc.getTextWidth(line)) / 2, yPos)
      yPos += 7
    })
    yPos += 8
    doc.setLineWidth(0.5)
    doc.line(marginLeft, yPos, pageWidth - marginLeft, yPos)
    yPos += 10

    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    const hdr = 'Order Details'
    doc.text(hdr, (pageWidth - doc.getTextWidth(hdr)) / 2, yPos)
    yPos += 10

    table?.orders.forEach((order, index) => {
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      const t = `Order ${index + 1}`
      doc.text(t, (pageWidth - doc.getTextWidth(t)) / 2, yPos)
      yPos += 7

      order.products.forEach((product) => {
        doc.setFontSize(10)
        doc.setFont('helvetica', 'normal')
        const discount =
          product.product.discountPercentage > 0
            ? (product.product.discountPercentage / 100) * product.product.price
            : 0
        const dp = product.product.price - discount
        const txt = `${product.quantity} x ${product.product.name} - ${dp.toFixed(2)} TND`
        doc.text(txt, (pageWidth - doc.getTextWidth(txt)) / 2, yPos)
        yPos += 7
      })

      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      const tot = `Total: ${order.totalPrice.toFixed(2)} TND`
      doc.text(tot, (pageWidth - doc.getTextWidth(tot)) / 2, yPos)
      yPos += 7
      if (order.tips) {
        const tip = `Tips: ${order.tips.toFixed(2)} TND`
        doc.text(tip, (pageWidth - doc.getTextWidth(tip)) / 2, yPos)
        yPos += 7
      }
      doc.setLineWidth(0.2)
      doc.line(marginLeft, yPos, pageWidth - marginLeft, yPos)
      yPos += 10
    })

    const totalAmount = table?.orders.reduce((sum, o) => sum + o.totalPrice, 0).toFixed(2)
    const totalTips = table?.orders.reduce((sum, o) => sum + (o.tips || 0), 0).toFixed(2)

    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    const a = `Total Amount: ${totalAmount} TND`
    const b = `Total Tips: ${totalTips} TND`
    doc.text(a, (pageWidth - doc.getTextWidth(a)) / 2, yPos)
    yPos += 7
    doc.text(b, (pageWidth - doc.getTextWidth(b)) / 2, yPos)
    yPos += 7

    doc.setFontSize(10)
    doc.setFont('helvetica', 'italic')
    const ty = 'Thank you for dining with us!'
    doc.text(ty, (pageWidth - doc.getTextWidth(ty)) / 2, yPos)

    doc.save(`table_${table?.number}_receipt.pdf`)
  }

  /* ---------- derived UI data ---------- */
  const orders = table?.orders || []
  const hasUnpaid = orders.some((o) => !o.payed)
  const planName = table?.plan?.name || ''

  const getOrderStatus = (order) => {
    if (order.payed) return { key: 'paid', label: 'Paid' }
    const anyPaid = order.products.some((p) => (p.payedQuantity || 0) > 0)
    if (anyPaid) return { key: 'partial', label: 'Partial' }
    return { key: 'unpaid', label: 'Unpaid' }
  }

  const selectedMethodLabel = selectedPaymentMethod
    ? methods.find((m) => m._id === selectedPaymentMethod)?.name
    : 'Payment Method'

  if (loading && !table) return <Loading />
  if (error) return <p className="text-danger p-4">{error}</p>

  return (
    <div className="td-page">
      {/* Header card */}
      <div className="td-header mb-4">
        <div className="td-header-top">
          <div>
            <h2 className="td-title">
              Table {table?.number}
              {planName && <span className="td-title-sub">· {planName}</span>}
            </h2>
            <div className="td-row-meta mt-1">
              <span>
                {orders.length} {orders.length === 1 ? 'order' : 'orders'}
              </span>
              {hasUnpaid && (
                <CBadge color="warning" shape="rounded-pill">
                  Unpaid
                </CBadge>
              )}
            </div>
          </div>

          <div className="td-header-actions">
            <CButton
              color="light"
              size="sm"
              onClick={() => navigate(-1)}
              className="rounded-pill px-3 d-flex align-items-center"
            >
              <CIcon icon={cilArrowLeft} className="me-2" />
              Back
            </CButton>

            {/* Payment method dropdown */}
            <CDropdown variant="btn-group">
              <CDropdownToggle
                color="light"
                size="sm"
                className="rounded-3 px-3 d-flex align-items-center border"
              >
                <CIcon icon={cilCreditCard} className="me-2 text-primary" />
                <span className="fw-medium">{selectedMethodLabel}</span>
              </CDropdownToggle>
              <CDropdownMenu className="shadow border-0 mt-2 py-2">
                {methods.length === 0 && (
                  <CDropdownItem disabled>No methods configured</CDropdownItem>
                )}
                {methods.map((m) => (
                  <CDropdownItem
                    key={m._id}
                    onClick={() => setSelectedPaymentMethod(m._id)}
                    active={selectedPaymentMethod === m._id}
                    className="py-2 px-3"
                  >
                    <strong>{m.name}</strong>
                    {m.description && <div className="text-muted small">{m.description}</div>}
                  </CDropdownItem>
                ))}
              </CDropdownMenu>
            </CDropdown>

            {/* Desktop-only action buttons */}
            <div className="d-none d-md-flex gap-2">
              <CButton
                color="success"
                size="sm"
                className="rounded-pill px-3"
                onClick={handleConfirmAllPayments}
                disabled={!hasUnpaid}
              >
                <CIcon icon={cilCheckCircle} className="me-2" />
                Confirm All
              </CButton>
              <CButton
                color="primary"
                size="sm"
                className="rounded-pill px-3"
                onClick={handleConfirmSelectedPayments}
                disabled={selectedOrders.length === 0}
              >
                <CIcon icon={cilCheckCircle} className="me-2" />
                Confirm Selected ({selectedOrders.length})
              </CButton>
              <CButton
                color="light"
                size="sm"
                variant="outline"
                className="rounded-pill px-3"
                onClick={handlePrintReceipt}
              >
                <CIcon icon={cilPrint} className="me-2" />
                Print
              </CButton>
              <CButton
                color="warning"
                size="sm"
                className="rounded-pill px-3"
                onClick={() => setShowManualModal(true)}
              >
                <CIcon icon={cilPlus} className="me-2" />
                Place Order
              </CButton>
            </div>

            {/* Mobile-only quick actions */}
            <div className="d-flex d-md-none gap-2">
              <CButton
                color="success"
                size="sm"
                className="rounded-pill px-3"
                onClick={handleConfirmAllPayments}
                disabled={!hasUnpaid}
              >
                <CIcon icon={cilCheckCircle} />
              </CButton>
              <CButton
                color="primary"
                size="sm"
                className="rounded-pill px-3"
                onClick={handleConfirmSelectedPayments}
                disabled={selectedOrders.length === 0}
              >
                <CIcon icon={cilCheckCircle} />
              </CButton>
              <CButton
                color="light"
                size="sm"
                variant="outline"
                className="rounded-pill px-3"
                onClick={handlePrintReceipt}
              >
                <CIcon icon={cilPrint} />
              </CButton>
            </div>
          </div>
        </div>

        {/* Desktop summary strip */}
        <div className="td-summary-strip d-none d-md-grid">
          <div className="td-summary-cell">
            <div className="td-summary-label">Unpaid (Table)</div>
            <div className="td-summary-value is-danger">{totals.unpaid.toFixed(2)} TND</div>
          </div>
          <div className="td-summary-cell">
            <div className="td-summary-label">Selected</div>
            <div className="td-summary-value">{selectedTotal} TND</div>
          </div>
          <div className="td-summary-cell">
            <div className="td-summary-label">Tips (paid / total)</div>
            <div className="td-summary-value is-warning">
              {totals.tipsPaid.toFixed(2)} / {totals.tips.toFixed(2)} TND
            </div>
          </div>
          <div className="td-summary-cell">
            <div className="td-summary-label">Total (with tips)</div>
            <div className="td-summary-value is-success">{totals.withTips.toFixed(2)} TND</div>
          </div>
        </div>
      </div>

      {/* Orders list */}
      {orders.length === 0 ? (
        <div className="td-list">
          <div className="td-empty">
            <CIcon icon={cilInfo} size="xl" className="mb-2 text-muted" />
            <div>No orders yet on this table.</div>
          </div>
        </div>
      ) : (
        <div className="td-list">
          {orders.map((order, index) => {
            const status = getOrderStatus(order)
            const unpaid = computeOrderUnpaid(order)
            const isSelected = selectedOrders.some((o) => o.orderId === order._id)
            const isExpanded = !!expandedRows[order._id]

            return (
              <div key={order._id}>
                <div
                  className={`td-row ${isSelected ? 'is-selected' : ''} ${order.payed ? 'is-paid' : ''}`}
                  onClick={() => {
                    if (order.payed) return
                    handleSelectOrder(order._id, order.totalPrice, order.payed)
                  }}
                >
                  <div className="td-row-check">
                    <CFormCheck
                      checked={isSelected}
                      disabled={order.payed}
                      onChange={() => handleSelectOrder(order._id, order.totalPrice, order.payed)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>

                  <div className="td-row-main">
                    <p className="td-row-title">Order #{index + 1}</p>
                    <div className="td-row-meta">
                      <span className={`td-status-pill ${status.key}`}>{status.label}</span>
                      <span>{order.products.length} items</span>
                      {order.tips ? (
                        <span className="td-tip-line">· tip {order.tips.toFixed(2)} TND</span>
                      ) : null}
                    </div>
                  </div>

                  <div className="d-flex align-items-center gap-2">
                    <div className="td-row-amount">
                      {unpaid.toFixed(2)} TND
                      <small>unpaid</small>
                    </div>
                    <CButton
                      color="secondary"
                      size="sm"
                      variant="outline"
                      className="rounded-circle p-1 d-inline-flex align-items-center justify-content-center"
                      style={{ width: 30, height: 30 }}
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleRow(order._id)
                      }}
                      aria-label="Toggle details"
                    >
                      <CIcon icon={isExpanded ? cilChevronTop : cilChevronBottom} />
                    </CButton>
                  </div>
                </div>

                {isExpanded && (
                  <div className="td-expand">
                    <table className="td-expand-table">
                      <thead>
                        <tr>
                          <th>Item</th>
                          <th className="num">Qty</th>
                          <th className="num">Unit</th>
                          <th className="num">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {order.products.map((p) => {
                          const discount =
                            p.product.discountPercentage > 0
                              ? (p.product.discountPercentage / 100) * p.product.price
                              : 0
                          const unit = p.product.price - discount
                          const lineTotal = unit * p.quantity
                          return (
                            <tr key={p._id}>
                              <td>{p.product?.name}</td>
                              <td className="num">{p.quantity}</td>
                              <td className="num">{unit.toFixed(2)}</td>
                              <td className="num">{lineTotal.toFixed(2)}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>

                    <div className="td-expand-actions">
                      <CButton
                        color="primary"
                        size="sm"
                        className="rounded-pill px-3"
                        disabled={order.payed}
                        onClick={() => handleDetailsClick(index)}
                      >
                        Product-level payment
                      </CButton>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Sticky mobile summary */}
      <div className="td-mobile-summary d-md-none">
        <div className="td-summary-cell">
          <div className="td-summary-label">Unpaid</div>
          <div className="td-summary-value is-danger">{totals.unpaid.toFixed(2)}</div>
        </div>
        <div className="td-summary-cell">
          <div className="td-summary-label">Selected</div>
          <div className="td-summary-value">{selectedTotal}</div>
        </div>
        <div className="td-summary-cell">
          <div className="td-summary-label">With Tips</div>
          <div className="td-summary-value is-success">{totals.withTips.toFixed(2)}</div>
        </div>
      </div>

      {/* Mobile FAB – Place Order */}
      <button
        className="td-fab d-md-none"
        onClick={() => setShowManualModal(true)}
        aria-label="Place Order"
      >
        <CIcon icon={cilPlus} size="lg" />
      </button>

      {/* Product-level payment modal */}
      <ProductSelectionModal
        visible={showDetailsModal}
        onClose={handleCloseDetailsModal}
        products={table?.orders[selectedOrderIndex]?.products || []}
        orderId={table?.orders[selectedOrderIndex]?._id}
        refetchData={handleRefetchData}
        paymentMethods={methods}
        onShowToast={showToast}
        isTakeaway={false}
        tableNumber={table?.number}
      />

      {/* Manual order modal */}
      <ManualOrderModal
        visible={showManualModal}
        onClose={setShowManualModal}
        tableId={tableId}
        onOrderPlaced={handlePlaceOrder}
      />
    </div>
  )
}

export default TableDetails
