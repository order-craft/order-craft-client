import { useState, useEffect } from 'react'
import {
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CRow,
  CWidgetStatsF,
  CSpinner,
  CBadge,
} from '@coreui/react'
import { cilChart, cilChartPie, cilMoney, cilRestaurant } from '@coreui/icons'
import CIcon from '@coreui/icons-react'
import { CChartBar, CChartPie } from '@coreui/react-chartjs'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js'
import axios from 'axios'
import { GetToken } from '../../../helpers/GetToken'
import { BaseUrl } from '../../../helpers/BaseUrl'
import { useSelector } from 'react-redux'
import translations from '../../../app/Language'

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement)

const TableDashboard = () => {
  const [revenueData, setRevenueData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const token = GetToken()

  const t = useSelector((state) => state.language)
  const Language = translations[t]

  // Same data fetching logic as previous component
  const fetchRevenueData = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await axios.get(`${BaseUrl}/tables/dashboard/revenue-per-table`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setRevenueData(response.data || [])
    } catch (error) {
      console.error('Failed to fetch revenue data:', error)
      setError(Language.fLoadRevenuePta)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRevenueData()
  }, [])

  if (loading) {
    return (
      <CCard>
        <CCardBody className="text-center p-5">
          <CSpinner />
          <div className="mt-3">{Language.loadingDashboardData}</div>
        </CCardBody>
      </CCard>
    )
  }

  if (error) {
    return (
      <CCard>
        <CCardBody className="text-center p-5 text-danger">
          {error}
          <button onClick={fetchRevenueData} className="btn btn-sm btn-primary ms-2">
            {Language.Retry}
          </button>
        </CCardBody>
      </CCard>
    )
  }

  if (!revenueData || revenueData.length === 0) {
    return (
      <CCard>
        <CCardBody className="text-center p-5 text-muted">{Language.noRevenueDataAvailable}</CCardBody>
      </CCard>
    )
  }

  // Data processing for charts
  const sortedData = [...revenueData].sort((a, b) => b.totalRevenue - a.totalRevenue)
  const topTable = sortedData[0]
  const totalRevenue = revenueData.reduce((sum, item) => sum + item.totalRevenue, 0)
  const averageRevenue = totalRevenue / revenueData.length

  // Chart configuration
  const COLORS = ['#4CAF50', '#2196F3', '#FF9800', '#9C27B0', '#E91E63', '#00BCD4']

  // Bar Chart Data
  const barChartData = {
    labels: sortedData.map((item) => `Table ${item.tableNumber}`),
    datasets: [
      {
        label: Language.totalRevenueTND,
        data: sortedData.map((item) => item.totalRevenue),
        backgroundColor: sortedData.map((item) =>
          item.tableNumber === topTable.tableNumber ? '#FFC107' : COLORS[0],
        ),
        borderWidth: 0,
      },
    ],
  }

  // Pie Chart Data
  const pieChartData = {
    labels: sortedData.map((item) => `Table ${item.tableNumber}`),
    datasets: [
      {
        data: sortedData.map((item) => item.totalRevenue),
        backgroundColor: COLORS,
        borderWidth: 0,
      },
    ],
  }

  // Chart options
  const barChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' },
      title: { display: true, text: Language.revenueByTable },
    },
    scales: {
      y: {
        beginAtZero: true,
        title: { display: true, text: Language.TND },
      },
    },
  }

  const pieChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'right' },
      tooltip: {
        callbacks: {
          label: (context) => {
            const label = context.label || ''
            const value = context.parsed || 0
            return `${label}: ${value.toFixed(2)} ${Language.TND}`
          },
        },
      },
    },
  }

  return (
    <CCard className="mb-4">
      <CCardHeader className="bg-gradient-info text-white py-3">
        <div className="d-flex justify-content-between align-items-center">
          <div>
            <h3 className="h4 mb-1" style={{ color: 'black' }}>
              📊 {Language.tablePerformanceDashboard}
            </h3>
            <small className="opacity-75 d-none d-sm-block" style={{ color: 'black' }}>
              {Language.comprehensiveRevenueAnalytics}
            </small>
          </div>
          <CIcon
            icon={cilChartPie}
            className="text-white-50"
            style={{ height: 'clamp(24px, 5vw, 36px)' }}
          />
        </div>
      </CCardHeader>

      <CCardBody className="p-3 p-md-4">
        {/* Responsive Summary Cards */}
        <CRow className="g-3 mb-4">
          <CCol xs={12} sm={6} md={6} lg={3}>
            <CWidgetStatsF
              className="shadow-sm"
              color="primary"
              icon={<CIcon icon={cilMoney} style={{ height: 'clamp(20px, 4vw, 28px)' }} />}
              title={Language.TotalRevenue}
              value={`${totalRevenue.toFixed(2)} ${Language.TND}`}
              padding={false}
            />
          </CCol>
          <CCol xs={12} sm={6} md={6} lg={3}>
            <CWidgetStatsF
              className="shadow-sm"
              color="success"
              icon={<CIcon icon={cilRestaurant} style={{ height: 'clamp(20px, 4vw, 28px)' }} />}
              title={Language.Avg_Table}
              value={`${averageRevenue.toFixed(2)} ${Language.TND}`}
              padding={false}
            />
          </CCol>
          <CCol xs={12} sm={6} md={6} lg={3}>
            <CWidgetStatsF
              className="shadow-sm"
              color="warning"
              icon={<CIcon icon={cilChart} style={{ height: 'clamp(20px, 4vw, 28px)' }} />}
              title={Language.TopTable}
              value={`#${topTable.tableNumber}`}
              footer={`${topTable.totalRevenue.toFixed(2)} ${Language.TND}`}
              padding={false}
            />
          </CCol>
          <CCol xs={12} sm={6} md={6} lg={3}>
            <CWidgetStatsF
              className="shadow-sm"
              color="info"
              icon={<CIcon icon={cilRestaurant} style={{ height: 'clamp(20px, 4vw, 28px)' }} />}
              title={Language.TotalTables}
              value={revenueData.length}
              padding={false}
            />
          </CCol>
        </CRow>

        {/* Responsive Chart Layout */}
        <CRow className="g-3">
          <CCol xs={12} lg={8} xl={8}>
            <CCard className="h-100 shadow-sm">
              <CCardHeader className="bg-light py-2">
                <span className="h6">{Language.RevenueDistributionbyTable}</span>
              </CCardHeader>
              <CCardBody className="p-2" style={{ minHeight: '300px', height: '40vh' }}>
                <CChartBar
                  data={barChartData}
                  options={{
                    ...barChartOptions,
                    plugins: {
                      ...barChartOptions.plugins,
                      legend: {
                        position: window.innerWidth < 768 ? 'bottom' : 'top',
                      },
                    },
                  }}
                  style={{ height: window.innerWidth < 768 ? '70%' : '100%' }}
                />
              </CCardBody>
            </CCard>
          </CCol>

          <CCol xs={12} lg={4} xl={4}>
            <CRow className="g-3">
              <CCol xs={12}>
                <CCard className="h-100 shadow-sm">
                  <CCardHeader className="bg-light py-2">
                    <span className="h6">{Language.RevenueShare}</span>
                  </CCardHeader>
                  <CCardBody className="p-2" style={{ minHeight: '250px', height: '30vh' }}>
                    <CChartPie
                      data={pieChartData}
                      options={{
                        ...pieChartOptions,
                        plugins: {
                          ...pieChartOptions.plugins,
                          legend: {
                            position: window.innerWidth < 768 ? 'bottom' : 'right',
                            labels: { boxWidth: 12 },
                          },
                        },
                      }}
                    />
                  </CCardBody>
                </CCard>
              </CCol>

              <CCol xs={12}>
                <CCard className="shadow-sm">
                  <CCardHeader className="bg-light py-2">
                    <span className="h6">{Language.TopPerformers}</span>
                  </CCardHeader>
                  <CCardBody className="p-2">
                    <div className="table-responsive">
                      <table className="table table-borderless mb-0">
                        <thead>
                          <tr>
                            <th>{Language.Rank}</th>
                            <th>{Language.Table}</th>
                            <th className="text-end">{Language.Revenue}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sortedData.slice(0, 5).map((item, index) => (
                            <tr key={item.tableNumber}>
                              <td>
                                <CBadge color={index < 3 ? 'primary' : 'secondary'}>
                                  #{index + 1}
                                </CBadge>
                              </td>
                              <td>{Language.Table} {item.tableNumber}</td>
                              <td className="text-end text-nowrap">
                                {item.totalRevenue.toFixed(2)} {Language.TND}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CCardBody>
                </CCard>
              </CCol>
            </CRow>
          </CCol>
        </CRow>
      </CCardBody>
    </CCard>
  )
}

export default TableDashboard
