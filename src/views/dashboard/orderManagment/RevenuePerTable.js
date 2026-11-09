import { useState, useEffect } from 'react'
import { CSpinner } from '@coreui/react'
import { CChartBar } from '@coreui/react-chartjs'
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
import './insights.css'

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement)

const SHARE_ROWS = 8

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

  const panel = (body) => (
    <section className="oc-panel rt-panel">
      <div className="oc-panel-head">
        <div>
          <h3 className="oc-panel-title">{Language.tablePerformanceDashboard}</h3>
          <p className="rt-sub">{Language.comprehensiveRevenueAnalytics}</p>
        </div>
      </div>
      {body}
    </section>
  )

  if (loading) {
    return panel(
      <div className="oc-empty">
        <CSpinner color="primary" size="sm" />
        <span className="oc-empty-body">{Language.loadingDashboardData}</span>
      </div>,
    )
  }

  if (error) {
    return panel(
      <div className="oc-empty">
        <span className="oc-empty-title">{error}</span>
        <button onClick={fetchRevenueData} className="btn btn-sm btn-primary mt-2">
          {Language.Retry}
        </button>
      </div>,
    )
  }

  if (!revenueData || revenueData.length === 0) {
    return panel(
      <div className="oc-empty">
        <span className="oc-empty-body">{Language.noRevenueDataAvailable}</span>
      </div>,
    )
  }

  const sortedData = [...revenueData].sort((a, b) => b.totalRevenue - a.totalRevenue)
  const topTable = sortedData[0]
  const totalRevenue = revenueData.reduce((sum, item) => sum + item.totalRevenue, 0)
  const averageRevenue = totalRevenue / revenueData.length
  const money = (n) => `${n.toFixed(2)} ${Language.TND || 'TND'}`

  // Ranked horizontal bars: names stay readable however many tables there
  // are, and the order itself carries the comparison.
  const barChartData = {
    labels: sortedData.map((item) => `${Language.Table || 'Table'} ${item.tableNumber}`),
    datasets: [
      {
        label: Language.totalRevenueTND,
        data: sortedData.map((item) => item.totalRevenue),
        backgroundColor: sortedData.map((item, i) => (i === 0 ? '#f0ae2c' : '#1a5a44')),
        borderWidth: 0,
        maxBarThickness: 18,
      },
    ],
  }

  const barChartOptions = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: { label: (ctx) => money(ctx.parsed.x || 0) },
      },
    },
    scales: {
      x: {
        beginAtZero: true,
        grid: { color: '#eef0eb' },
        ticks: { callback: (v) => `${v}` },
      },
      y: { grid: { display: false }, ticks: { autoSkip: false } },
    },
  }

  const shareRows = sortedData.slice(0, SHARE_ROWS)
  const othersRevenue = sortedData
    .slice(SHARE_ROWS)
    .reduce((sum, item) => sum + item.totalRevenue, 0)
  const pct = (n) => (totalRevenue > 0 ? (n / totalRevenue) * 100 : 0)

  return panel(
    <>
      <div className="rt-strip">
        <div className="rt-cell">
          <span className="rt-label">{Language.TotalRevenue}</span>
          <span className="rt-value">{money(totalRevenue)}</span>
        </div>
        <div className="rt-cell">
          <span className="rt-label">{Language.Avg_Table}</span>
          <span className="rt-value">{money(averageRevenue)}</span>
        </div>
        <div className="rt-cell is-top">
          <span className="rt-label">{Language.TopTable}</span>
          <span className="rt-value">
            {Language.Table || 'Table'} {topTable.tableNumber}
          </span>
          <span className="rt-hint">
            {money(topTable.totalRevenue)} · {pct(topTable.totalRevenue).toFixed(0)}%
          </span>
        </div>
        <div className="rt-cell">
          <span className="rt-label">{Language.TotalTables}</span>
          <span className="rt-value">{revenueData.length}</span>
        </div>
      </div>

      <div className="rt-body">
        <div className="rt-chart">
          <h4 className="rt-h">{Language.RevenueDistributionbyTable}</h4>
          <div style={{ height: Math.max(220, sortedData.length * 28 + 40) }}>
            <CChartBar data={barChartData} options={barChartOptions} style={{ height: '100%' }} />
          </div>
        </div>

        <div className="rt-share">
          <h4 className="rt-h">{Language.RevenueShare}</h4>
          <ol className="rt-share-list">
            {shareRows.map((item, i) => (
              <li key={item.tableNumber}>
                <div className="rt-share-top">
                  <span className="rt-share-name">
                    <span className={`rt-rank ${i === 0 ? 'is-first' : ''}`}>{i + 1}</span>
                    {Language.Table || 'Table'} {item.tableNumber}
                  </span>
                  <span className="rt-share-val">
                    {money(item.totalRevenue)}
                    <small>{pct(item.totalRevenue).toFixed(1)}%</small>
                  </span>
                </div>
                <span className="rt-bar">
                  <span
                    className={i === 0 ? 'is-first' : ''}
                    style={{ width: `${pct(item.totalRevenue)}%` }}
                  />
                </span>
              </li>
            ))}
            {othersRevenue > 0 && (
              <li className="rt-share-others">
                <div className="rt-share-top">
                  <span className="rt-share-name">
                    +{sortedData.length - SHARE_ROWS} {Language.hmTables || 'tables'}
                  </span>
                  <span className="rt-share-val">
                    {money(othersRevenue)}
                    <small>{pct(othersRevenue).toFixed(1)}%</small>
                  </span>
                </div>
              </li>
            )}
          </ol>
        </div>
      </div>
    </>,
  )
}

export default TableDashboard
