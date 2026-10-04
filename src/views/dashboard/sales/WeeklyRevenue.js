import { useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import {
  CRow,
  CCol,
  CSpinner,
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
  CDropdown,
  CDropdownMenu,
  CDropdownToggle,
  CDropdownItem,
  CProgress,
  CBadge,
  CCard,
  CCardBody,
} from '@coreui/react'
import { CChartPie } from '@coreui/react-chartjs'
import axios from 'axios'
import { format, eachDayOfInterval, startOfWeek, endOfWeek } from 'date-fns'
import { GetToken } from '../../../helpers/GetToken'
import { BaseUrl } from '../../../helpers/BaseUrl'
import jsPDF from 'jspdf'
import 'jspdf-autotable'
import * as XLSX from 'xlsx'
import { useSelector } from 'react-redux'
import translations from '../../../app/Language'
import CIcon from '@coreui/icons-react'
import { cilChart, cilArrowTop, cilArrowBottom, cilCloudDownload, cilInfo } from '@coreui/icons'

const CurrentWeekRevenue = ({ className }) => {
  const token = GetToken()
  const [loading, setLoading] = useState(false)
  const [weeklyRevenue, setWeeklyRevenue] = useState([])
  const [growthRate, setGrowthRate] = useState(0)
  const [revenueByMethod, setRevenueByMethod] = useState({})
  const [modalVisible, setModalVisible] = useState(false)
  const [selectedDay, setSelectedDay] = useState(null)

  const t = useSelector((state) => state.language)
  const Language = translations[t]

  const today = new Date()
  const weekStart = startOfWeek(today)
  const weekEnd = endOfWeek(today)
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd })

  const getDayName = (date) => format(date, 'EEEE')
  const getShortDayName = (date) => format(date, 'EEE')

  // To discuss for trans
  const completeWeeklyData = weekDays.map((date) => {
    const day = date.getDate()
    const revenueForDay = weeklyRevenue.find((item) => item._id.day === day)?.dailyRevenue || 0
    return {
      dayName: getDayName(date),
      shortDayName: getShortDayName(date),
      date: format(date, 'MMMM dd, yyyy'),
      dailyRevenue: revenueForDay,
    }
  })

  const getCurrentWeekRevenue = async () => {
    setLoading(true)
    try {
      const response = await axios.get(`${BaseUrl}/dashboard/weekly-revenue`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      const { dailyRevenue, growthRate, revenueByPaymentMethod } = response.data
      setWeeklyRevenue(dailyRevenue)
      setGrowthRate(growthRate)
      setRevenueByMethod(revenueByPaymentMethod || {})
    } catch (err) {
      console.error('Error fetching current week revenue', err)
    }
    setLoading(false)
  }

  useEffect(() => {
    getCurrentWeekRevenue()
  }, [])

  const exportToPDF = () => {
    const doc = new jsPDF()
    doc.setFontSize(16)
    doc.text(Language.CurrentWeekRevenueDetails, 14, 16)
    doc.setFontSize(12)
    doc.text(`${Language.Generatedon} ${format(new Date(), 'MMMM dd, yyyy')}`, 14, 24)
    doc.autoTable({
      startY: 30,
      head: [[Language.Day, Language.Date, `${Language.Revenue} (TND)`]],
      body: completeWeeklyData.map((item) => [
        item.dayName,
        item.date,
        item.dailyRevenue.toFixed(2),
      ]),
      styles: { cellPadding: 5, fontSize: 10 },
      headStyles: { fillColor: [79, 115, 223] },
    })
    doc.save(`week-revenue-${format(new Date(), 'yyyy-MM-dd')}.pdf`)
  }

  const exportToExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(
      completeWeeklyData.map((item) => ({
        Day: item.dayName,
        Date: item.date,
        'Revenue (TND)': item.dailyRevenue.toFixed(2),
      })),
    )
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Weekly Revenue')
    XLSX.writeFile(workbook, `week-revenue-${format(new Date(), 'yyyy-MM-dd')}.xlsx`)
  }

  const totalWeekRevenue = completeWeeklyData.reduce((sum, item) => sum + item.dailyRevenue, 0)
  const maxDailyRevenue = Math.max(...completeWeeklyData.map((item) => item.dailyRevenue))
  const getProgressColor = (value) => {
    if (value > 75) return 'success'
    if (value > 50) return 'info'
    if (value > 25) return 'warning'
    return 'danger'
  }
  return (
    <CCard className="dashboard-card">
      <CCardBody>
        <CRow className={className} xs={{ gutter: 4 }}>
          <CCol>
            <div className="dashboard-header">
              <h5 className="dashboard-title">
                <CIcon icon={cilChart} className="me-2" />
                {Language.CurrentWeekRevenue}
              </h5>
              <div className="dashboard-actions">
                <CButton
                  color="primary"
                  variant="outline"
                  size="sm"
                  onClick={() => setModalVisible(true)}
                  className="me-2"
                >
                  <CIcon icon={cilInfo} className="me-1" />
                  {Language.details}
                </CButton>
                <CDropdown>
                  <CDropdownToggle color="secondary" size="sm">
                    <CIcon icon={cilCloudDownload} className="me-1" />
                    {Language.Export}
                  </CDropdownToggle>
                  <CDropdownMenu>
                    <CDropdownItem onClick={exportToPDF}>{Language.ExporttoPDF}</CDropdownItem>
                    <CDropdownItem onClick={exportToExcel}>{Language.ExporttoExel}</CDropdownItem>
                  </CDropdownMenu>
                </CDropdown>
              </div>
            </div>

            <div className="revenue-summary">
              {loading ? (
                <div className="text-center py-4">
                  <CSpinner color="primary" />
                </div>
              ) : (
                <>
                  <div className="total-revenue">
                    <h3>{totalWeekRevenue.toFixed(2)} TND</h3>
                    <CBadge
                      color={growthRate >= 0 ? 'success' : 'danger'}
                      shape="rounded-pill"
                      className="ms-2"
                    >
                      {growthRate >= 0 ? (
                        <CIcon icon={cilArrowTop} className="me-1" />
                      ) : (
                        <CIcon icon={cilArrowBottom} className="me-1" />
                      )}
                      {Math.abs(growthRate).toFixed(2)}%
                    </CBadge>
                  </div>

                  <div className="daily-revenue-bars mt-4">
                    {completeWeeklyData.map((day, index) => (
                      <div
                        key={index}
                        className={`day-revenue d-flex flex-column align-items-center p-2 ${
                          selectedDay === index ? 'active bg-light' : ''
                        }`}
                        onClick={() => setSelectedDay(index)}
                        style={{ cursor: 'pointer', minWidth: '60px' }}
                      >
                        <div className="day-label fw-semibold mb-2 text-uppercase">
                          {day.shortDayName}
                        </div>
                        <div className="w-100 px-2">
                          <CProgress
                            color={getProgressColor((day.dailyRevenue / maxDailyRevenue) * 100)}
                            value={
                              maxDailyRevenue > 0 ? (day.dailyRevenue / maxDailyRevenue) * 100 : 0
                            }
                            className="mb-2"
                            height={6}
                          />
                        </div>
                        <div className="day-amount small fw-bold">
                          {day.dailyRevenue.toFixed(2)} TND
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </CCol>
        </CRow>

        {/* Enhanced Modal with revenue details */}
        <CModal
          visible={modalVisible}
          onClose={() => setModalVisible(false)}
          size="lg"
          backdrop="static"
        >
          <CModalHeader closeButton>
            <CModalTitle>
              <CIcon icon={cilChart} className="me-2" />
              {Language.CurrentWeekRevenueDetails}
            </CModalTitle>
          </CModalHeader>
          <CModalBody>
            <CRow>
              <CCol md={6}>
                <div className="table-container">
                  <CTable striped hover responsive>
                    <CTableHead>
                      <CTableRow>
                        <CTableHeaderCell>{Language.Day}</CTableHeaderCell>
                        <CTableHeaderCell>{Language.date}</CTableHeaderCell>
                        <CTableHeaderCell className="text-end">
                          {Language.revenue} (TND)
                        </CTableHeaderCell>
                      </CTableRow>
                    </CTableHead>
                    <CTableBody>
                      {completeWeeklyData.map((item, index) => (
                        <CTableRow key={index}>
                          <CTableDataCell>{item.dayName}</CTableDataCell>
                          <CTableDataCell>{item.date}</CTableDataCell>
                          <CTableDataCell className="text-end">
                            {item.dailyRevenue.toFixed(2)}
                          </CTableDataCell>
                        </CTableRow>
                      ))}
                      <CTableRow className="fw-bold">
                        <CTableDataCell colSpan="2">Total</CTableDataCell>
                        <CTableDataCell className="text-end">
                          {totalWeekRevenue.toFixed(2)}
                        </CTableDataCell>
                      </CTableRow>
                    </CTableBody>
                  </CTable>
                </div>
              </CCol>
              <CCol md={6}>
                <div className="chart-container">
                  <h6 className="text-center mb-3">{Language.RevenueByPaymentMethod}</h6>
                  <CChartPie
                    data={{
                      labels: Object.keys(revenueByMethod),
                      datasets: [
                        {
                          data: Object.values(revenueByMethod).map((v) => parseFloat(v.toFixed(2))),
                          backgroundColor: [
                            '#4e73df',
                            '#1cc88a',
                            '#36b9cc',
                            '#f6c23e',
                            '#e74a3b',
                            '#858796',
                          ],
                          hoverBackgroundColor: [
                            '#2e59d9',
                            '#17a673',
                            '#2c9faf',
                            '#dda20a',
                            '#be2617',
                            '#6c757d',
                          ],
                        },
                      ],
                    }}
                    options={{
                      plugins: {
                        legend: {
                          position: 'bottom',
                          labels: {
                            usePointStyle: true,
                            padding: 20,
                          },
                        },
                        tooltip: {
                          callbacks: {
                            label: function (context) {
                              const label = context.label || ''
                              const value = context.raw || 0
                              const percentage = ((value / totalWeekRevenue) * 100).toFixed(1)
                              return `${label}: ${value.toFixed(2)} TND (${percentage}%)`
                            },
                          },
                        },
                      },
                      cutout: '60%',
                    }}
                  />
                </div>
              </CCol>
            </CRow>
          </CModalBody>
          <CModalFooter>
            <CButton color="secondary" onClick={() => setModalVisible(false)}>
              {Language.close}
            </CButton>
          </CModalFooter>
        </CModal>

        <style>{`
          .dashboard-card {
            border-radius: 12px;
            box-shadow: 0 0.15rem 1rem rgba(0, 0, 0, 0.05);
            border: none;
          }

          .dashboard-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 1.5rem;
          }

          .dashboard-title {
            font-weight: 600;
            color: #4e73df;
            margin: 0;
          }

          .dashboard-actions {
            display: flex;
            align-items: center;
          }

          .revenue-summary {
            padding: 0.5rem 0;
          }

          .total-revenue {
            display: flex;
            align-items: center;
            margin-bottom: 1rem;
          }

          .daily-revenue-bars {
            display: flex;
            justify-content: space-between;
            gap: 0.5rem;
          }

          .day-revenue {
            flex: 1;
            text-align: center;
            cursor: pointer;
            padding: 0.5rem;
            border-radius: 8px;
            transition: all 0.2s;
          }

          .day-revenue:hover,
          .day-revenue.active {
            background-color: #f8f9fa;
          }

          .day-label {
            font-size: 0.8rem;
            font-weight: 600;
            color: #5a5c69;
          }

          .day-amount {
            font-size: 0.75rem;
            color: #858796;
          }

          .table-container {
            max-height: 400px;
            overflow-y: auto;
          }

          .chart-container {
            height: 300px;
            position: relative;
          }
        `}</style>
      </CCardBody>
    </CCard>
  )
}

CurrentWeekRevenue.propTypes = {
  className: PropTypes.string,
}

export default CurrentWeekRevenue
