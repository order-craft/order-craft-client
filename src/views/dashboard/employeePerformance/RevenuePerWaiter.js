import { useEffect, useState } from 'react'
import {
  CCard,
  CCardHeader,
  CCardBody,
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
  CCol,
  CRow,
  CWidgetStatsF,
} from '@coreui/react'
import axios from 'axios'
import { BaseUrl } from '../../../helpers/BaseUrl'
import { GetToken } from '../../../helpers/GetToken'
import CIcon from '@coreui/icons-react'
import { cilUser, cilCalendar, cilMoney } from '@coreui/icons'

const RevenueByClient = () => {
  const [revenueData, setRevenueData] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const token = GetToken()

  // Calculate totals from existing data
  const totalRevenue = revenueData.reduce((sum, client) => {
    return (
      sum + client.monthlyRevenue.reduce((clientSum, month) => clientSum + month.totalRevenue, 0)
    )
  }, 0)

  const clientCount = revenueData.length

  // Fetch revenue data
  const fetchRevenueByClient = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await axios.get(`${BaseUrl}/dashboard/revenue-by-client`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      setRevenueData(response.data)
    } catch (error) {
      console.error('Error fetching revenue by client:', error)
      setError('Failed to fetch revenue data. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Calculate percentage for progress bar
  const calculatePercentage = (value) => {
    return totalRevenue > 0 ? (value / totalRevenue) * 100 : 0
  }

  // Format currency
  const formatCurrency = (value) => {
    return (
      new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 2,
      }).format(value) + ' TND'
    )
  }

  // Format month name
  const formatMonth = (monthString) => {
    const months = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ]
    const [year, month] = monthString.split('-').map(Number)
    return `${months[month - 1]} ${year}`
  }

  // Fetch data on component mount
  useEffect(() => {
    fetchRevenueByClient()
  }, [])

  return (
    <>
      <CRow className="mb-4">
        <CCol sm={6} lg={3}>
          <CWidgetStatsF
            className="mb-3"
            color="primary"
            icon={<CIcon icon={cilUser} height={24} />}
            title="Total Clients"
            value={clientCount}
          />
        </CCol>
        <CCol sm={6} lg={3}>
          <CWidgetStatsF
            className="mb-3"
            color="info"
            icon={<CIcon icon={cilCalendar} height={24} />}
            title="Time Period"
            value="All Data"
          />
        </CCol>
        <CCol sm={6} lg={3}>
          <CWidgetStatsF
            className="mb-3"
            color="warning"
            icon={<CIcon icon={cilMoney} height={24} />}
            title="Total Revenue"
            value={formatCurrency(totalRevenue)}
          />
        </CCol>
        <CCol sm={6} lg={3}>
          <CWidgetStatsF
            className="mb-3"
            color="success"
            icon={<CIcon icon={cilMoney} height={24} />}
            title="Avg. per Client"
            value={clientCount > 0 ? formatCurrency(totalRevenue / clientCount) : formatCurrency(0)}
          />
        </CCol>
      </CRow>

      <CCard className="mb-4">
        <CCardHeader className="d-flex justify-content-between align-items-center">
          <div>
            <h5 className="mb-0">Revenue by Client</h5>
            <small className="text-medium-emphasis">Detailed breakdown of revenue generated</small>
          </div>
        </CCardHeader>
        <CCardBody>
          {loading ? (
            <div className="text-center py-4">
              <CSpinner color="primary" size="sm" />
              <p className="mt-2">Loading revenue data...</p>
            </div>
          ) : error ? (
            <CAlert color="danger" className="d-flex align-items-center">
              <CIcon icon={cilMoney} className="flex-shrink-0 me-2" width={24} height={24} />
              <div>{error}</div>
            </CAlert>
          ) : (
            <CTable striped hover responsive className="align-middle">
              <CTableHead color="dark">
                <CTableRow>
                  <CTableHeaderCell className="w-25">Client</CTableHeaderCell>
                  <CTableHeaderCell className="w-25">Month</CTableHeaderCell>
                  <CTableHeaderCell className="w-25">Revenue</CTableHeaderCell>
                  <CTableHeaderCell className="w-25">Contribution</CTableHeaderCell>
                </CTableRow>
              </CTableHead>
              <CTableBody>
                {revenueData.length > 0 ? (
                  revenueData.map((client) =>
                    client.monthlyRevenue.map((monthlyData, index) => (
                      <CTableRow key={`${client.clientId}-${index}`}>
                        <CTableDataCell>
                          <div className="fw-semibold">{client.clientName}</div>
                        </CTableDataCell>
                        <CTableDataCell>
                          <CBadge color="secondary">{formatMonth(monthlyData.month)}</CBadge>
                        </CTableDataCell>
                        <CTableDataCell className="fw-bold">
                          {formatCurrency(monthlyData.totalRevenue)}
                        </CTableDataCell>
                        <CTableDataCell>
                          <CProgress className="mb-1" height={10}>
                            <CProgressBar
                              value={calculatePercentage(monthlyData.totalRevenue)}
                              color={
                                calculatePercentage(monthlyData.totalRevenue) > 30
                                  ? 'success'
                                  : calculatePercentage(monthlyData.totalRevenue) > 10
                                    ? 'warning'
                                    : 'danger'
                              }
                            />
                          </CProgress>
                          <small>{calculatePercentage(monthlyData.totalRevenue).toFixed(1)}%</small>
                        </CTableDataCell>
                      </CTableRow>
                    )),
                  )
                ) : (
                  <CTableRow>
                    <CTableDataCell colSpan="4" className="text-center py-4">
                      <div className="text-medium-emphasis">No revenue data available</div>
                      <button
                        className="btn btn-sm btn-primary mt-2"
                        onClick={fetchRevenueByClient}
                      >
                        Retry
                      </button>
                    </CTableDataCell>
                  </CTableRow>
                )}
              </CTableBody>
            </CTable>
          )}
        </CCardBody>
      </CCard>
    </>
  )
}

export default RevenueByClient
