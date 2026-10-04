import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  CTable,
  CTableBody,
  CTableHead,
  CTableRow,
  CTableHeaderCell,
  CTableDataCell,
  CButton,
  CContainer,
  CCard,
  CCardBody,
  CCol,
  CRow,
  CSpinner,
  CAlert,
} from '@coreui/react'
import axios from 'axios'
import jsPDF from 'jspdf'
import 'jspdf-autotable'
import { GetToken } from '../../helpers/GetToken'
import { BaseUrl } from '../../helpers/BaseUrl'
import { useSelector } from 'react-redux'
import translations from '../../app/Language'
import { format } from 'date-fns'

const OrdersComponent = () => {
  const [orders, setOrders] = useState([])
  const [totalRevenue, setTotalRevenue] = useState(0)
  const [totalTips, setTotalTips] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const token = GetToken()

  // Language
  const t = useSelector((state) => state.language)
  const Language = translations[t]

  // Memoized language strings
  const memoizedLanguage = useMemo(
    () => ({
      noOrders: Language.noOrders,
      userOrders: `${Language.user} ${Language.orders}`,
      totalRevenue: `${Language.total} ${Language.revenue}`,
      totalTips: `${Language.total} ${Language.tips || 'Tips'}`,
      products: Language.products,
      totalPrice: `${Language.total}${Language.price}`,
      date: Language.date,
      dailyReceiptBtn: Language.dailyReceiptBtn,
      loading: Language.loading || 'Loading...',
      errorMessage: Language.errorMessage || 'An error occurred',
    }),
    [t],
  )

  // Function to fetch user orders
  const fetchOrders = useCallback(async () => {
    if (!token) {
      setError('Authentication token not found')
      return
    }

    try {
      setLoading(true)
      setError(null)
      const response = await axios.get(`${BaseUrl}/dashboard/daily-receipt`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      setOrders(response.data.orders || [])
      setTotalRevenue(response.data.totalRevenue || 0)

      const calculatedTips = (response.data.orders || []).reduce(
        (sum, order) => sum + (order.tips || 0),
        0,
      )
      setTotalTips(calculatedTips)
    } catch (error) {
      console.error('Error fetching orders', error)
      setError(error.response?.data?.message || 'Failed to fetch orders')
    } finally {
      setLoading(false)
    }
  }, [token])

  // Function to handle closing orders and generating receipt
  const handleCloseOrdersAndPrintReceipt = useCallback(async () => {
    if (!token) {
      setError('Authentication token not found')
      return
    }

    try {
      setLoading(true)
      const response = await axios.post(`${BaseUrl}/dashboard/close-daily`, null, {
        headers: { Authorization: `Bearer ${token}` },
      })

      generatePDFReceipt(response.data.closedOrders || [])
      await fetchOrders() // Refresh the orders after closing
    } catch (error) {
      console.error('Error closing orders', error)
      setError(error.response?.data?.message || 'Failed to close orders')
    } finally {
      setLoading(false)
    }
  }, [token, fetchOrders])

  // Function to generate a PDF receipt
  const generatePDFReceipt = useCallback((orders) => {
    const doc = new jsPDF()
    const date = format(new Date(), 'yyyy-MM-dd HH:mm')
    const pageWidth = doc.internal.pageSize.width

    // Header
    doc.setFontSize(18)
    doc.text('Daily Receipt Summary', 14, 15)
    doc.setFontSize(12)
    doc.text(`Generated on: ${date}`, 14, 22)

    // Calculations
    const revenue = orders.reduce(
      (sum, order) => sum + (order.products || []).reduce((acc, p) => acc + (p.total || 0), 0),
      0,
    )

    const tips = orders.reduce((sum, order) => sum + (order.tips || 0), 0)

    // Totals
    doc.setFontSize(12)
    doc.text(`Total Revenue: ${revenue.toFixed(2)} TND`, pageWidth - 60, 15)
    doc.text(`Total Tips: ${tips.toFixed(2)} TND`, pageWidth - 60, 22)
    doc.text(`Grand Total: ${(revenue + tips).toFixed(2)} TND`, pageWidth - 60, 29)

    // Table data
    const tableData = orders.flatMap((order) =>
      (order.products || []).map((product) => [
        product.name || 'N/A',
        product.quantity || 0,
        `${(product.price || 0).toFixed(2)} TND`,
        `${(product.total || 0).toFixed(2)} TND`,
        `${(order.tips || 0).toFixed(2)} TND`,
        format(new Date(order.timestamp), 'yyyy-MM-dd HH:mm'),
      ]),
    )

    // Generate table
    doc.autoTable({
      head: [['Product', 'Qty', 'Unit Price', 'Total', 'Tips', 'Date']],
      body: tableData,
      startY: 40,
      headStyles: {
        fillColor: [41, 128, 185],
        textColor: 255,
        fontStyle: 'bold',
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245],
      },
      margin: { top: 40 },
    })

    doc.save(`daily-receipt-${date}.pdf`)
  }, [])

  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  // Format date function
  const formatDate = (dateString) => {
    try {
      return format(new Date(dateString), 'yyyy-MM-dd HH:mm')
    } catch {
      return dateString || 'N/A'
    }
  }

  if (loading && orders.length === 0) {
    return (
      <CContainer className="text-center mt-5">
        <CSpinner color="primary" />
        <p className="mt-3">{memoizedLanguage.loading}</p>
      </CContainer>
    )
  }

  if (!loading && error) {
    return (
      <CContainer className="mt-5">
        <CAlert color="danger">
          {memoizedLanguage.errorMessage}: {error}
          <CButton color="link" onClick={fetchOrders} className="p-0 ml-2">
            Retry
          </CButton>
        </CAlert>
      </CContainer>
    )
  }

  if (!loading && orders.length === 0) {
    return (
      <CContainer className="text-center mt-5">
        <h2>{memoizedLanguage.noOrders}</h2>
      </CContainer>
    )
  }

  return (
    <CContainer className="py-4">
      <CRow className="mb-4 align-items-center">
        <CCol xs={12} md={6}>
          <h2 className="mb-3 mb-md-0">{memoizedLanguage.userOrders}</h2>
        </CCol>
        <CCol xs={12} md={6} className="text-md-right">
          <div className="d-flex flex-column flex-md-row justify-content-md-end gap-3">
            <div className="bg-light p-3 rounded text-center">
              <h5 className="mb-0">{memoizedLanguage.totalRevenue}</h5>
              <h4 className="mb-0 text-primary">{totalRevenue.toFixed(2)} TND</h4>
            </div>
            <div className="bg-light p-3 rounded text-center">
              <h5 className="mb-0">{memoizedLanguage.totalTips}</h5>
              <h4 className="mb-0 text-success">{totalTips.toFixed(2)} TND</h4>
            </div>
          </div>
        </CCol>
      </CRow>

      <div className="table-responsive">
        <CTable hover striped responsive>
          <CTableHead>
            <CTableRow>
              <CTableHeaderCell>#</CTableHeaderCell>
              <CTableHeaderCell>{memoizedLanguage.products}</CTableHeaderCell>
              <CTableHeaderCell>{memoizedLanguage.totalPrice}</CTableHeaderCell>
              <CTableHeaderCell>{memoizedLanguage.totalTips}</CTableHeaderCell>
              <CTableHeaderCell>{memoizedLanguage.date}</CTableHeaderCell>
            </CTableRow>
          </CTableHead>
          <CTableBody>
            {orders.map((order, index) => (
              <CTableRow key={order.orderId || index}>
                <CTableDataCell>{index + 1}</CTableDataCell>
                <CTableDataCell>
                  <ul className="list-unstyled mb-0">
                    {order.products?.map((product, pIndex) => (
                      <li key={pIndex}>
                        {product.productName} - {product.quantity} × {product.productPrice} TND
                      </li>
                    ))}
                  </ul>
                </CTableDataCell>
                <CTableDataCell>{order.totalPrice?.toFixed(2) || '0.00'} TND</CTableDataCell>
                <CTableDataCell>{order.tips?.toFixed(2) || '0.00'} TND</CTableDataCell>
                <CTableDataCell>{formatDate(order.timestamp)}</CTableDataCell>
              </CTableRow>
            ))}
          </CTableBody>
        </CTable>
      </div>

      <CCard className="mt-4 shadow-sm">
        <CCardBody className="d-flex justify-content-center">
          <CButton
            color="primary"
            className="px-5 py-3"
            onClick={handleCloseOrdersAndPrintReceipt}
            disabled={loading}
          >
            {loading ? (
              <>
                <CSpinner size="sm" className="mr-2" />
                {memoizedLanguage.loading}
              </>
            ) : (
              memoizedLanguage.dailyReceiptBtn
            )}
          </CButton>
        </CCardBody>
      </CCard>
    </CContainer>
  )
}

export default React.memo(OrdersComponent)
