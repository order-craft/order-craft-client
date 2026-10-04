import { useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import {
  CRow,
  CCol,
  CSpinner,
  CButton,
  CDropdown,
  CDropdownToggle,
  CDropdownMenu,
  CDropdownItem,
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
  CBadge,
  CProgress,
  CCardHeader,
  CCard,
  CCardBody,
} from '@coreui/react'
import { CChartLine } from '@coreui/react-chartjs'
import axios from 'axios'
import jsPDF from 'jspdf'
import 'jspdf-autotable'
import * as XLSX from 'xlsx'
import { BaseUrl } from '../../../helpers/BaseUrl'
import { GetToken } from '../../../helpers/GetToken'
import { useSelector } from 'react-redux'
import translations from '../../../app/Language'
import CIcon from '@coreui/icons-react'
import { cilChart, cilCloudDownload, cilInfo } from '@coreui/icons'

const YearlyRevenue = ({ className }) => {
  // Language setup
  const t = useSelector((state) => state.language)
  const Language = translations[t]
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

  // Export functions
  const exportToPDF = (yearlyRevenue) => {
    const doc = new jsPDF()
    doc.setFontSize(16)
    doc.text('Yearly Revenue Report', 14, 16)
    doc.setFontSize(12)
    doc.text(`Generated on ${new Date().toLocaleDateString()}`, 14, 24)
    doc.autoTable({
      startY: 30,
      head: [['Month', 'Revenue (TND)']],
      body: yearlyRevenue.map((item, index) => [months[index], item.revenue.toFixed(2)]),
      styles: { cellPadding: 5, fontSize: 10 },
      headStyles: { fillColor: [79, 115, 223] },
    })
    doc.save(`yearly-revenue-${new Date().getFullYear()}.pdf`)
  }

  const exportToExcel = (yearlyRevenue) => {
    const worksheet = XLSX.utils.json_to_sheet(
      yearlyRevenue.map((item, index) => ({
        Month: months[index],
        'Revenue (TND)': item.revenue.toFixed(2),
      })),
    )
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Yearly Revenue')
    XLSX.writeFile(workbook, `yearly-revenue-${new Date().getFullYear()}.xlsx`)
  }

  const token = GetToken()
  const [loading, setLoading] = useState(false)
  const [yearlyRevenue, setYearlyRevenue] = useState([])
  const [modalVisible, setModalVisible] = useState(false)
  const [selectedMonth, setSelectedMonth] = useState(null)

  const getYearlyRevenue = async () => {
    setLoading(true)
    try {
      const response = await axios.get(`${BaseUrl}/dashboard/revenue-year`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setYearlyRevenue(response.data)
    } catch (err) {
      console.error('Error fetching yearly revenue:', err)
    }
    setLoading(false)
  }

  useEffect(() => {
    getYearlyRevenue()
  }, [])

  const totalRevenue = yearlyRevenue.reduce((sum, item) => sum + item.revenue, 0)

  return (
    <div style={{ minWidth: '100%' }}>
      <CCard className="dashboard-card" style={{ minWidth: '100%' }}>
        <CCardHeader className="dashboard-card-header">
          <div className="d-flex justify-content-between align-items-center">
            <h3 className="dashboard-title">
              <CIcon icon={cilChart} className="me-2" />
              {Language.YearlyRevenue}
            </h3>
            <CBadge color="primary">{new Date().getFullYear()}</CBadge>
          </div>
        </CCardHeader>
        <CCardBody className="dashboard-card-body">
          {loading ? (
            <div className="text-center py-5">
              <CSpinner color="primary" style={{ width: '3rem', height: '3rem' }} />
              <p className="mt-3">{Language.Loading}...</p>
            </div>
          ) : (
            <>
              <CRow className="mb-4">
                <CCol xs={12} className="mb-4">
                  <div className="total-revenue-card">
                    <h4 className="text-muted">{Language.TotalYearlyRevenue}</h4>
                    <h1 className="display-4 fw-bold text-primary">
                      {totalRevenue.toFixed(2)} TND
                    </h1>
                  </div>
                </CCol>
              </CRow>

              <CRow>
                <CCol xs={12} lg={8}>
                  <div className="chart-container" style={{ height: '300px' }}>
                    <CChartLine
                      data={{
                        labels: months.map((month) => month.substring(0, 3)),
                        datasets: [
                          {
                            label: 'Monthly Revenue',
                            backgroundColor: 'rgba(78, 115, 223, 0.05)',
                            borderColor: 'rgba(78, 115, 223, 1)',
                            pointBackgroundColor: 'rgba(78, 115, 223, 1)',
                            pointBorderColor: '#fff',
                            pointHoverBackgroundColor: '#fff',
                            pointHoverBorderColor: 'rgba(78, 115, 223, 1)',
                            data: yearlyRevenue.map((item) => item.revenue),
                          },
                        ],
                      }}
                      options={{
                        maintainAspectRatio: false,
                        plugins: {
                          legend: { display: false },
                          tooltip: {
                            callbacks: {
                              label: (context) => `${context.parsed.y.toFixed(2)} TND`,
                            },
                          },
                        },
                        scales: {
                          x: { grid: { display: false } },
                          y: {
                            beginAtZero: true,
                            grid: { color: 'rgba(0, 0, 0, 0.05)' },
                            ticks: { callback: (value) => `${value} TND` },
                          },
                        },
                        elements: {
                          line: { tension: 0.4, borderWidth: 2 },
                          point: { radius: 4, hoverRadius: 6 },
                        },
                      }}
                    />
                  </div>
                </CCol>
                <CCol xs={12} lg={4} className="d-flex align-items-center">
                  <div className="method-breakdown">
                    <h5 className="mb-3">{Language.MonthlyBreakdown}</h5>
                    <ul className="list-unstyled">
                      {yearlyRevenue.map((item, index) => {
                        const percentage = (item.revenue / totalRevenue) * 100
                        return (
                          <li
                            key={index}
                            className={`mb-2 ${selectedMonth === index ? 'active-month' : ''}`}
                            onClick={() => setSelectedMonth(index)}
                          >
                            <div className="d-flex justify-content-between">
                              <span>{months[index]}</span>
                              <span>{percentage.toFixed(1)}%</span>
                            </div>
                            <CProgress
                              color={getProgressColor(percentage)}
                              value={percentage}
                              className="mt-1"
                              height={8}
                              animated
                            />
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                </CCol>
              </CRow>

              <div className="d-flex justify-content-end mt-4">
                <CButton color="primary" onClick={() => setModalVisible(true)} className="me-2">
                  <CIcon icon={cilInfo} className="me-1" />
                  {Language.details}
                </CButton>
                <CDropdown>
                  <CDropdownToggle color="secondary">
                    <CIcon icon={cilCloudDownload} className="me-1" />
                    {Language.Export}
                  </CDropdownToggle>
                  <CDropdownMenu>
                    <CDropdownItem onClick={() => exportToPDF(yearlyRevenue)}>
                      {Language.ExporttoPDF}
                    </CDropdownItem>
                    <CDropdownItem onClick={() => exportToExcel(yearlyRevenue)}>
                      {Language.ExporttoExel}
                    </CDropdownItem>
                  </CDropdownMenu>
                </CDropdown>
              </div>
            </>
          )}
        </CCardBody>
      </CCard>

      {/* Enhanced Modal */}
      <CModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        size="xl"
        backdrop="static"
      >
        <CModalHeader closeButton>
          <CModalTitle>
            <CIcon icon={cilChart} className="me-2" />
            {Language.YearlyRevenueDetails} - {new Date().getFullYear()}
          </CModalTitle>
        </CModalHeader>
        <CModalBody>
          <CTable striped hover responsive>
            <CTableHead>
              <CTableRow>
                <CTableHeaderCell>{Language.month}</CTableHeaderCell>
                <CTableHeaderCell className="text-end">{Language.revenue} (TND)</CTableHeaderCell>
                <CTableHeaderCell className="text-end">% of Total</CTableHeaderCell>
                <CTableHeaderCell>{Language.Progress}</CTableHeaderCell>
              </CTableRow>
            </CTableHead>
            <CTableBody>
              {yearlyRevenue.map((item, index) => {
                const percentage = (item.revenue / totalRevenue) * 100
                return (
                  <CTableRow key={index}>
                    <CTableDataCell>{months[index]}</CTableDataCell>
                    <CTableDataCell className="text-end fw-medium">
                      {item.revenue.toFixed(2)}
                    </CTableDataCell>
                    <CTableDataCell className="text-end">{percentage.toFixed(1)}%</CTableDataCell>
                    <CTableDataCell>
                      <CProgress
                        height={20}
                        value={percentage}
                        color={getProgressColor(percentage)}
                        animated
                      />
                    </CTableDataCell>
                  </CTableRow>
                )
              })}
              <CTableRow className="fw-bold">
                <CTableDataCell colSpan="2">Total</CTableDataCell>
                <CTableDataCell className="text-end">{totalRevenue.toFixed(2)}</CTableDataCell>
                <CTableDataCell>
                  <CProgress height={20} value={100} color="success" />
                </CTableDataCell>
              </CTableRow>
            </CTableBody>
          </CTable>
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={() => setModalVisible(false)}>
            {Language.close}
          </CButton>
        </CModalFooter>
      </CModal>

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
        .total-revenue-card {
          background: white;
          border-radius: 10px;
          padding: 1.5rem;
          text-align: center;
          box-shadow: 0 0.125rem 0.25rem rgba(0, 0, 0, 0.075);
          border: 1px solid #e3e6f0;
        }
        .chart-container {
          background: white;
          border-radius: 10px;
          padding: 1.5rem;
          box-shadow: 0 0.125rem 0.25rem rgba(0, 0, 0, 0.075);
          border: 1px solid #e3e6f0;
        }
        .method-breakdown {
          background: white;
          border-radius: 10px;
          padding: 1.5rem;
          box-shadow: 0 0.125rem 0.25rem rgba(0, 0, 0, 0.075);
          border: 1px solid #e3e6f0;
          height: 100%;
        }
        .list-unstyled li {
          padding: 0.5rem;
          border-radius: 5px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .list-unstyled li:hover {
          background-color: #f8f9fa;
        }
        .active-month {
          background-color: #f0f7ff;
          border-left: 3px solid #4e73df;
        }
      `}</style>
    </div>
  )
}

// Helper function for progress colors
const getProgressColor = (value) => {
  if (value > 15) return 'success'
  if (value > 10) return 'info'
  if (value > 5) return 'warning'
  return 'danger'
}

YearlyRevenue.propTypes = {
  className: PropTypes.string,
}

export default YearlyRevenue
