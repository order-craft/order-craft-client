import { useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import {
  CRow,
  CCol,
  CButton,
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CTable,
  CTableHead,
  CTableRow,
  CTableHeaderCell,
  CTableBody,
  CTableDataCell,
  CFormInput,
  CAlert,
  CCardBody,
  CCard,
  CProgress,
  CSpinner,
} from '@coreui/react'
import { CChartLine, CChartPie } from '@coreui/react-chartjs'
import axios from 'axios'
import { format } from 'date-fns'
import { GetToken } from '../../../helpers/GetToken'
import { BaseUrl } from '../../../helpers/BaseUrl'
import 'jspdf-autotable'
import { useSelector } from 'react-redux'
import translations from '../../../app/Language'

const RevenueBetweenDates = ({ className }) => {
  const t = useSelector((state) => state.language)
  const Language = translations[t]

  const token = GetToken()
  const [loading, setLoading] = useState(false)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [revenueData, setRevenueData] = useState([])
  const [paymentMethods, setPaymentMethods] = useState({})
  const [modalVisible, setModalVisible] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    const fetchDefaultDates = async () => {
      try {
        setLoading(true)
        const response = await axios.post(
          `${BaseUrl}/dashboard/revenue-between-dates`,
          {},
          { headers: { Authorization: `Bearer ${token}` } },
        )
        setRevenueData(response.data.dailyRevenue)
        setPaymentMethods(response.data.revenueByPaymentMethod || {})
        const today = format(new Date(), 'yyyy-MM-dd')
        const fourteenDaysAgo = format(
          new Date(new Date().setDate(new Date().getDate() - 14)),
          'yyyy-MM-dd',
        )
        setStartDate(fourteenDaysAgo)
        setEndDate(today)
      } catch (err) {
        setErrorMessage('Failed to fetch default dates.')
      } finally {
        setLoading(false)
      }
    }
    fetchDefaultDates()
  }, [token])

  const fetchRevenueBetweenDates = async (newStartDate, newEndDate) => {
    setLoading(true)
    try {
      const response = await axios.post(
        `${BaseUrl}/dashboard/revenue-between-dates`,
        { startDate: newStartDate, endDate: newEndDate },
        { headers: { Authorization: `Bearer ${token}` } },
      )
      setRevenueData(response.data.dailyRevenue)
      setPaymentMethods(response.data.revenueByPaymentMethod || {})
      setErrorMessage('')
    } catch (err) {
      setErrorMessage('Error fetching revenue between dates.')
    } finally {
      setLoading(false)
    }
  }

  const handleDateChange = (e) => {
    const { name, value } = e.target
    if (name === 'endDate' && new Date(value) > new Date()) {
      setErrorMessage("End date can't be greater than today.")
      return
    }
    setErrorMessage('')
    if (name === 'startDate') {
      setStartDate(value)
      fetchRevenueBetweenDates(value, endDate)
    } else if (name === 'endDate') {
      setEndDate(value)
      fetchRevenueBetweenDates(startDate, value)
    }
  }

  const getDayName = (date) => format(date, 'EEEE')

  const completeRevenueData = Array.isArray(revenueData)
    ? revenueData.map((item) => {
        const year = item._id.year || 0
        const month = item._id.month || 1
        const day = item._id.day || 1
        const date = new Date(year, month - 1, day)
        return !isNaN(date)
          ? {
              dayName: getDayName(date),
              date: format(date, 'MMMM, dd, yyyy'),
              dailyRevenue: item.dailyRevenue,
            }
          : {
              dayName: 'Invalid Date',
              date: 'Invalid Date',
              dailyRevenue: 0,
            }
      })
    : []

  const totalRevenue = completeRevenueData.reduce((sum, item) => sum + item.dailyRevenue, 0)

  return (
    <CRow className="w-100 mb-4 justify-content-center g-4">
      <CCol md={4}>
        <CCard className="shadow-sm border-0" style={{ borderRadius: '16px' }}>
          <CCardBody className="p-4">
            <h5 className="mb-4 text-muted">{Language.SelectDateRange}</h5>
            <div className="d-flex flex-column">
              <CFormInput
                type="date"
                name="startDate"
                value={startDate}
                onChange={handleDateChange}
                className="mb-3"
                style={{ borderRadius: '12px', border: '1px solid #e0e0e0' }}
              />
              <CFormInput
                type="date"
                name="endDate"
                value={endDate}
                onChange={handleDateChange}
                style={{ borderRadius: '12px', border: '1px solid #e0e0e0' }}
              />
            </div>
          </CCardBody>
        </CCard>
      </CCol>

      <CCol md={8}>
        {errorMessage && (
          <CAlert color="danger" className="mb-4 rounded-3 shadow-sm">
            {errorMessage}
          </CAlert>
        )}

        <CCard
          className="shadow-sm border-0 p-4 mb-4 w-100 mb-4 justify-content-center"
          style={{ borderRadius: '16px' }}
        >
          <CCardBody className="p-4">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <div>
                <h5 className="text-muted mb-1">{Language.RevenueSummary}</h5>
                <h2 className="mb-0">
                  {loading ? (
                    <CSpinner size="sm" />
                  ) : (
                    <span className="text-primary">
                      {totalRevenue.toFixed(2)} <small className="text-muted fs-6">TND</small>
                    </span>
                  )}
                </h2>
              </div>
              <CButton
                color="primary"
                onClick={() => setModalVisible(true)}
                shape="rounded-pill"
                className="px-4"
              >
                {Language.ViewDetails}
              </CButton>
            </div>

            {!loading && revenueData.length > 0 && (
              <div style={{ height: '120px' }}>
                <CChartLine
                  data={{
                    labels: completeRevenueData.map((item) => item.dayName),
                    datasets: [
                      {
                        backgroundColor: 'rgba(13, 110, 253, 0.1)',
                        borderColor: 'rgba(13, 110, 253, 0.8)',
                        borderWidth: 2,
                        tension: 0.4,
                        pointBackgroundColor: '#fff',
                        pointBorderColor: '#0d6efd',
                        pointBorderWidth: 2,
                        pointRadius: 4,
                        data: completeRevenueData.map((item) => item.dailyRevenue),
                      },
                    ],
                  }}
                  options={{
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        display: false,
                      },
                    },
                    scales: {
                      y: {
                        beginAtZero: true,
                        grid: {
                          color: 'rgba(0, 0, 0, 0.05)',
                        },
                      },
                      x: {
                        grid: {
                          display: false,
                        },
                      },
                    },
                  }}
                />
              </div>
            )}
          </CCardBody>
        </CCard>

        <CCard className="shadow-sm border-0 p-4" style={{ borderRadius: '16px' }}>
          <CCardBody className="p-4">
            <h5 className="mb-4 text-muted">{Language.PaymentMethodsDistribution}</h5>
            <div className="row">
              <div className="col-md-6">
                <div style={{ height: '250px' }}>
                  <CChartPie
                    data={{
                      labels: Object.keys(paymentMethods),
                      datasets: [
                        {
                          data: Object.values(paymentMethods).map((v) => v.toFixed(2)),
                          backgroundColor: [
                            '#20c997',
                            '#0d6efd',
                            '#ffc107',
                            '#fd7e14',
                            '#6f42c1',
                            '#dc3545',
                          ],
                          borderWidth: 0,
                        },
                      ],
                    }}
                    options={{
                      plugins: {
                        legend: {
                          position: 'right',
                          labels: {
                            usePointStyle: true,
                            pointStyle: 'circle',
                            padding: 20,
                          },
                        },
                      },
                      cutout: '70%',
                    }}
                  />
                </div>
              </div>
              <div className="col-md-6">
                <div className="d-flex flex-column justify-content-center h-100">
                  {Object.entries(paymentMethods).map(([method, value], index) => (
                    <div key={method} className="mb-3">
                      <div className="d-flex align-items-center">
                        <span
                          className="d-inline-block rounded-circle me-2"
                          style={{
                            width: '12px',
                            height: '12px',
                            backgroundColor: [
                              '#20c997',
                              '#0d6efd',
                              '#ffc107',
                              '#fd7e14',
                              '#6f42c1',
                              '#dc3545',
                            ][index],
                          }}
                        />
                        <span className="fw-medium">{method}</span>
                        <span className="ms-auto">{value.toFixed(2)} TND</span>
                      </div>
                      <CProgress
                        className="mt-1"
                        height={8}
                        value={(value / totalRevenue) * 100}
                        color={
                          ['success', 'primary', 'warning', 'orange', 'purple', 'danger'][index]
                        }
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CCardBody>
        </CCard>
      </CCol>

      <CModal
        size="lg"
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        backdrop="static"
      >
        <CModalHeader className="border-0 pb-0">
          <CModalTitle className="h4">{Language.RevenueDetails}</CModalTitle>
        </CModalHeader>
        <CModalBody className="pt-0">
          <div className="table-responsive">
            <CTable striped hover className="align-middle">
              <CTableHead>
                <CTableRow>
                  <CTableHeaderCell className="bg-light">{Language.Day}</CTableHeaderCell>
                  <CTableHeaderCell className="bg-light">{Language.Date}</CTableHeaderCell>
                  <CTableHeaderCell className="bg-light text-end">{Language.Revenue} (TND)</CTableHeaderCell>
                </CTableRow>
              </CTableHead>
              <CTableBody>
                {completeRevenueData.map((item, idx) => (
                  <CTableRow key={idx}>
                    <CTableDataCell>
                      <span className="badge bg-light text-dark rounded-pill">{item.dayName}</span>
                    </CTableDataCell>
                    <CTableDataCell>{item.date}</CTableDataCell>
                    <CTableDataCell className="text-end fw-medium">
                      {item.dailyRevenue.toFixed(2)}
                    </CTableDataCell>
                  </CTableRow>
                ))}
              </CTableBody>
            </CTable>
          </div>
        </CModalBody>
        <CModalFooter className="border-0">
          <CButton color="secondary" onClick={() => setModalVisible(false)} shape="rounded-pill">
            {Language.Close}
          </CButton>
          <CButton color="primary" shape="rounded-pill">
            {Language.ExportasPDF}
          </CButton>
        </CModalFooter>
      </CModal>
    </CRow>
  )
}

RevenueBetweenDates.propTypes = {
  className: PropTypes.string,
}

export default RevenueBetweenDates
