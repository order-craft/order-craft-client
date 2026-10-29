import { React, useEffect, useMemo, useRef, useState } from 'react'
import {
  CButton,
  CCard,
  CCardBody,
  CCol,
  CFormSelect,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
  CSpinner,
} from '@coreui/react'
import translations from '../../app/Language'
import { useSelector } from 'react-redux'
import CIcon from '@coreui/icons-react'
import {
  cilCheckCircle,
  cilCreditCard,
  cilPrint,
  cilChevronBottom,
  cilChevronTop,
} from '@coreui/icons'
import { GetToken } from '../../helpers/GetToken'
import axios from 'axios'
import { BaseUrl } from '../../helpers/BaseUrl'
import { Br, Cut, Line, Printer, render, Row, Text } from 'react-thermal-printer'
import { printerConnector } from '../../helpers/printerConnector'

// ─────────────────────────────────────────────────────────────
// Product line helper (unchanged — snapshot fallback logic)
// ─────────────────────────────────────────────────────────────
const getProductLine = (line, idx, unknownLabel) => {
  const id = line.product?._id || line.productDetails?._id || `_line-${idx}-${line.quantity ?? 0}`

  const name = line.product?.name || line.productDetails?.name || unknownLabel || 'Unknown item'

  const rawPrice = Number(line.product?.price ?? line.productDetails?.price ?? 0)
  const discount =
    Number(line.product?.discountPercentage ?? line.productDetails?.discountPercentage ?? 0) || 0
  const unitPrice = discount > 0 ? rawPrice * (1 - discount / 100) : rawPrice

  const qty = Number(line.quantity) || 0
  const lineTotal = unitPrice * qty
  const lineTotalRaw = rawPrice * qty

  return {
    id: String(id),
    name,
    rawPrice,
    unitPrice,
    discount,
    qty,
    lineTotal,
    lineTotalRaw,
    hasDiscount: discount > 0,
  }
}

const OrderCard = ({ order, onClick, paymentMethods, refreshOrders, onShowToast }) => {
  const t = useSelector((state) => state.language)
  const Language = translations[t]
  const token = GetToken()

  const [open, setOpen] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [loading, setLoading] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState('')
  const [selectedOrder, setSelectedOrder] = useState()
  const receiptRef = useRef()
  const [printerStatus, setPrinterStatus] = useState(() => printerConnector.getStatus())

  // Subscribe to the shared printer connector
  useEffect(() => {
    const unsubscribe = printerConnector.subscribe((next) => {
      setPrinterStatus(next)
    })
    return unsubscribe
  }, [])

  // ── Receipt builder ────────────────────────────────────────
  async function buildReceipt(order) {
    const receipt = (
      <Printer type="epson" width={58}>
        <Text size={{ width: 2, height: 2 }} bold>
          Order #{order.orderNumber || order._id}
        </Text>
        <Br />
        <Line />
        {order.products.map((p, idx) => {
          const line = getProductLine(p, idx, 'Unknown item')
          return (
            <Row
              key={line.id}
              left={`${line.qty} × ${line.name}`}
              right={`${line.lineTotal.toFixed(2)} DT`}
            />
          )
        })}
        <Line />
        <Row left="Total" right={`${Number(order.totalPrice || 0).toFixed(2)} DT`} />
        <Br />
        <Cut />
      </Printer>
    )

    return render(receipt)
  }

  const handlePrint = async (order) => {
    try {
      if (!printerConnector.isEnabled()) {
        handlePrintReceipt(order)
        return
      }

      const data = await buildReceipt(order)
      await printerConnector.sendRaw(data.buffer)
      onShowToast(Language.receiptSentToPrinter || 'Receipt sent to printer', 'success')
    } catch (error) {
      console.warn(
        '[OrderCard] Printer send failed, falling back to browser print:',
        error?.message,
      )
      handlePrintReceipt(order)
    }
  }

  const handlePrintReceipt = () => {
    try {
      const receiptHtml = receiptRef.current.innerHTML
      const printWindow = window.open('', '_blank', 'width=300,height=600')
      printWindow.document.writeln(`
        <html>
          <head>
            <title>Receipt</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 10px; }
              h3 { margin-bottom: 5px; }
              ul { padding-left: 20px; }
              li { margin-bottom: 5px; }
            </style>
          </head>
          <body>${receiptHtml}</body>
        </html>
      `)
      printWindow.document.close()
      printWindow.focus()
      setTimeout(() => {
        printWindow.print()
        printWindow.close()
      }, 500)
    } catch (error) {
      console.error('Browser printing failed:', error)
      onShowToast(Language.failedToOpenPrintDialog || 'Failed to open print dialog', 'danger')
    }
  }

  // ── Status/type mapping to accent colour + label ──────────
  const statusMeta = useMemo(() => {
    const map = {
      placed: { accent: '#0d6efd', label: Language.placed || 'Placed' },
      pending: { accent: '#f59e0b', label: Language.pending || 'Pending' },
      preparing: { accent: '#0891b2', label: Language.preparing || 'Preparing' },
      ready: { accent: '#16a34a', label: Language.ready || 'Ready' },
      delivered: { accent: '#059669', label: Language.delivered || 'Delivered' },
      completed: { accent: '#198754', label: Language.completed || 'Completed' },
      cancelled: { accent: '#dc2626', label: Language.cancelled || 'Cancelled' },
      archived: { accent: '#94a3b8', label: Language.archived || 'Archived' },
    }
    return map[order.status] || { accent: '#94a3b8', label: order.status }
  }, [order.status, Language])

  const typeLabel = useMemo(() => {
    if (order.orderType === 'to-go') return Language.togo || 'To-go'
    if (order.orderType === 'delivery') return Language.delivery || 'Delivery'
    return order.orderType || 'Dine-in'
  }, [order.orderType, Language])

  // ── Confirm payment ────────────────────────────────────────
  const handleConfirmPayment = async () => {
    setLoading(true)

    try {
      const response = await axios.put(
        `${BaseUrl}/order/confirm/confirm-notdinein-payment`,
        {
          orderId: selectedOrder,
          paymentMethod: paymentMethod,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        },
      )

      if (response.status === 200) {
        const { message, warnings = [], insufficientMaterials = [], deficits = [] } = response.data

        setShowPaymentModal(false)
        setPaymentMethod('')
        setSelectedOrder('')
        refreshOrders()

        onShowToast(message || Language.paymentSuccess || 'Order confirmed successfully', 'success')

        if (warnings.length > 0) {
          warnings.forEach((warning, idx) => {
            setTimeout(() => onShowToast(warning, 'warning'), 500 * (idx + 1))
          })
        }

        if (insufficientMaterials.length > 0) {
          const materialsText = insufficientMaterials.join(', ')
          setTimeout(
            () => onShowToast(`Insufficient stock for materials: ${materialsText}`, 'warning'),
            warnings.length * 500 + 500,
          )
        }

        if (deficits.length > 0) {
          deficits.forEach((d, idx) => {
            const msg = `${d.rawMaterialName}: needed ${d.needed}${d.unit}, had ${d.available}${d.unit} — ${d.deficit}${d.unit} short`
            setTimeout(
              () => onShowToast(msg, 'warning'),
              warnings.length * 500 + insufficientMaterials.length * 500 + 500 * (idx + 1),
            )
          })
        }
      } else {
        onShowToast(Language.failedToConfirmPayment || 'Failed to confirm payment', 'danger')
        setShowPaymentModal(false)
      }
    } catch (error) {
      let errorMessage = Language.failedToConfirmPayment || 'Failed to confirm payment'
      if (error.response) {
        errorMessage = error.response.data?.error || error.response.data?.message || errorMessage
      } else if (error.request) {
        errorMessage = Language.networkError || 'Network error. Please check your connection.'
      }
      console.error('Failed to confirm payment:', error)
      onShowToast(errorMessage, 'danger')
      setShowPaymentModal(false)
    } finally {
      setLoading(false)
    }
  }

  // ── Render ────────────────────────────────────────────────
  return (
    <CCol xs={12} sm={6} md={6} lg={4} xl={3} style={{ alignSelf: 'start' }}>
      <CCard className="oc-card" style={{ '--oc-accent': statusMeta.accent }}>
        {/* Left accent stripe — the status colour */}
        <div className="oc-accent" aria-hidden="true" />

        {/* Header: order number + printer dot + actions */}
        <div className="oc-head">
          <div className="oc-head-left">
            <div className="oc-order-number">
              <span className="oc-order-label">{Language.order || 'Order'}</span>
              <span className="oc-order-value">
                #{order.orderNumber || String(order._id).slice(-4)}
              </span>
            </div>
            <div className="oc-status-text">{statusMeta.label}</div>
          </div>

          <div className="oc-head-actions">
            <span
              className={`oc-printer-dot is-${printerStatus}`}
              title={
                printerStatus === 'connected'
                  ? Language.printerReady || 'Printer ready'
                  : printerStatus === 'error'
                    ? Language.printerError || 'Printer error'
                    : printerStatus === 'disabled'
                      ? 'Printer connection disabled'
                      : Language.printerOffline || 'Printer offline'
              }
              aria-label="Printer status"
            />
            <button
              type="button"
              className={`oc-icon-btn ${order.payed ? 'is-paid' : 'is-pay'}`}
              onClick={(e) => {
                e.stopPropagation()
                if (!order.payed) {
                  setSelectedOrder(order._id)
                  setShowPaymentModal(true)
                }
              }}
              disabled={order.payed}
              title={order.payed ? Language.alreadyPaid : Language.markAsPaid}
              aria-label={order.payed ? Language.alreadyPaid : Language.markAsPaid}
            >
              <CIcon icon={order.payed ? cilCheckCircle : cilCreditCard} />
            </button>
            <button
              type="button"
              className="oc-icon-btn"
              onClick={(e) => {
                e.stopPropagation()
                handlePrint(order)
              }}
              title={Language.printReceiptShort || 'Print receipt'}
              aria-label={Language.printReceiptShort || 'Print receipt'}
            >
              <CIcon icon={cilPrint} />
            </button>
          </div>
        </div>

        {/* Body — clickable to open the order */}
        <CCardBody
          className="oc-body"
          onClick={() => onClick(order)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              onClick(order)
            }
          }}
        >
          {/* Meta row: type pill + time */}
          <div className="oc-meta">
            <span className={`oc-pill oc-pill-type is-${order.orderType || 'dine-in'}`}>
              {typeLabel}
            </span>
            <span className="oc-time">
              {order.timestamp || order.createdAt
                ? new Date(order.timestamp || order.createdAt).toLocaleTimeString(undefined, {
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : ''}
            </span>
          </div>

          {/* Products disclosure */}
          <button
            type="button"
            className="oc-products-toggle"
            onClick={(e) => {
              e.stopPropagation()
              setOpen((v) => !v)
            }}
            aria-expanded={open}
          >
            <span>
              {Language.products || 'Products'} ({order.products.length})
            </span>
            <CIcon icon={open ? cilChevronTop : cilChevronBottom} />
          </button>

          {open && (
            <div className="oc-products">
              {order.products.map((prod, idx) => {
                const line = getProductLine(prod, idx, Language.unknownProduct)
                return (
                  <div key={line.id} className="oc-product-row">
                    <span className="oc-product-name">
                      {line.qty} × {line.name}
                      {line.hasDiscount && (
                        <span className="oc-product-discount">-{line.discount}%</span>
                      )}
                    </span>
                    <span className="oc-product-price">
                      {line.hasDiscount && (
                        <span className="oc-product-price-original">
                          {line.lineTotalRaw.toFixed(2)}
                        </span>
                      )}
                      <span className="oc-product-price-final">{line.lineTotal.toFixed(2)} DT</span>
                    </span>
                  </div>
                )
              })}
            </div>
          )}

          {/* Footer of the body: total */}
          <div className="oc-total-row">
            <span className="oc-total-label">{Language.total || 'Total'}</span>
            <span className="oc-total-value">
              {Number(order.totalPrice || 0).toFixed(2)}
              <span className="oc-total-unit"> DT</span>
            </span>
          </div>
        </CCardBody>

        {/* Payment Method Modal — unified look with the tables modals */}
        <CModal
          visible={showPaymentModal}
          onClose={() => {
            if (loading) return
            setShowPaymentModal(false)
          }}
          alignment="center"
          className="oc-modal"
        >
          <div className="tm-header">
            <div className="tm-header-icon">
              <CIcon icon={cilCreditCard} />
            </div>
            <div className="tm-header-text">
              <h5 className="tm-header-title">{Language.confirmPayment || 'Confirm payment'}</h5>
              <div className="tm-header-sub">
                {Language.order || 'Order'} #{order.orderNumber}
              </div>
            </div>
            <button
              className="tm-close"
              onClick={() => {
                if (loading) return
                setShowPaymentModal(false)
              }}
              aria-label="Close"
              type="button"
            >
              &times;
            </button>
          </div>

          <CModalBody>
            <div className="tm-field">
              <label htmlFor="oc-payment-method">
                {Language.choosePaymentMethod || 'Choose a payment method'}
              </label>
              <CFormSelect
                id="oc-payment-method"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                disabled={loading}
              >
                <option value="">{Language.selectMethod || 'Select method'}</option>
                {paymentMethods.map((m) => (
                  <option key={m._id} value={m._id}>
                    {m.name}
                  </option>
                ))}
              </CFormSelect>
            </div>

            <div className="oc-modal-summary">
              <span className="oc-modal-summary-label">{Language.total || 'Total'}</span>
              <span className="oc-modal-summary-value">
                {Number(order.totalPrice || 0).toFixed(2)} TND
              </span>
            </div>
          </CModalBody>

          <div className="tm-footer">
            <CButton
              color="secondary"
              variant="outline"
              onClick={() => setShowPaymentModal(false)}
              disabled={loading}
            >
              {Language.cancel || 'Cancel'}
            </CButton>
            <CButton
              color="primary"
              disabled={!paymentMethod || loading}
              onClick={handleConfirmPayment}
            >
              {loading && <CSpinner size="sm" className="me-2" />}
              {Language.confirm || 'Confirm'}
            </CButton>
          </div>
        </CModal>

        {/* Hidden receipt template for browser fallback */}
        <div style={{ display: 'none' }}>
          <div ref={receiptRef}>
            <h3>{Language.receiptTitle}</h3>
            <p>
              {Language.order} #{order.orderNumber}
            </p>
            <p>
              {Language.date}: {new Date(order.timestamp || order.createdAt).toLocaleString()}
            </p>
            <ul>
              {order.products.map((prod, idx) => {
                const line = getProductLine(prod, idx, Language.unknownProduct)
                return (
                  <li key={line.id}>
                    {line.name} × {line.qty} — {line.lineTotal.toFixed(2)}DT
                  </li>
                )
              })}
            </ul>
            <p>
              <strong>
                {Language.total}: {Number(order.totalPrice || 0).toFixed(2)} DT
              </strong>
            </p>
            {order.payed && (
              <p>
                {Language.paymentMethodLabel || 'Payment Method'}:{' '}
                {order.paymentMethod?.name || 'Unknown'}
              </p>
            )}
          </div>
        </div>
      </CCard>
    </CCol>
  )
}

export default OrderCard
