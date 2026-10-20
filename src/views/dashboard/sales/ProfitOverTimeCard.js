import React, { useState, useEffect, useCallback } from 'react'
import { CCard, CCardBody, CButton } from '@coreui/react'
import { CChartLine } from '@coreui/react-chartjs'
import CIcon from '@coreui/icons-react'
import { cilChartLine, cilWarning, cilReload } from '@coreui/icons'
import axios from 'axios'
import { BaseUrl } from '../../../helpers/BaseUrl'
import { GetToken } from '../../../helpers/GetToken'
import { useSelector } from 'react-redux'
import translations from '../../../app/Language'
import './sales.css'

const toLocalISO = (d) => {
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}
const todayISO = () => toLocalISO(new Date())
const daysAgoISO = (n) => {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return toLocalISO(d)
}

const ProfitOverTimeCard = () => {
  const t = useSelector((state) => state.language)
  const Language = translations[t]

  const [startDate, setStartDate] = useState(daysAgoISO(14))
  const [endDate, setEndDate] = useState(todayISO())
  const [daily, setDaily] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const token = GetToken()

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await axios.post(
        `${BaseUrl}/dashboard/profit-by-period`,
        { startDate, endDate },
        { headers: { Authorization: `Bearer ${token}` } },
      )
      setDaily(res.data.daily || [])
    } catch (err) {
      console.error('Error fetching profit-by-period:', err)
      setError(
        err.response?.data?.message ||
          Language.errorFetchingProfitPeriod ||
          'Failed to fetch profit over time',
      )
    } finally {
      setLoading(false)
    }
  }, [startDate, endDate, token, Language])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const isEmpty = !loading && !error && daily.length === 0

  return (
    <CCard className="sales-card">
      {/* ---- Header ---- */}
      <div className="sales-card-header">
        <div className="sales-card-header-left">
          <h5 className="sales-card-title">
            <CIcon icon={cilChartLine} />
            {Language.profitOverTime || 'Profit over time'}
          </h5>
          <div className="sales-card-subtitle">
            {Language.revenueVsCostVsProfit || 'Revenue, cost, and profit — day by day'}
          </div>
        </div>

        <div className="sales-card-header-right">
          <div className="sales-date-group">
            <div className="sales-date">
              <input
                type="date"
                value={startDate}
                max={endDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <span className="sales-date-sep">→</span>
            <div className="sales-date">
              <input
                type="date"
                value={endDate}
                min={startDate}
                max={todayISO()}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
          <CButton
            color="secondary"
            variant="outline"
            onClick={fetchData}
            disabled={loading}
            aria-label={Language.refresh || 'Refresh'}
          >
            <CIcon icon={cilReload} />
          </CButton>
        </div>
      </div>

      <CCardBody className="p-0">
        {loading ? (
          <div className="sales-skeleton">
            <div>
              <div className="sales-skeleton-line" style={{ width: '40%' }} />
              <div className="sales-skeleton-line" style={{ width: '60%' }} />
              <div style={{ height: 240, marginTop: 12 }}>
                <div className="sales-skeleton-line" style={{ height: 240 }} />
              </div>
            </div>
            <div>
              <div className="sales-skeleton-line" style={{ width: '40%' }} />
              <div className="sales-skeleton-line" style={{ width: '60%' }} />
              <div style={{ height: 240, marginTop: 12 }}>
                <div className="sales-skeleton-line" style={{ height: 240 }} />
              </div>
            </div>
          </div>
        ) : error ? (
          <div className="sales-empty">
            <CIcon icon={cilWarning} size="xl" />
            <div className="sales-empty-title">
              {Language.errorMessage || 'Something went wrong'}
            </div>
            <div className="sales-empty-body">{error}</div>
            <CButton color="primary" onClick={fetchData}>
              {Language.retry || 'Retry'}
            </CButton>
          </div>
        ) : isEmpty ? (
          <div className="sales-empty">
            <CIcon icon={cilChartLine} size="xl" />
            <div className="sales-empty-title">
              {Language.noOrdersInRange || 'No orders in this range'}
            </div>
            <div className="sales-empty-body">
              {Language.noOrdersInRangeHint || 'Try a wider date range.'}
            </div>
          </div>
        ) : (
          <div
            style={{
              padding: '20px 20px 20px 20px',
              height: 340,
              position: 'relative',
            }}
          >
            <CChartLine
              data={{
                labels: daily.map((d) => d.date),
                datasets: [
                  {
                    label: Language.revenue || 'Revenue',
                    data: daily.map((d) => d.revenue),
                    borderColor: '#0d6efd',
                    backgroundColor: 'rgba(13,110,253,0.1)',
                    borderWidth: 2,
                    tension: 0.35,
                    pointRadius: 2,
                    pointHoverRadius: 5,
                  },
                  {
                    label: Language.cost || 'Cost',
                    data: daily.map((d) => d.cost),
                    borderColor: '#ffc107',
                    backgroundColor: 'rgba(255,193,7,0.1)',
                    borderWidth: 2,
                    tension: 0.35,
                    pointRadius: 2,
                    pointHoverRadius: 5,
                  },
                  {
                    label: Language.profit || 'Profit',
                    data: daily.map((d) => d.profit),
                    borderColor: '#198754',
                    backgroundColor: 'rgba(25,135,84,0.1)',
                    borderWidth: 2,
                    tension: 0.35,
                    pointRadius: 2,
                    pointHoverRadius: 5,
                  },
                ],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'top',
                    labels: {
                      usePointStyle: true,
                      padding: 16,
                    },
                  },
                  tooltip: {
                    callbacks: {
                      label: (ctx) => `${ctx.dataset.label}: ${Number(ctx.raw).toFixed(2)} TND`,
                    },
                  },
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(0,0,0,0.05)' },
                    ticks: { callback: (v) => `${v}` },
                  },
                  x: {
                    grid: { display: false },
                    ticks: { autoSkip: true, maxTicksLimit: 10 },
                  },
                },
              }}
            />
          </div>
        )}
      </CCardBody>
    </CCard>
  )
}

export default ProfitOverTimeCard
