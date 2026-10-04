import { React, useEffect, useRef, useState } from 'react'
import {
  CAlert,
  CBadge,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CCollapse,
  CFormSelect,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
  CSpinner,
  CToast,
  CToastBody,
  CToaster,
  CToastHeader,
} from '@coreui/react'
import translations from '../../app/Language'
import { useSelector } from 'react-redux'
import CIcon from '@coreui/icons-react'
import { cilCheckCircle, cilCreditCard, cilMoney, cilPrint } from '@coreui/icons'
import { GetToken } from '../../helpers/GetToken'
import axios from 'axios'
import { BaseUrl } from '../../helpers/BaseUrl'
import { Br, Cut, Line, Printer, render, Row, Text } from 'react-thermal-printer'

const OrderCard = ({ order, onClick, paymentMethods, refreshOrders, onShowToast }) => {
  const t = useSelector((state) => state.language)
  const Language = translations[t]
  const token = GetToken()

  const [open, setOpen] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState('')
  const [selectedOrder, setSelectedOrder] = useState()
  const receiptRef = useRef()
  const connectorRef = useRef(null)
  const [ready, setReady] = useState(false)
  const [printerStatus, setPrinterStatus] = useState('disconnected')

  async function createEmulatorConnector() {
    console.log('[Connector] Attempting WebSocket → ws://localhost:8080')
    const ws = new WebSocket('ws://localhost:8080')

    return new Promise((resolve, reject) => {
      ws.onopen = () => {
        console.log('[Connector] WebSocket open ✅')
        setPrinterStatus('connected')
        resolve({
          sendRaw: (buf) => {
            console.log('[Connector] sendRaw', buf.byteLength, 'bytes')
            ws.send(buf)
          },
          close: () => {
            console.log('[Connector] Closing WebSocket')
            ws.close()
            setPrinterStatus('disconnected')
          },
        })
      }
      ws.onerror = (err) => {
        console.error('[Connector] WebSocket error ❌', err)
        setPrinterStatus('error')
        reject(err)
      }
      ws.onclose = () => {
        setPrinterStatus('disconnected')
      }
      setTimeout(() => {
        if (ws.readyState !== WebSocket.OPEN) {
          setPrinterStatus('timeout')
          reject(new Error('WS connection timed out'))
        }
      }, 5000)
    })
  }

  useEffect(() => {
    console.log('[App] useEffect mount, initializing connector…')
    ;(async () => {
      try {
        connectorRef.current = await createEmulatorConnector()
        setReady(true)
        console.log('[App] Connector initialized, ready = true')
      } catch (e) {
        console.error('[App] Failed to init connector:', e)
        onShowToast('Failed to connect to printer', 'danger')
      }
    })()

    return () => {
      if (connectorRef.current) {
        connectorRef.current.close()
      }
    }
  }, [])

  async function buildReceipt(order) {
    const receipt = (
      <Printer type="epson" width={58}>
        <Text size={{ width: 2, height: 2 }} bold>
          Order #{order._id}
        </Text>
        <Br />
        <Line />
        {order.products.map((p) => (
          <Row key={p._id} left={`${p.quantity} × ${p.name}`} right={`$${p.quantity * p.price}`} />
        ))}
        <Line />
        <Row left="Total" right={`$${order.totalPrice}`} />
        <Br />
        <Cut />
      </Printer>
    )

    return render(receipt)
  }

  const handlePrint = async (order) => {
    try {
      console.log('Attempting to print...')

      // First try WebSocket printing
      if (ready && connectorRef.current) {
        const data = await buildReceipt(order)
        await connectorRef.current.sendRaw(data.buffer)
        console.log('Print job sent to emulator')
        onShowToast('Receipt sent to printer', 'success')
        return
      }

      // Fallback to browser printing
      handlePrintReceipt(order)
    } catch (error) {
      console.error('Printing failed:', error)
      // Fallback to browser printing
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
      onShowToast('Failed to open print dialog', 'danger')
    }
  }

  // Map status to badge color
  const statusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'warning'
      case 'preparing':
        return 'info'
      case 'completed':
        return 'success'
      default:
        return 'secondary'
    }
  }

  // Map type to badge color
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

  const handleConfirmPayment = async () => {
    setLoading(true)
    setError('')

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
        const { message, updatedOrder, warnings = [], insufficientMaterials = [] } = response.data

        refreshOrders()

        onShowToast(message || 'Order confirmed successfully', 'success')

        if (warnings.length > 0) {
          warnings.forEach((warning) => {
            setTimeout(() => {
              onShowToast(warning, 'warning')
            }, 500)
          })
        }

        if (insufficientMaterials.length > 0) {
          const materialsText = insufficientMaterials.join(', ')
          setTimeout(
            () => {
              onShowToast(`Insufficient stock for materials: ${materialsText}`, 'warning')
            },
            warnings.length > 0 ? 1000 : 500,
          )
        }

        setSuccess(true)
        setTimeout(() => {
          setSuccess(false)
          setShowPaymentModal(false)
          setPaymentMethod('')
          setSelectedOrder('')
        }, 1500)
      } else {
        onShowToast('Failed to confirm payment', 'danger')
        console.error('Failed to confirm payment')
      }
    } catch (error) {
      let errorMessage = 'Failed to confirm payment'
      if (error.response) {
        errorMessage = error.response.data?.error || error.response.data?.message || errorMessage
      } else if (error.request) {
        errorMessage = 'Network error. Please check your connection.'
      }
      onShowToast(errorMessage, 'danger')
      setError(errorMessage)
      console.error('Failed to confirm payment:', error)
    } finally {
      setLoading(false)
    }
  }

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
                    : 'warning'
              }
              className="me-1"
            >
              {printerStatus === 'connected'
                ? 'Printer Ready'
                : printerStatus === 'error'
                  ? 'Printer Error'
                  : 'Printer Offline'}
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
              title={order.payed ? 'Already paid' : 'Mark as paid'}
            >
              <CIcon icon={order.payed ? cilCheckCircle : cilCreditCard} />
            </CButton>

            {/* Print receipt button */}
            <CButton
              color="outline-dark"
              size="sm"
              onClick={() => handlePrint(order)}
              className="rounded-pill px-3 py-2 m-1 d-flex align-items-center border shadow-sm"
              title="Print receipt"
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

          {/* Products toggle header */}
          <div
            onClick={(e) => {
              e.stopPropagation()
              setOpen(!open)
            }}
            style={{ cursor: 'pointer', fontWeight: 500, marginBottom: '0.5rem' }}
          >
            {open
              ? `▼ ${Language.products} (${order.products.length})`
              : `▶ ${Language.products} (${order.products.length})`}
          </div>

          {/* Products list - shown when expanded */}
          {open && (
            <div className="mb-2">
              {order.products.map((prod) => (
                <div key={prod.product._id} className="d-flex justify-content-between">
                  <span>
                    {prod.quantity} × {prod.product.name}
                  </span>
                  <span>{prod.product.price * prod.quantity} DT</span>
                </div>
              ))}
            </div>
          )}

          {/* Total Price */}
          <div className="mb-2">
            <small className="text-muted">{Language.total || 'Total'}: </small>
            <strong>{order.totalPrice} DT</strong>
          </div>
        </CCardBody>

        {/* Payment Method Modal */}
        <CModal visible={showPaymentModal} onClose={() => setShowPaymentModal(false)}>
          <CModalHeader>
            <CModalTitle>{Language.confirmPayment}</CModalTitle>
          </CModalHeader>
          <CModalBody>
            {/* error or success alerts */}
            {error && <CAlert color="danger">{error}</CAlert>}
            {success && <CAlert color="success">{Language.paymentSuccess}</CAlert>}

            {!success && (
              <>
                <p>{Language.choosePaymentMethod}:</p>
                <CFormSelect
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                >
                  <option value="">{Language.selectMethod}</option>
                  {paymentMethods.map((m) => (
                    <option key={m._id} value={m._id}>
                      {m.name}
                    </option>
                  ))}
                </CFormSelect>
              </>
            )}
          </CModalBody>
          <CModalFooter>
            <CButton color="secondary" onClick={() => setShowPaymentModal(false)}>
              {Language.cancel}
            </CButton>
            <CButton color="primary" disabled={!paymentMethod} onClick={handleConfirmPayment}>
              {loading && <CSpinner size="sm" className="me-2" />}
              {Language.confirm}
            </CButton>
          </CModalFooter>
        </CModal>

        {/* Hidden Receipt Template */}
        <div style={{ display: 'none' }}>
          <div ref={receiptRef}>
            <h3>{Language.receiptTitle}</h3>
            <p>
              {Language.order} #{order.orderNumber}
            </p>
            <p>Date: {new Date(order.createdAt).toLocaleString()}</p>
            <ul>
              {order.products.map((prod) => (
                <li key={prod.product._id}>
                  {prod.product.name} × {prod.quantity} — {prod.product.price * prod.quantity}DT
                </li>
              ))}
            </ul>
            <p>
              <strong>
                {Language.total}:{' '}
                {order.products.reduce((sum, p) => sum + p.quantity * p.product.price, 0)}DT
              </strong>
            </p>
            {order.payed && <p>Payment Method: {order.paymentMethod?.name || 'Unknown'}</p>}
          </div>
        </div>
      </CCard>
    </CCol>
  )
}

export default OrderCard
