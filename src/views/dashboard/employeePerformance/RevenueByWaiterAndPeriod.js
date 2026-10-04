import React, { useEffect, useState } from 'react'
import {
  CCard,
  CCardHeader,
  CCardBody,
  CFormSelect,
  CFormInput,
  CButton,
  CTable,
  CTableHead,
  CTableRow,
  CTableHeaderCell,
  CTableBody,
  CTableDataCell,
  CSpinner,
  CAlert,
  CBadge,
  CProgress,
  CProgressBar,
  CRow,
  CCol,
  CWidgetStatsF,
  CCallout,
} from '@coreui/react'
import axios from 'axios'
import { BaseUrl } from '../../../helpers/BaseUrl'
import { GetToken } from '../../../helpers/GetToken'
import CIcon from '@coreui/icons-react'
import { cilUser, cilCalendar, cilDollar, cilFilter } from '@coreui/icons'

const RevenueByWaiterAndPeriod = () => {
  const [waiters, setWaiters] = useState([])
  const [selectedWaiter, setSelectedWaiter] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [revenueData, setRevenueData] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const token = GetToken()

  // Calculate totals
  const totalRevenue = revenueData.reduce((sum, waiter) => sum + waiter.totalRevenue, 0)
  const waiterCount = revenueData.length

  // Set default dates to the current month
  useEffect(() => {
    const today = new Date()
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0)

    const formatDate = (date) => date.toISOString().split('T')[0]
    setStartDate(formatDate(firstDayOfMonth))
    setEndDate(formatDate(lastDayOfMonth))
  }, [])

  // Fetch all waiters (clients) for the superClient
  const fetchWaiters = async () => {
    try {
      const response = await axios.get(`${BaseUrl}/auth/superClient/getUsers`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      setWaiters(response.data)
    } catch (error) {
      console.error('Error fetching waiters:', error)
      setError('Failed to fetch waiters. Please try again.')
    }
  }

  // Fetch revenue data
  const fetchRevenue = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await axios.post(
        `${BaseUrl}/dashboard/revenue-by-waiter-and-period`,
        { clientId: selectedWaiter, startDate, endDate },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      )
      setRevenueData(response.data)
    } catch (error) {
      console.error('Error fetching revenue:', error)
      setError('Failed to fetch revenue data. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Format currency
  const formatCurrency = (value) => {
    return (
      new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 2,
      }).format(value) + ' TND'
    )
  }

  // Calculate percentage for progress bar
  const calculatePercentage = (value) => {
    return totalRevenue > 0 ? (value / totalRevenue) * 100 : 0
  }

  // Fetch waiters and revenue data on component mount
  useEffect(() => {
    fetchWaiters()
    fetchRevenue()
  }, [])

  return (
    <CCard className="mb-4">
      <CCardHeader className="d-flex justify-content-between align-items-center">
        <div>
          <h5 className="mb-0">Revenue by Waiter</h5>
          <small className="text-medium-emphasis">Detailed breakdown by selected period</small>
        </div>
        <CBadge color="primary" shape="rounded-pill">
          <CIcon icon={cilFilter} className="me-1" />
          Filter Results
        </CBadge>
      </CCardHeader>

      <CCardBody>
        <CRow className="mb-4 g-3">
          <CCol md={3}>
            <div className="mb-3">
              <label htmlFor="waiter" className="form-label">
                Select Waiter:
              </label>
              <CFormSelect
                id="waiter"
                value={selectedWaiter}
                onChange={(e) => setSelectedWaiter(e.target.value)}
              >
                <option value="">All Waiters</option>
                {waiters.map((waiter) => (
                  <option key={waiter._id} value={waiter._id}>
                    {waiter.fullName}
                  </option>
                ))}
              </CFormSelect>
            </div>
          </CCol>

          <CCol md={3}>
            <div className="mb-3">
              <label htmlFor="startDate" className="form-label">
                Start Date:
              </label>
              <CFormInput
                type="date"
                id="startDate"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
          </CCol>

          <CCol md={3}>
            <div className="mb-3">
              <label htmlFor="endDate" className="form-label">
                End Date:
              </label>
              <CFormInput
                type="date"
                id="endDate"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </CCol>

          <CCol md={3} className="d-flex align-items-end">
            <CButton color="primary" onClick={fetchRevenue} disabled={loading} className="w-100">
              {loading ? <CSpinner size="sm" /> : 'Apply Filters'}
            </CButton>
          </CCol>
        </CRow>

        {error && (
          <CAlert color="danger" className="mt-3 d-flex align-items-center">
            <CIcon icon={cilDollar} className="flex-shrink-0 me-2" />
            <div>{error}</div>
          </CAlert>
        )}

        <CRow className="mb-4">
          <CCol sm={6} lg={3}>
            <CWidgetStatsF
              className="mb-3"
              color="primary"
              icon={<CIcon icon={cilUser} height={24} />}
              title="Waiters"
              value={waiterCount}
            />
          </CCol>
          <CCol sm={6} lg={3}>
            <CWidgetStatsF
              className="mb-3"
              color="info"
              icon={<CIcon icon={cilCalendar} height={24} />}
              title="Period"
              value={`${startDate} to ${endDate}`}
            />
          </CCol>
          <CCol sm={6} lg={3}>
            <CWidgetStatsF
              className="mb-3"
              color="success"
              icon={<CIcon icon={cilDollar} height={24} />}
              title="Total Revenue"
              value={formatCurrency(totalRevenue)}
            />
          </CCol>
          <CCol sm={6} lg={3}>
            <CWidgetStatsF
              className="mb-3"
              color="warning"
              icon={<CIcon icon={cilDollar} height={24} />}
              title="Avg. per Waiter"
              value={
                waiterCount > 0 ? formatCurrency(totalRevenue / waiterCount) : formatCurrency(0)
              }
            />
          </CCol>
        </CRow>

        {revenueData.length > 0 ? (
          <>
            <CCallout color="info" className="mb-4">
              Showing revenue from <strong>{startDate}</strong> to <strong>{endDate}</strong> for{' '}
              {selectedWaiter
                ? waiters.find((w) => w._id === selectedWaiter)?.fullName
                : 'all waiters'}
            </CCallout>

            <CTable striped hover responsive className="mt-4 align-middle">
              <CTableHead color="dark">
                <CTableRow>
                  <CTableHeaderCell>Waiter</CTableHeaderCell>
                  <CTableHeaderCell className="text-end">Revenue</CTableHeaderCell>
                  <CTableHeaderCell>Contribution</CTableHeaderCell>
                </CTableRow>
              </CTableHead>
              <CTableBody>
                {revenueData.map((waiter) => (
                  <CTableRow key={waiter.clientId}>
                    <CTableDataCell>
                      <div className="fw-semibold">{waiter.clientName}</div>
                    </CTableDataCell>
                    <CTableDataCell className="text-end fw-bold">
                      {formatCurrency(waiter.totalRevenue)}
                    </CTableDataCell>
                    <CTableDataCell>
                      <CProgress className="mb-1" height={10}>
                        <CProgressBar
                          value={calculatePercentage(waiter.totalRevenue)}
                          color={
                            calculatePercentage(waiter.totalRevenue) > 30
                              ? 'success'
                              : calculatePercentage(waiter.totalRevenue) > 10
                                ? 'warning'
                                : 'danger'
                          }
                        />
                      </CProgress>
                      <small>{calculatePercentage(waiter.totalRevenue).toFixed(1)}%</small>
                    </CTableDataCell>
                  </CTableRow>
                ))}
              </CTableBody>
            </CTable>
          </>
        ) : (
          <CAlert color="info" className="mt-3 d-flex align-items-center">
            <CIcon icon={cilDollar} className="flex-shrink-0 me-2" />
            <div>
              There is no revenue data for the selected period or waiter.
              {!loading && (
                <CButton color="link" size="sm" onClick={fetchRevenue} className="p-0 ms-2">
                  Try again
                </CButton>
              )}
            </div>
          </CAlert>
        )}
      </CCardBody>
    </CCard>
  )
}

export default RevenueByWaiterAndPeriod
