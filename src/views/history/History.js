import React, { useState, useMemo, useCallback } from 'react'
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
  CForm,
  CFormLabel,
  CFormInput,
} from '@coreui/react'
import axios from 'axios'
import jsPDF from 'jspdf'
import 'jspdf-autotable'
import { format } from 'date-fns'
import { GetToken } from '../../helpers/GetToken'
import { BaseUrl } from '../../helpers/BaseUrl'
import { useSelector } from 'react-redux'
import translations from '../../app/Language'

const ArchivedOrdersByDate = () => {
  const token = GetToken()

  // Language
  const t = useSelector((state) => state.language)
  const Language = translations[t]
  const memoizedLanguage = useMemo(
    () => ({
      title: Language.user + ' ' + (Language.orders || 'Orders'),
      pickRange: Language.pickRange || 'Pick date range',
      startDate: Language.startDate || 'Start date',
      endDate: Language.endDate || 'End date',
      apply: Language.apply || 'Apply',
      exportPdf: Language.exportPdf || 'Export PDF',
      totalRevenue: `${Language.total} ${Language.revenue}`,
      totalTips: `${Language.total} ${Language.tips || 'Tips'}`,
      products: Language.products,
      totalPrice: `${Language.total}${Language.price}`,
      date: Language.date,
      loading: Language.loading || 'Loading...',
      errorMessage: Language.errorMessage || 'An error occurred',
      noOrders: Language.noOrders || 'No orders found',
    }),
    [t],
  )

  // Default range: last 7 days
  const todayStr = format(new Date(), 'yyyy-MM-dd')
  const sevenDaysAgoStr = format(new Date(Date.now() - 6 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd')

  const [startDate, setStartDate] = useState(sevenDaysAgoStr)
  const [endDate, setEndDate] = useState(todayStr)

  const [orders, setOrders] = useState([])
  const [totalRevenue, setTotalRevenue] = useState(0)
  const [totalTips, setTotalTips] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const formatDate = (dateString) => {
    try {
      return format(new Date(dateString), 'yyyy-MM-dd HH:mm')
    } catch {
      return dateString || 'N/A'
    }
  }

  const fetchOrdersByRange = useCallback(async () => {
    if (!token) {
      setError('Authentication token not found')
      return
    }

    try {
      setLoading(true)
      setError(null)

      // Send dates in req.body exactly as requested by your controller
      const body = {
        startDate, // e.g., "2025-08-01"
        endDate, // e.g., "2025-08-27"
      }

      // 🔧 Adjust the route if you mounted the controller elsewhere
      const res = await axios.post(`${BaseUrl}/dashboard/history`, body, {
        headers: { Authorization: `Bearer ${token}` },
      })

      const data = res.data || {}
      const list = data.orders || []

      setOrders(list)
      setTotalRevenue(data.totalRevenue || 0)

      const tips = list.reduce((sum, order) => sum + (order.tips || 0), 0)
      setTotalTips(tips)
    } catch (err) {
      console.error(err)
      setError(err.response?.data?.message || 'Failed to fetch orders')
    } finally {
      setLoading(false)
    }
  }, [token, startDate, endDate])

  const generatePDF = useCallback(() => {
    const doc = new jsPDF()
    const genDate = format(new Date(), 'yyyy-MM-dd HH:mm')
    const pageWidth = doc.internal.pageSize.width

    // Header
    doc.setFontSize(18)
    doc.text('Archived Orders (By Date Range)', 14, 15)
    doc.setFontSize(12)
    doc.text(`Range: ${startDate} → ${endDate}`, 14, 22)
    doc.text(`Generated on: ${genDate}`, 14, 29)

    // Totals
    doc.setFontSize(12)
    doc.text(`Total Revenue: ${totalRevenue.toFixed(2)} TND`, pageWidth - 80, 15)
    doc.text(`Total Tips: ${totalTips.toFixed(2)} TND`, pageWidth - 80, 22)
    doc.text(`Grand Total: ${(totalRevenue + totalTips).toFixed(2)} TND`, pageWidth - 80, 29)

    // Table
    const tableData = orders.flatMap((order) =>
      (order.products || []).map((p) => [
        p.productName || 'N/A',
        p.quantity || 0,
        `${(p.productPrice || 0).toFixed(2)} TND`,
        `${(p.totalPrice || p.total || p.quantity * (p.productPrice || 0)).toFixed(2)} TND`,
        `${(order.tips || 0).toFixed(2)} TND`,
        formatDate(order.timestamp),
      ]),
    )

    doc.autoTable({
      head: [['Product', 'Qty', 'Unit Price', 'Total', 'Tips', 'Date']],
      body: tableData,
      startY: 40,
      headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      margin: { top: 40 },
    })

    doc.save(`archived-orders-${startDate}-to-${endDate}.pdf`)
  }, [orders, startDate, endDate, totalRevenue, totalTips])

  return (
    <CContainer className="py-4">
      <CRow className="mb-4">
        <CCol xs={12} md={8}>
          <h2 className="mb-3">{memoizedLanguage.title}</h2>
          <p className="text-muted">{memoizedLanguage.pickRange}</p>
          <CForm
            onSubmit={(e) => {
              e.preventDefault()
              fetchOrdersByRange()
            }}
          >
            <CRow className="g-3">
              <CCol xs={12} md={4}>
                <CFormLabel htmlFor="startDate">{memoizedLanguage.startDate}</CFormLabel>
                <CFormInput
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                />
              </CCol>
              <CCol xs={12} md={4}>
                <CFormLabel htmlFor="endDate">{memoizedLanguage.endDate}</CFormLabel>
                <CFormInput
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  required
                />
              </CCol>
              <CCol xs={12} md={4} className="d-flex align-items-end">
                <CButton color="primary" type="submit" disabled={loading} className="w-100">
                  {loading ? (
                    <>
                      <CSpinner size="sm" className="me-2" />
                      {memoizedLanguage.loading}
                    </>
                  ) : (
                    memoizedLanguage.apply
                  )}
                </CButton>
              </CCol>
            </CRow>
          </CForm>
        </CCol>

        <CCol xs={12} md={4} className="mt-4 mt-md-0">
          <div className="bg-light p-3 rounded text-center mb-3">
            <h6 className="mb-1">{memoizedLanguage.totalRevenue}</h6>
            <h4 className="mb-0 text-primary">{totalRevenue.toFixed(2)} TND</h4>
          </div>
          <div className="bg-light p-3 rounded text-center">
            <h6 className="mb-1">{memoizedLanguage.totalTips}</h6>
            <h4 className="mb-0 text-success">{totalTips.toFixed(2)} TND</h4>
          </div>
        </CCol>
      </CRow>

      {error && (
        <CAlert color="danger" className="mb-4">
          {memoizedLanguage.errorMessage}: {error}
        </CAlert>
      )}

      {loading && orders.length === 0 ? (
        <div className="text-center my-5">
          <CSpinner color="primary" />
          <p className="mt-3">{memoizedLanguage.loading}</p>
        </div>
      ) : orders.length === 0 ? (
        <CContainer className="text-center mt-5">
          <h2>{memoizedLanguage.noOrders}</h2>
        </CContainer>
      ) : (
        <>
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
            <CCardBody className="d-flex justify-content-center gap-3">
              <CButton color="secondary" variant="outline" onClick={generatePDF}>
                {memoizedLanguage.exportPdf}
              </CButton>
            </CCardBody>
          </CCard>
        </>
      )}
    </CContainer>
  )
}

export default React.memo(ArchivedOrdersByDate)
