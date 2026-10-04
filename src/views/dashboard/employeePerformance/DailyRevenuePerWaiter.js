import React, { useEffect, useState } from 'react'
import {
  CCard,
  CCardHeader,
  CCardBody,
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
  CProgress,
  CProgressBar,
  CRow,
  CCol,
  CWidgetStatsF,
  CBadge,
  CCallout,
} from '@coreui/react'
import axios from 'axios'
import { BaseUrl } from '../../../helpers/BaseUrl'
import { GetToken } from '../../../helpers/GetToken'
import CIcon from '@coreui/icons-react'
import { cilUser, cilCalendar, cilDollar, cilChart } from '@coreui/icons'

const DailyRevenuePerWaiter = () => {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [revenueData, setRevenueData] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const token = GetToken()

  // Calculate metrics
  const totalRevenue = revenueData.reduce((sum, waiter) => sum + waiter.totalRevenue, 0)
  const averageRevenue = revenueData.length > 0 ? totalRevenue / revenueData.length : 0
  const topWaiter =
    revenueData.length > 0
      ? revenueData.reduce((max, waiter) => (waiter.totalRevenue > max.totalRevenue ? waiter : max))
      : null

  // Fetch daily revenue per waiter
  const fetchDailyRevenue = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await axios.post(
        `${BaseUrl}/dashboard/daily-revenue-per-waiter`,
        { date },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      )
      setRevenueData(response.data)
    } catch (error) {
      console.error('Error fetching daily revenue:', error)
      setError('Failed to fetch daily revenue. Please try again.')
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

  // Get color based on performance
  const getPerformanceColor = (revenue) => {
    if (revenue >= averageRevenue * 1.5) return 'success'
    if (revenue >= averageRevenue) return 'info'
    if (revenue >= averageRevenue * 0.5) return 'warning'
    return 'danger'
  }

  // Calculate progress value (scaled to the top performer)
  const calculateProgressValue = (revenue) => {
    if (!topWaiter || topWaiter.totalRevenue === 0) return 0
    return (revenue / topWaiter.totalRevenue) * 100
  }

  // Fetch data on component mount or when date changes
  useEffect(() => {
    fetchDailyRevenue()
  }, [date])

  return (
    <CCard className="mb-4">
      <CCardHeader className="d-flex justify-content-between align-items-center">
        <div>
          <h5 className="mb-0">Daily Revenue per Waiter</h5>
          <small className="text-medium-emphasis">Performance breakdown by day</small>
        </div>
        <CBadge color="primary" shape="rounded-pill">
          <CIcon icon={cilCalendar} className="me-1" />
          {new Date(date).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </CBadge>
      </CCardHeader>

      <CCardBody>
        <div className="mb-4">
          <CRow className="g-3 align-items-end">
            <CCol md={4}>
              <label htmlFor="date" className="form-label">
                Select Date:
              </label>
              <CFormInput
                type="date"
                id="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </CCol>
            <CCol md={2}>
              <CButton
                color="primary"
                onClick={fetchDailyRevenue}
                disabled={loading}
                className="w-100"
              >
                {loading ? <CSpinner size="sm" /> : 'Refresh'}
              </CButton>
            </CCol>
          </CRow>
        </div>

        {error && (
          <CAlert color="danger" className="d-flex align-items-center">
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
              title="Total Waiters"
              value={revenueData.length}
            />
          </CCol>
          <CCol sm={6} lg={3}>
            <CWidgetStatsF
              className="mb-3"
              color="info"
              icon={<CIcon icon={cilDollar} height={24} />}
              title="Total Revenue"
              value={formatCurrency(totalRevenue)}
            />
          </CCol>
          <CCol sm={6} lg={3}>
            <CWidgetStatsF
              className="mb-3"
              color="warning"
              icon={<CIcon icon={cilChart} height={24} />}
              title="Average"
              value={formatCurrency(averageRevenue)}
            />
          </CCol>
          <CCol sm={6} lg={3}>
            <CWidgetStatsF
              className="mb-3"
              color="success"
              icon={<CIcon icon={cilUser} height={24} />}
              title="Top Waiter"
              value={
                topWaiter ? `${topWaiter.name} (${formatCurrency(topWaiter.totalRevenue)})` : 'N/A'
              }
            />
          </CCol>
        </CRow>

        {loading ? (
          <div className="text-center py-4">
            <CSpinner color="primary" size="sm" />
            <p className="mt-2">Loading revenue data...</p>
          </div>
        ) : revenueData.length > 0 ? (
          <>
            <CCallout color="info" className="mb-4">
              Showing revenue for <strong>{new Date(date).toLocaleDateString()}</strong>.
              {topWaiter &&
                ` Top performer: ${topWaiter.name} with ${formatCurrency(topWaiter.totalRevenue)}`}
            </CCallout>

            <CTable striped hover responsive className="align-middle">
              <CTableHead color="dark">
                <CTableRow>
                  <CTableHeaderCell>Waiter</CTableHeaderCell>
                  <CTableHeaderCell className="text-end">Revenue</CTableHeaderCell>
                  <CTableHeaderCell>Performance</CTableHeaderCell>
                </CTableRow>
              </CTableHead>
              <CTableBody>
                {revenueData.map((waiter, index) => (
                  <CTableRow key={index}>
                    <CTableDataCell>
                      <div className="fw-semibold">{waiter.name}</div>
                      {waiter.totalRevenue === topWaiter?.totalRevenue && (
                        <CBadge color="success" shape="rounded-pill" className="ms-2">
                          Top Performer
                        </CBadge>
                      )}
                    </CTableDataCell>
                    <CTableDataCell className="text-end fw-bold">
                      {formatCurrency(waiter.totalRevenue)}
                    </CTableDataCell>
                    <CTableDataCell>
                      <CProgress className="mb-1" height={20}>
                        <CProgressBar
                          value={calculateProgressValue(waiter.totalRevenue)}
                          color={getPerformanceColor(waiter.totalRevenue)}
                        />
                      </CProgress>
                      <small>
                        {calculateProgressValue(waiter.totalRevenue).toFixed(1)}% of top performer
                      </small>
                    </CTableDataCell>
                  </CTableRow>
                ))}
              </CTableBody>
            </CTable>
          </>
        ) : (
          <CAlert color="info" className="d-flex align-items-center">
            <CIcon icon={cilDollar} className="flex-shrink-0 me-2" />
            <div>
              No revenue data available for {new Date(date).toLocaleDateString()}.
              {!loading && (
                <CButton color="link" size="sm" onClick={fetchDailyRevenue} className="p-0 ms-2">
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

export default DailyRevenuePerWaiter
