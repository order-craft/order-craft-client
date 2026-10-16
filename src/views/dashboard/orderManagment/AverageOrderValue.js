import React, { useState } from 'react'
import { CButton, CSpinner } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilDollar, cilChart, cilCheckCircle, cilWarning } from '@coreui/icons'
import axios from 'axios'
import { BaseUrl } from '../../../helpers/BaseUrl'
import { GetToken } from '../../../helpers/GetToken'
import { useSelector } from 'react-redux'
import translations from '../../../app/Language'
import './orderManagement.css'

/* local-date helpers — no UTC offset */
const toLocalISO = (d) => {
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}
const todayISO = () => toLocalISO(new Date())

const AverageOrderValue = () => {
  const token = GetToken()
  const t = useSelector((state) => state.language)
  const Language = translations[t]

  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [threshold, setThreshold] = useState(100)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [timeframe, setTimeframe] = useState('custom')

  const presetRanges = {
    today: () => {
      const today = new Date()
      return { start: toLocalISO(today), end: toLocalISO(today) }
    },
    week: () => {
      const today = new Date()
      const start = new Date(today)
      start.setDate(today.getDate() - today.getDay())
      return { start: toLocalISO(start), end: toLocalISO(today) }
    },
    month: () => {
      const today = new Date()
      const start = new Date(today.getFullYear(), today.getMonth(), 1)
      return { start: toLocalISO(start), end: toLocalISO(today) }
    },
  }

  const handleTimeframeChange = (selected) => {
    setTimeframe(selected)
    if (selected !== 'custom') {
      const { start, end } = presetRanges[selected]()
      setStartDate(start)
      setEndDate(end)
    }
  }

  const fetchData = async () => {
    if (!startDate || !endDate) {
      setError(
        Language.Pleaseselectbothstartandenddates || 'Please select both start and end dates',
      )
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
    } catch (err) {
      console.error('Error fetching average order value:', err)
      setError(
        err.response?.data?.message ||
          Language.fetchError ||
          'Failed to fetch data. Please try again.',
      )
    } finally {
      setLoading(false)
    }
  }

  const getValueCategory = (value) => {
    const v = Number(value) || 0
    const t = Number(threshold) || 0
    if (v < t * 0.5) return Language.Low || 'Low'
    if (v < t) return Language.Medium || 'Medium'
    if (v < t * 1.5) return Language.High || 'High'
    return Language.Premium || 'Premium'
  }

  /* ---------- derived safe numbers ---------- */
  const safe = (n) => Number(n) || 0
  const highOrders = data?.highValueOrders || []
  const totalOrders = safe(data?.totalOrders)
  const avgValue = safe(data?.averageOrderValue)
  const highestOrder = highOrders.length
    ? Math.max(...highOrders.map((o) => safe(o.totalPrice)))
    : 0
  const highValueSum = highOrders.reduce((sum, o) => sum + safe(o.totalPrice), 0)
  const highValueAvg = highOrders.length ? highValueSum / highOrders.length : 0
  const highValueShare = totalOrders > 0 ? (highOrders.length / totalOrders) * 100 : 0

  /* ---------- render ---------- */
  const renderAnalysis = () => (
    <>
      <div className="om-stats">
        {/* Average order value */}
        <div className="om-stat">
          <div className="om-stat-label">
            <CIcon icon={cilDollar} /> {Language.AverageOrderValue || 'Average order value'}
          </div>
          <div className="om-stat-value is-success">
            {avgValue.toFixed(2)}
            <span className="unit">TND</span>
          </div>
          <div className="om-stat-hint">
            {getValueCategory(avgValue)} · {Language.ValueCategory || 'category'}
          </div>
          <div className="om-stat-detail">
            <span className="om-stat-detail-label">{Language.HighestOrder || 'Highest order'}</span>
            <span className="om-stat-detail-value">{highestOrder.toFixed(2)} TND</span>
          </div>
          <div className="om-stat-detail">
            <span className="om-stat-detail-label">{Language.TotalOrders || 'Total orders'}</span>
            <span className="om-stat-detail-value">{totalOrders}</span>
          </div>
        </div>

        {/* High-value orders */}
        <div className="om-stat">
          <div className="om-stat-label">
            <CIcon icon={cilCheckCircle} /> {Language.HighValueOrders || 'High-value orders'}
          </div>
          <div className="om-stat-value is-warning">{highOrders.length}</div>
          <div className="om-stat-hint">
            {highValueShare.toFixed(1)}% {Language.ofTotal || 'of all orders'}
          </div>
          <div className="om-stat-detail">
            <span className="om-stat-detail-label">{Language.TotalValue || 'Total value'}</span>
            <span className="om-stat-detail-value">{highValueSum.toFixed(2)} TND</span>
          </div>
          <div className="om-stat-detail">
            <span className="om-stat-detail-label">{Language.AverageValue || 'Average value'}</span>
            <span className="om-stat-detail-value">{highValueAvg.toFixed(2)} TND</span>
          </div>
        </div>
      </div>

      {/* High-value order list */}
      {highOrders.length > 0 && (
        <div className="om-list">
          <div className="om-list-title">
            {Language.High_ValueOrderDetails || 'High-value order details'}
          </div>
          {highOrders.map((order, index) => (
            <div className="om-list-row" key={order._id || index}>
              <div className="om-list-rank">#{index + 1}</div>
              <div className="om-list-main">
                <div className="om-list-primary">{safe(order.totalPrice).toFixed(2)} TND</div>
                <div className="om-list-meta">
                  <span>
                    {new Date(order.timestamp).toLocaleDateString()}{' '}
                    {new Date(order.timestamp).toLocaleTimeString()}
                  </span>
                  {order.tableNumber && (
                    <span>
                      · {Language.table || 'Table'} {order.tableNumber}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )

  return (
    <div className="om-card">
      {/* ---------- Header ---------- */}
      <div className="om-card-header">
        <div className="om-card-header-left">
          <h5 className="om-card-title">
            <CIcon icon={cilDollar} />
            {Language.OrderValueAnalysis || 'Order value analysis'}
          </h5>
          <div className="om-card-subtitle">
            {startDate && endDate
              ? `${startDate} → ${endDate} · threshold ${threshold} TND`
              : Language.pickRangeHint || 'Pick a range and analyze.'}
          </div>
        </div>

        <div className="om-card-header-right">
          <div className="om-segments" role="tablist">
            {[
              { key: 'today', label: Language.Today || 'Today' },
              { key: 'week', label: Language.ThisWeek || 'This week' },
              { key: 'month', label: Language.ThisMonth || 'This month' },
              { key: 'custom', label: Language.CustomRange || 'Custom' },
            ].map((p) => (
              <button
                key={p.key}
                type="button"
                className={`om-segment ${timeframe === p.key ? 'is-active' : ''}`}
                onClick={() => handleTimeframeChange(p.key)}
              >
                {p.label}
              </button>
            ))}
          </div>

          <CButton color="primary" onClick={fetchData} disabled={loading || !startDate || !endDate}>
            {loading ? (
              <>
                <CSpinner size="sm" className="me-2" />
                {Language.Analyzing || 'Analyzing…'}
              </>
            ) : (
              <>
                <CIcon icon={cilChart} className="me-2" />
                {Language.Analyze || 'Analyze'}
              </>
            )}
          </CButton>
        </div>
      </div>

      {/* ---------- Controls ---------- */}
      <div
        style={{
          padding: '16px 20px 0 20px',
          display: 'flex',
          justifyContent: 'space-between',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        {timeframe === 'custom' && (
          <div className="om-date-group">
            <div className="om-date">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                max={endDate || todayISO()}
              />
            </div>
            <span className="om-date-sep">→</span>
            <div className="om-date">
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate}
                max={todayISO()}
              />
            </div>
          </div>
        )}

        <div className="om-date" style={{ marginLeft: 'auto' }}>
          <span
            style={{
              fontSize: '0.78rem',
              fontWeight: 700,
              color: '#6c757d',
              whiteSpace: 'nowrap',
            }}
          >
            {Language.High_ValueThresholdTND || 'Threshold'}
          </span>
          <input
            type="number"
            value={threshold}
            onChange={(e) => setThreshold(Number(e.target.value) || 0)}
            min="0"
            step="10"
            style={{
              width: 80,
              border: 'none',
              outline: 'none',
              background: 'transparent',
              fontSize: '0.88rem',
              fontWeight: 600,
              color: '#1a1a1a',
              textAlign: 'right',
            }}
          />
          <span style={{ fontSize: '0.78rem', color: '#6c757d' }}>TND</span>
        </div>
      </div>

      {/* ---------- Body ---------- */}
      {loading ? (
        <div className="om-skeleton">
          <div className="om-skeleton-line" style={{ width: '40%' }} />
          <div className="om-skeleton-block" />
        </div>
      ) : error ? (
        <div
          className="om-info"
          style={{
            background: '#fee2e2',
            borderColor: '#fecaca',
            color: '#991b1b',
          }}
        >
          <CIcon icon={cilWarning} />
          <div>{error}</div>
        </div>
      ) : !data ? (
        <div className="om-empty">
          <CIcon icon={cilDollar} size="xl" />
          <div className="om-empty-title">{Language.noDataYet || 'No analysis yet'}</div>
          <div className="om-empty-body">
            {Language.analyzeHint || 'Pick a range, set a threshold, and tap Analyze.'}
          </div>
        </div>
      ) : (
        renderAnalysis()
      )}
    </div>
  )
}

export default AverageOrderValue
