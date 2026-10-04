import React, { useEffect, useRef, useState } from 'react'
import PropTypes from 'prop-types'
import {
  CRow,
  CCol,
  CWidgetStatsA,
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
  CCard,
  CCardBody,
  CProgress,
  CAlert,
} from '@coreui/react'
import { getStyle } from '@coreui/utils'
import { CChartLine, CChartPie } from '@coreui/react-chartjs'
import axios from 'axios'
import { format } from 'date-fns'
import { GetToken } from '../../../helpers/GetToken'
import { BaseUrl } from '../../../helpers/BaseUrl'
import jsPDF from 'jspdf'
import 'jspdf-autotable'
import * as XLSX from 'xlsx'
import { useSelector } from 'react-redux'
import translations from '../../../app/Language'

const CurrentMonthRevenue = ({ className }) => {
  const t = useSelector((state) => state.language)
  const Language = translations[t]

  const widgetChartRef = useRef(null)
  const token = GetToken()
  const [loading, setLoading] = useState(false)
  const [monthlyRevenue, setMonthlyRevenue] = useState([])
  const [revenueByPaymentMethod, setRevenueByPaymentMethod] = useState({})
  const [totalRevenue, setTotalRevenue] = useState(0)
  const [previousMonthRevenue, setPreviousMonthRevenue] = useState(0)
  const [growth, setGrowth] = useState(0)
  const [modalVisible, setModalVisible] = useState(false)
  const [exportLoading, setExportLoading] = useState(false)

  const today = new Date().getDate()

  const getCurrentMonthRevenue = async () => {
    setLoading(true)
    try {
      const response = await axios.get(`${BaseUrl}/dashboard/monthly-revenue`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      setMonthlyRevenue(response.data.dailyRevenue || [])
      setRevenueByPaymentMethod(response.data.revenueByPaymentMethod || {})
      setTotalRevenue(response.data.totalRevenue || 0)
    } catch (err) {
      console.log('Error fetching current month revenue')
      console.error(err)
    }
    setLoading(false)
  }

  const getCurrentMonthGrowthRate = async () => {
    setLoading(true)
    try {
      const response = await axios.get(`${BaseUrl}/dashboard/monthly-revenue-growth`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      setGrowth(response.data.growthRate)
      setPreviousMonthRevenue(response.data.previousMonthRevenue)
    } catch (err) {
      console.log('Error fetching current month growth rate')
      console.error(err)
    }
    setLoading(false)
  }

  const getDayName = (date) => format(date, 'EEEE')

  const completeMonthlyData = Array.from({ length: today }, (_, index) => {
    const day = index + 1
    const revenueForDay = monthlyRevenue.find((item) => item._id.day === day)?.dailyRevenue || 0
    return {
      dayName: getDayName(new Date(new Date().getFullYear(), new Date().getMonth(), day)),
      date: format(new Date(new Date().getFullYear(), new Date().getMonth(), day), 'MMMM dd, yyyy'),
      dailyRevenue: revenueForDay,
    }
  })

  const exportToPDF = () => {
    setExportLoading(true)
    const doc = new jsPDF()
    doc.text(`Monthly Revenue Report - ${format(new Date(), 'MMMM yyyy')}`, 15, 10)
    doc.autoTable({
      head: [[Language.day, Language.date, `${Language.revenue} (TND)`]],
      body: completeMonthlyData.map((item) => [
        item.dayName,
        item.date,
        item.dailyRevenue.toFixed(2),
      ]),
      startY: 20,
      styles: { cellPadding: 5, fontSize: 10 },
      headStyles: { fillColor: [41, 128, 185] },
    })
    doc.save(`monthly-revenue-${format(new Date(), 'yyyy-MM')}.pdf`)
    setExportLoading(false)
  }

  const exportToExcel = () => {
    setExportLoading(true)
    const ws = XLSX.utils.json_to_sheet(
      completeMonthlyData.map((item) => ({
        Day: item.dayName,
        Date: item.date,
        Revenue: item.dailyRevenue,
      })),
    )
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Monthly Revenue')
    XLSX.writeFile(wb, `monthly-revenue-${format(new Date(), 'yyyy-MM')}.xlsx`)
    setExportLoading(false)
  }

  useEffect(() => {
    document.documentElement.addEventListener('ColorSchemeChange', () => {
      if (widgetChartRef.current) {
        setTimeout(() => {
          widgetChartRef.current.data.datasets[0].pointBackgroundColor = getStyle('--cui-info')
          widgetChartRef.current.update()
        })
      }
    })
    getCurrentMonthRevenue()
    getCurrentMonthGrowthRate()
  }, [widgetChartRef])

  return (
    <div className={className} style={{ minWidth: '100%' }}>
      <CCard className="shadow-sm border-0 mb-4" style={{ borderRadius: '16px', minWidth: '100%' }}>
        <CCardBody className="p-4">
          <CRow className="g-4">
            <CCol md={8}>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <div>
                  <h5 className="text-muted mb-1">{Language.CurrentMonthRevenue}</h5>
                  <h2 className="mb-0">
                    {loading ? (
                      <CSpinner size="sm" />
                    ) : (
                      <>
                        <span className="text-primary">{totalRevenue.toFixed(2)}</span>
                        <small className="text-muted fs-6"> TND</small>
                        <span
                          className={`ms-2 badge bg-${growth >= 0 ? 'success' : 'danger'} bg-opacity-10 text-${growth >= 0 ? 'success' : 'danger'}`}
                        >
                          {growth >= 0 ? '↑' : '↓'} {Math.abs(growth)}%
                        </span>
                      </>
                    )}
                  </h2>
                  <small className="text-muted">
                    {Language.previousMonth}: {previousMonthRevenue.toFixed(2)} TND
                  </small>
                </div>
                <div>
                  <CButton
                    color="primary"
                    onClick={() => setModalVisible(true)}
                    shape="rounded-pill"
                    className="me-2"
                  >
                    {Language.details}
                  </CButton>
                  <CDropdown>
                    <CDropdownToggle color="outline-secondary" shape="rounded-pill">
                      {Language.export}
                    </CDropdownToggle>
                    <CDropdownMenu>
                      <CDropdownItem onClick={exportToPDF} disabled={exportLoading}>
                        {exportLoading ? <CSpinner size="sm" /> : 'PDF'}
                      </CDropdownItem>
                      <CDropdownItem onClick={exportToExcel} disabled={exportLoading}>
                        {exportLoading ? <CSpinner size="sm" /> : 'Excel'}
                      </CDropdownItem>
                    </CDropdownMenu>
                  </CDropdown>
                </div>
              </div>

              <div style={{ height: '150px', minWidth: '100%' }}>
                <CChartLine
                  ref={widgetChartRef}
                  data={{
                    labels: completeMonthlyData.map((item) => item.dayName.substring(0, 3)),
                    datasets: [
                      {
                        label: 'Daily Revenue',
                        backgroundColor: 'rgba(13, 110, 253, 0.1)',
                        borderColor: 'rgba(13, 110, 253, 0.8)',
                        borderWidth: 2,
                        tension: 0.4,
                        pointBackgroundColor: '#fff',
                        pointBorderColor: '#0d6efd',
                        pointBorderWidth: 2,
                        pointRadius: 4,
                        data: completeMonthlyData.map((item) => item.dailyRevenue),
                      },
                    ],
                  }}
                  options={{
                    maintainAspectRatio: false,
                    responsive: true,
                    plugins: {
                      legend: { display: false },
                      tooltip: {
                        callbacks: {
                          label: (context) => {
                            return `${context.parsed.y.toFixed(2)} TND`
                          },
                        },
                      },
                    },
                    scales: {
                      y: {
                        beginAtZero: true,
                        grid: {
                          color: 'rgba(0, 0, 0, 0.05)',
                        },
                        ticks: {
                          callback: (value) => `${value} TND`,
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
            </CCol>

            <CCol md={4}>
              <h5 className="text-muted mb-3">{Language.paymentMethods}</h5>
              <div style={{ height: '200px', minWidth: '100%' }}>
                <CChartPie
                  data={{
                    labels: Object.keys(revenueByPaymentMethod),
                    datasets: [
                      {
                        data: Object.values(revenueByPaymentMethod),
                        backgroundColor: [
                          '#007bff',
                          '#28a745',
                          '#ffc107',
                          '#dc3545',
                          '#6610f2',
                          '#17a2b8',
                          '#6c757d',
                          '#fd7e14',
                          '#e83e8c',
                          '#20c997',
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
                          padding: 15,
                          font: {
                            size: 10,
                          },
                        },
                      },
                      tooltip: {
                        callbacks: {
                          label: (context) => {
                            const value = context.raw
                            const total = context.dataset.data.reduce((a, b) => a + b, 0)
                            const percentage = Math.round((value / total) * 100)
                            return `${context.label}: ${value.toFixed(2)} TND (${percentage}%)`
                          },
                        },
                      },
                    },
                    cutout: '60%',
                    maintainAspectRatio: false,
                    responsive: true,
                  }}
                />
              </div>
            </CCol>
          </CRow>
        </CCardBody>
      </CCard>

      <CModal
        size="lg"
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        backdrop="static"
      >
        <CModalHeader className="border-0 pb-0">
          <CModalTitle className="h4">
            {Language.CurrentMonthRevenue} {format(new Date(), 'MMMM yyyy')}
          </CModalTitle>
        </CModalHeader>
        <CModalBody className="pt-0">
          <div className="table-responsive" style={{ minWidth: '100%' }}>
            <CTable striped hover className="align-middle" style={{ minWidth: '100%' }}>
              <CTableHead>
                <CTableRow>
                  <CTableHeaderCell className="bg-light">{Language.day}</CTableHeaderCell>
                  <CTableHeaderCell className="bg-light">{Language.date}</CTableHeaderCell>
                  <CTableHeaderCell className="bg-light text-end">
                    {Language.revenue} (TND)
                  </CTableHeaderCell>
                  <CTableHeaderCell className="bg-light text-end">Progress</CTableHeaderCell>
                </CTableRow>
              </CTableHead>
              <CTableBody>
                {completeMonthlyData.map((item, idx) => {
                  const progressValue = (item.dailyRevenue / totalRevenue) * 100
                  return (
                    <CTableRow key={idx}>
                      <CTableDataCell>
                        <span className="badge bg-light text-dark rounded-pill">
                          {item.dayName}
                        </span>
                      </CTableDataCell>
                      <CTableDataCell>{item.date}</CTableDataCell>
                      <CTableDataCell className="text-end fw-medium">
                        {item.dailyRevenue.toFixed(2)}
                      </CTableDataCell>
                      <CTableDataCell>
                        <CProgress
                          height={20}
                          value={progressValue}
                          color={getProgressColor(progressValue)}
                          animated
                        />
                      </CTableDataCell>
                    </CTableRow>
                  )
                })}
                <CTableRow className="fw-bold">
                  <CTableDataCell colSpan={2} className="text-end">
                    Total:
                  </CTableDataCell>
                  <CTableDataCell className="text-end text-primary">
                    {completeMonthlyData
                      .reduce((sum, item) => sum + item.dailyRevenue, 0)
                      .toFixed(2)}
                  </CTableDataCell>
                  <CTableDataCell>
                    <CProgress height={20} value={100} color="success" />
                  </CTableDataCell>
                </CTableRow>
              </CTableBody>
            </CTable>
          </div>
        </CModalBody>
        <CModalFooter className="border-0">
          <CButton color="secondary" onClick={() => setModalVisible(false)} shape="rounded-pill">
            {Language.close}
          </CButton>
          <CButton
            color="primary"
            onClick={exportToPDF}
            shape="rounded-pill"
            disabled={exportLoading}
          >
            {exportLoading ? <CSpinner size="sm" /> : 'Export as PDF'}
          </CButton>
        </CModalFooter>
      </CModal>
    </div>
  )
}

// Helper function to determine progress bar color based on value
const getProgressColor = (value) => {
  if (value > 75) return 'success'
  if (value > 50) return 'info'
  if (value > 25) return 'warning'
  return 'danger'
}

CurrentMonthRevenue.propTypes = {
  className: PropTypes.string,
}

export default CurrentMonthRevenue
