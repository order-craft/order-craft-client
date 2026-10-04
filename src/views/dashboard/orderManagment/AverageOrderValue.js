import { useState } from 'react'
import {
  CCard,
  CCardBody,
  CCardHeader,
  CButton,
  CSpinner,
  CAlert,
  CBadge,
  CRow,
  CCol,
  CFormInput,
  CFormLabel,
  CListGroup,
  CListGroupItem,
} from '@coreui/react'
import axios from 'axios'
import { BaseUrl } from '../../../helpers/BaseUrl'
import { GetToken } from '../../../helpers/GetToken'
import CIcon from '@coreui/icons-react'
import { cilDollar, cilChart, cilFilter, cilCheckCircle } from '@coreui/icons'
import { useSelector } from 'react-redux'
import translations from '../../../app/Language'

const AverageOrderValue = () => {
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [threshold, setThreshold] = useState(100) // Default threshold
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [timeframe, setTimeframe] = useState('custom') // 'today', 'week', 'month', 'custom'

  const token = GetToken()

  const t = useSelector((state) => state.language)
  const Language = translations[t]

  const presetDateRanges = {
    today: () => {
      const today = new Date()
      return {
        start: today.toISOString().split('T')[0],
        end: today.toISOString().split('T')[0],
      }
    },
    week: () => {
      const today = new Date()
      const weekStart = new Date(today)
      weekStart.setDate(today.getDate() - today.getDay())
      return {
        start: weekStart.toISOString().split('T')[0],
        end: today.toISOString().split('T')[0],
      }
    },
    month: () => {
      const today = new Date()
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
      return {
        start: monthStart.toISOString().split('T')[0],
        end: today.toISOString().split('T')[0],
      }
    },
  }

  const handleTimeframeChange = (selected) => {
    setTimeframe(selected)
    if (selected !== 'custom') {
      const { start, end } = presetDateRanges[selected]()
      setStartDate(start)
      setEndDate(end)
    }
  }

  const fetchAverageOrderValue = async () => {
    if (!startDate || !endDate) {
      setError(Language.Pleaseselectbothstartandenddates)
      return
    }

    setLoading(true)
    setError(null)
    setData(null)

    try {
      const response = await axios.post(
        `${BaseUrl}/dashboard/average-order-value`,
        { startDate, endDate, highValueThreshold: threshold },
        { headers: { Authorization: `Bearer ${token}` } },
      )
      setData(response.data)
    } catch (error) {
      console.error('Error fetching average order value:', error)
      setError(error.response?.data?.message || 'Failed to fetch data. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const getValueCategory = (value) => {
    if (value < threshold * 0.5) return Language.Low
    if (value < threshold) return Language.Medium
    if (value < threshold * 1.5) return Language.High
    return Language.Premium
  }

  return (
    <CCard className="dashboard-card">
      <CCardHeader className="dashboard-card-header">
        <h3 className="dashboard-title">
          <CIcon icon={cilDollar} className="me-2" />
          {Language.OrderValueAnalysis}
        </h3>
      </CCardHeader>
      <CCardBody>
        <div className="mb-4">
          <div className="d-flex flex-wrap gap-2 mb-3">
            <CButton
              color={timeframe === 'today' ? 'primary' : 'outline-secondary'}
              onClick={() => handleTimeframeChange('today')}
            >
              {Language.Today}
            </CButton>
            <CButton
              color={timeframe === 'week' ? 'primary' : 'outline-secondary'}
              onClick={() => handleTimeframeChange('week')}
            >
              {Language.ThisWeek}
            </CButton>
            <CButton
              color={timeframe === 'month' ? 'primary' : 'outline-secondary'}
              onClick={() => handleTimeframeChange('month')}
            >
              {Language.ThisMonth}
            </CButton>
            <CButton
              color={timeframe === 'custom' ? 'primary' : 'outline-secondary'}
              onClick={() => handleTimeframeChange('custom')}
            >
              {Language.CustomRange}
            </CButton>
          </div>

          <CRow className="g-3">
            {timeframe === 'custom' && (
              <>
                <CCol md={6}>
                  <CFormLabel>{Language.StartDate}</CFormLabel>
                  <CFormInput
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    max={endDate || new Date().toISOString().split('T')[0]}
                  />
                </CCol>
                <CCol md={6}>
                  <CFormLabel>{Language.EndDate}</CFormLabel>
                  <CFormInput
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    min={startDate}
                    max={new Date().toISOString().split('T')[0]}
                  />
                </CCol>
              </>
            )}
            <CCol md={12}>
              <CFormLabel>
                <CIcon icon={cilFilter} className="me-2" />
                {Language.High_ValueThresholdTND}
              </CFormLabel>
              <CFormInput
                type="number"
                value={threshold}
                onChange={(e) => setThreshold(Number(e.target.value))}
                min="0"
                step="10"
              />
            </CCol>
          </CRow>
        </div>

        <div className="d-flex justify-content-between mb-4">
          <div>
            {startDate && endDate && (
              <CBadge color="info" className="fs-6">
                {new Date(startDate).toLocaleDateString()} -{' '}
                {new Date(endDate).toLocaleDateString()}
              </CBadge>
            )}
          </div>
          <CButton
            color="primary"
            onClick={fetchAverageOrderValue}
            disabled={loading || !startDate || !endDate}
          >
            {loading ? <CSpinner size="sm" /> : <CIcon icon={cilChart} className="me-1" />}
            {loading ? 'Analyzing...' : 'Analyze Orders'}
          </CButton>
        </div>

        {error && (
          <CAlert color="danger" className="mt-3">
            {error}
          </CAlert>
        )}

        {data && (
          <div className="mt-4">
            <h4 className="mb-4 text-center">
              <CIcon icon={cilDollar} className="me-2" />
              {Language.OrderValueInsights}
            </h4>

            <CRow className="g-4 mb-4">
              <CCol md={6}>
                <CCard className="h-100">
                  <CCardBody>
                    <h5 className="d-flex align-items-center">
                      <CIcon icon={cilDollar} className="me-2 text-primary" />
                      {Language.AverageOrderValue}
                    </h5>
                    <div className="text-center my-4">
                      <h2 className="display-4 text-success">
                        {data.averageOrderValue.toFixed(2)} {Language.TND}
                      </h2>
                      <CBadge color="info">
                        {getValueCategory(data.averageOrderValue)} {Language.ValueCategory}
                      </CBadge>
                    </div>
                    <CListGroup flush>
                      <CListGroupItem>
                        <div className="d-flex justify-content-between">
                          <span>{Language.HighestOrder}</span>
                          <span>
                            {Math.max(...data.highValueOrders.map((o) => o.totalPrice)).toFixed(2)}{' '}
                            {Language.TND}
                          </span>
                        </div>
                      </CListGroupItem>
                      <CListGroupItem>
                        <div className="d-flex justify-content-between">
                          <span>{Language.TotalOrders}</span>
                          <span>{data.totalOrders}</span>
                        </div>
                      </CListGroupItem>
                    </CListGroup>
                  </CCardBody>
                </CCard>
              </CCol>

              <CCol md={6}>
                <CCard className="h-100">
                  <CCardBody>
                    <h5 className="d-flex align-items-center">
                      <CIcon icon={cilCheckCircle} className="me-2 text-success" />
                      {Language.HighValueOrders}
                    </h5>
                    <div className="text-center my-4">
                      <h2 className="display-4 text-danger">{data.highValueOrders.length}</h2>
                      <CBadge color="success">
                        {((data.highValueOrders.length / data.totalOrders) * 100).toFixed(1)}% {Language.ofTotal}
                      </CBadge>
                    </div>
                    <CListGroup flush>
                      <CListGroupItem>
                        <div className="d-flex justify-content-between">
                          <span>{Language.TotalValue}</span>
                          <span>
                            {data.highValueOrders
                              .reduce((sum, order) => sum + order.totalPrice, 0)
                              .toFixed(2)}{' '}
                            {Language.TND}
                          </span>
                        </div>
                      </CListGroupItem>
                      <CListGroupItem>
                        <div className="d-flex justify-content-between">
                          <span>{Language.AverageValue}</span>
                          <span>
                            {(
                              data.highValueOrders.reduce(
                                (sum, order) => sum + order.totalPrice,
                                0,
                              ) / (data.highValueOrders.length || 1)
                            ).toFixed(2)}{' '}
                            {Language.TND}
                          </span>
                        </div>
                      </CListGroupItem>
                    </CListGroup>
                  </CCardBody>
                </CCard>
              </CCol>
            </CRow>

            <h5 className="mb-3">
              <CIcon icon={cilDollar} className="me-2" />
              {Language.High_ValueOrderDetails}
            </h5>
            <div className="row g-3">
              {data.highValueOrders.map((order, index) => (
                <div key={order._id} className="col-12 col-md-6 col-lg-4">
                  <div
                    className="p-3 border rounded shadow-sm h-100"
                    style={{
                      borderLeft: '4px solid var(--cui-danger)',
                      background: 'rgba(220, 53, 69, 0.05)',
                    }}
                  >
                    <div className="d-flex justify-content-between mb-2">
                      <CBadge color="danger">#{index + 1}</CBadge>
                      <CBadge color="primary">
                        {new Date(order.timestamp).toLocaleDateString()}
                      </CBadge>
                    </div>
                    <h4 className="text-center text-danger mb-3">
                      {order.totalPrice.toFixed(2)} {Language.TND}
                    </h4>
                    <div className="small text-muted">
                      <div className="d-flex justify-content-between">
                        <span>{Language.Time}:</span>
                        <span>{new Date(order.timestamp).toLocaleTimeString()}</span>
                      </div>
                      {order.tableNumber && (
                        <div className="d-flex justify-content-between">
                          <span>Table:</span>
                          <span>{order.tableNumber}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CCardBody>

      <style>{`
        .dashboard-card {
          border-radius: 15px;
          box-shadow: 0 0.15rem 1.75rem 0 rgba(58, 59, 69, 0.15);
          border: none;
          overflow: hidden;
        }
        .dashboard-card-header {
          background: linear-gradient(135deg, #4e73df 0%, #224abe 100%);
          color: white;
          border-bottom: none;
          padding: 1.5rem;
        }
        .dashboard-title {
          margin: 0;
          font-weight: 600;
          color: white;
        }
      `}</style>
    </CCard>
  )
}

export default AverageOrderValue
