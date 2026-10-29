import { React, useEffect, useRef, useState } from 'react'
import {
  CBadge,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
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
import { cilCheckCircle, cilCreditCard, cilPrint } from '@coreui/icons'
import { GetToken } from '../../helpers/GetToken'
import axios from 'axios'
import { BaseUrl } from '../../helpers/BaseUrl'
import { Br, Cut, Line, Printer, render, Row, Text } from 'react-thermal-printer'
import { printerConnector } from '../../helpers/printerConnector'

// ─────────────────────────────────────────────────────────────
// Product line helper
//
// Order documents store two parallel shapes for a product reference:
//   - `product`         → populated Product document (may be null if the
//                         product was deleted after the order was placed)
//   - `productDetails`  → snapshot { _id, name, price } captured at order
//                         creation time
// Every rendering path goes through this helper so the fallback is
// consistent.
// ─────────────────────────────────────────────────────────────
const getProductLine = (line, idx, unknownLabel) => {
  const id = line.product?._id || line.productDetails?._id || `_line-${idx}-${line.quantity ?? 0}`

  const name = line.product?.name || line.productDetails?.name || unknownLabel || 'Unknown item'

  const unitPrice = Number(line.product?.price ?? line.productDetails?.price ?? 0)
  const qty = Number(line.quantity) || 0
  const lineTotal = unitPrice * qty

  return { id: String(id), name, unitPrice, qty, lineTotal }
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

  // ── Subscribe to the shared printer connector ─────────────
  useEffect(() => {
    const unsubscribe = printerConnector.subscribe((next) => {
      setPrinterStatus(next)
    })
    return unsubscribe
  }, [])

  // ── Receipt builder (thermal printer) ─────────────────────
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

  // ── Print ─────────────────────────────────────────────────
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

  // ── Status color for the badge ────────────────────────────
  const statusColor = (status) => {
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

  const typeColor = (type) => {
    switch (type) {
      case 'to-go':
        return 'primary'
      case 'delivery':
        return 'dark'
      default:
        return 'secondary'
    }
  }

  // ── Confirm payment ───────────────────────────────────────
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

        // Close the modal immediately; the toast carries the confirmation.
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

      // Close the modal so the user can retry from the card if they want.
      setShowPaymentModal(false)
    } finally {
      setLoading(false)
    }
  }

  // ── Render ────────────────────────────────────────────────
  return (
    <CCol xs={12} sm={6} md={6} lg={4} xl={3}>
      <CCard className="h-100 clickable-card" style={{ cursor: 'pointer' }}>
        <CCardHeader className="d-flex justify-content-between align-items-center">
          <strong>
            {Language.order} #{order.orderNumber}
          </strong>

          <div className="btn-group">
            {/* Printer status badge */}
            <CBadge
              size="sm"
              color={
                printerStatus === 'connected'
                  ? 'success'
                  : printerStatus === 'error'
                    ? 'danger'
                    : printerStatus === 'disabled'
                      ? 'secondary'
                      : 'warning'
              }
              className="me-1"
              title={
                printerStatus === 'disabled'
                  ? 'Printer connection disabled'
                  : printerStatus === 'connecting'
                    ? 'Connecting to printer…'
                    : undefined
              }
            >
              {printerStatus === 'connected'
                ? Language.printerReady || 'Printer Ready'
                : printerStatus === 'error'
                  ? Language.printerError || 'Printer Error'
                  : Language.printerOffline || 'Printer Offline'}
            </CBadge>

            {/* Confirm payment button */}
            <CButton
              color={order.payed ? 'secondary' : 'success'}
              size="sm"
              onClick={() => {
                if (!order.payed) {
                  setSelectedOrder(order._id)
                  setShowPaymentModal(true)
                }
              }}
              disabled={order.payed}
              className="rounded-pill px-3 py-2 m-1 d-flex align-items-center shadow-sm"
              title={order.payed ? Language.alreadyPaid : Language.markAsPaid}
            >
              <CIcon icon={order.payed ? cilCheckCircle : cilCreditCard} />
            </CButton>

            {/* Print receipt button */}
            <CButton
              color="outline-dark"
              size="sm"
              onClick={() => handlePrint(order)}
              className="rounded-pill px-3 py-2 m-1 d-flex align-items-center border shadow-sm"
              title={Language.printReceiptShort}
            >
              <CIcon icon={cilPrint} />
            </CButton>
          </div>
        </CCardHeader>

        <CCardBody onClick={() => onClick(order)}>
          {/* Type & Status */}
          <div className="mb-2">
            <CBadge color={typeColor(order.orderType)} className="me-1">
              {Language.type}: {order.orderType}
            </CBadge>
            <CBadge color={statusColor(order.status)}>
              {Language.status}: {order.status}
            </CBadge>
          </div>

          {/* Products toggle */}
          <div
            onClick={(e) => {
              e.stopPropagation()
              setOpen(!open)
            }}
            style={{
              cursor: 'pointer',
              fontWeight: 500,
              marginBottom: '0.5rem',
            }}
          >
            {open
              ? `▼ ${Language.products} (${order.products.length})`
              : `▶ ${Language.products} (${order.products.length})`}
          </div>

          {/* Products list */}
          {open && (
            <div className="mb-2">
              {order.products.map((prod, idx) => {
                const line = getProductLine(prod, idx, Language.unknownProduct)
                return (
                  <div key={line.id} className="d-flex justify-content-between">
                    <span>
                      {line.qty} × {line.name}
                    </span>
                    <span>{line.lineTotal.toFixed(2)} DT</span>
                  </div>
                )
              })}
            </div>
          )}

          {/* Total Price */}
          <div className="mb-2">
            <small className="text-muted">{Language.total || 'Total'}: </small>
            <strong>{Number(order.totalPrice || 0).toFixed(2)} DT</strong>
          </div>
        </CCardBody>

        {/* Payment Method Modal */}
        <CModal
          visible={showPaymentModal}
          onClose={() => {
            if (loading) return
            setShowPaymentModal(false)
          }}
        >
          <CModalHeader>
            <CModalTitle>{Language.confirmPayment}</CModalTitle>
          </CModalHeader>
          <CModalBody>
            <p>{Language.choosePaymentMethod}:</p>
            <CFormSelect
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              disabled={loading}
            >
              <option value="">{Language.selectMethod}</option>
              {paymentMethods.map((m) => (
                <option key={m._id} value={m._id}>
                  {m.name}
                </option>
              ))}
            </CFormSelect>
          </CModalBody>
          <CModalFooter>
            <CButton
              color="secondary"
              onClick={() => setShowPaymentModal(false)}
              disabled={loading}
            >
              {Language.cancel}
            </CButton>
            <CButton
              color="primary"
              disabled={!paymentMethod || loading}
              onClick={handleConfirmPayment}
            >
              {loading && <CSpinner size="sm" className="me-2" />}
              {Language.confirm}
            </CButton>
          </CModalFooter>
        </CModal>

        {/* Hidden receipt template for browser print fallback */}
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
