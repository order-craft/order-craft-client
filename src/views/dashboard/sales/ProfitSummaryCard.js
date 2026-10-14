import React, { useState, useEffect, useCallback } from 'react'
import { CCard, CCardBody, CButton } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilDollar, cilChartLine, cilMoney, cilWarning } from '@coreui/icons'
import axios from 'axios'
import { BaseUrl } from '../../../helpers/BaseUrl'
import { GetToken } from '../../../helpers/GetToken'
import { useSelector } from 'react-redux'
import translations from '../../../app/Language'
import './sales.css'

const fmtTND = (v) =>
  new Intl.NumberFormat('en-US', { minimumFractionDigits: 2 }).format(Number(v) || 0)

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

const ProfitSummaryCard = () => {
  const t = useSelector((state) => state.language)
  const Language = translations[t]

  const [startDate, setStartDate] = useState(daysAgoISO(30))
  const [endDate, setEndDate] = useState(todayISO())
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const token = GetToken()

  const fetchSummary = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await axios.post(
        `${BaseUrl}/dashboard/profit-summary`,
        { startDate, endDate },
        { headers: { Authorization: `Bearer ${token}` } },
      )
      setData(res.data)
    } catch (err) {
      console.error('Error fetching profit summary:', err)
      setError(
        err.response?.data?.message ||
          Language.errorFetchingProfitSummary ||
          'Failed to fetch profit summary',
      )
    } finally {
      setLoading(false)
    }
  }, [startDate, endDate, token, Language])

  useEffect(() => {
    fetchSummary()
  }, [fetchSummary])

  const margin = data?.marginPercent ?? 0
  const marginTone =
    margin >= 40 ? 'success' : margin >= 20 ? 'info' : margin > 0 ? 'warning' : 'danger'

  const isEmpty = !loading && !error && data && data.orderCount === 0

  return (
    <CCard className="sales-card">
      {/* ---- Header ---- */}
      <div className="sales-card-header">
        <div className="sales-card-header-left">
          <h5 className="sales-card-title">
            <CIcon icon={cilChartLine} />
            {Language.profitSummary || 'Profit summary'}
          </h5>
          <div className="sales-card-subtitle">
            {Language.profitSummaryHint || 'Revenue, cost, and profit for the selected period'}
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
          <CButton color="primary" onClick={fetchSummary} disabled={loading}>
            {Language.refresh || 'Refresh'}
          </CButton>
        </div>
      </div>

      <CCardBody className="p-0">
        {loading ? (
          <div className="sales-skeleton">
            <div>
              <div className="sales-skeleton-line" style={{ width: '40%' }} />
              <div className="sales-skeleton-line" style={{ width: '30%' }} />
              <div className="sales-skeleton-line" style={{ width: '80%' }} />
              <div className="sales-skeleton-line" style={{ width: '55%' }} />
            </div>
            <div>
              <div className="sales-skeleton-line" style={{ width: '40%' }} />
              <div className="sales-skeleton-line" style={{ width: '30%' }} />
              <div className="sales-skeleton-line" style={{ width: '80%' }} />
              <div className="sales-skeleton-line" style={{ width: '55%' }} />
            </div>
          </div>
        ) : error ? (
          <div className="sales-empty">
            <CIcon icon={cilWarning} size="xl" />
            <div className="sales-empty-title">
              {Language.errorMessage || 'Something went wrong'}
            </div>
            <div className="sales-empty-body">{error}</div>
            <CButton color="primary" onClick={fetchSummary}>
              {Language.retry || 'Retry'}
            </CButton>
          </div>
        ) : isEmpty ? (
          <div className="sales-empty">
            <CIcon icon={cilDollar} size="xl" />
            <div className="sales-empty-title">
              {Language.noProfitData || 'No orders in this period'}
            </div>
            <div className="sales-empty-body">
              {Language.noProfitDataHint || 'Try a wider date range.'}
            </div>
          </div>
        ) : (
          <>
            {/* KPI grid */}
            <div className="sales-kpi-grid">
              <div className="sales-kpi">
                <div className="sales-kpi-label">{Language.revenue || 'Revenue'}</div>
                <div className="sales-kpi-value is-primary">
                  {fmtTND(data.revenue)}
                  <span className="sales-kpi-unit">TND</span>
                </div>
              </div>
              <div className="sales-kpi">
                <div className="sales-kpi-label">{Language.cost || 'Cost'}</div>
                <div className="sales-kpi-value">
                  {fmtTND(data.cost)}
                  <span className="sales-kpi-unit">TND</span>
                </div>
              </div>
              <div className="sales-kpi">
                <div className="sales-kpi-label">{Language.profit || 'Profit'}</div>
                <div className="sales-kpi-value is-success">
                  {fmtTND(data.profit)}
                  <span className="sales-kpi-unit">TND</span>
                </div>
              </div>
              <div className="sales-kpi">
                <div className="sales-kpi-label">{Language.margin || 'Margin'}</div>
                <div className={`sales-kpi-value is-${marginTone}`}>
                  {margin.toFixed(1)}
                  <span className="sales-kpi-unit">%</span>
                </div>
              </div>
            </div>

            {/* Footer note */}
            <div
              style={{
                padding: '0 20px 20px 20px',
                fontSize: '0.82rem',
                color: '#6c757d',
              }}
            >
              {Language.ordersInPeriod || 'Orders in period'}:{' '}
              <strong style={{ color: '#1a1a1a' }}>{data.orderCount}</strong>
              {data.ordersWithoutSnapshot > 0 && (
                <>
                  {' · '}
                  <span style={{ color: '#b8860b', fontWeight: 600 }}>
                    {data.ordersWithoutSnapshot}{' '}
                    {Language.ordersWithoutSnapshot || 'orders excluded (no cost snapshot)'}
                  </span>
                </>
              )}
            </div>
          </>
        )}
      </CCardBody>
    </CCard>
  )
}

export default ProfitSummaryCard
