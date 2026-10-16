import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { CButton, CSpinner } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilChart, cilChartPie, cilMoney, cilRestaurant, cilWarning } from '@coreui/icons'
import axios from 'axios'
import { GetToken } from '../../../helpers/GetToken'
import { BaseUrl } from '../../../helpers/BaseUrl'
import { useSelector } from 'react-redux'
import translations from '../../../app/Language'
import './orderManagement.css'

const SLICE_COLORS = [
  '#0d6efd',
  '#198754',
  '#0dcaf0',
  '#ffc107',
  '#e83e8c',
  '#6f42c1',
  '#fd7e14',
  '#20c997',
  '#dc3545',
  '#6c757d',
]
const toLocalISO = (d) => {
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}
const todayISO = () => toLocalISO(new Date())
/* ---------- SVG donut, no measuring ---------- */
const polarToCartesian = (cx, cy, r, angleDeg) => {
  const rad = ((angleDeg - 90) * Math.PI) / 180
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}
const arcPath = (cx, cy, r, startAngle, endAngle) => {
  const start = polarToCartesian(cx, cy, r, endAngle)
  const end = polarToCartesian(cx, cy, r, startAngle)
  const largeArc = endAngle - startAngle <= 180 ? 0 : 1
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y}`
}

const DonutChart = ({ labels, values, colors, size = 220 }) => {
  const total = values.reduce((a, b) => a + b, 0)
  if (total <= 0) return null

  const radius = size / 2 - 14
  const innerRadius = radius * 0.62
  const cx = size / 2
  const cy = size / 2

  let cumulative = 0
  const slices = values.map((value, i) => {
    const startAngle = (cumulative / total) * 360
    cumulative += value
    const endAngle = (cumulative / total) * 360
    return {
      d: arcPath(cx, cy, radius, startAngle, endAngle),
      color: colors[i % colors.length],
    }
  })

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{ display: 'block' }}
      aria-hidden="true"
    >
      {slices.map((s, i) => (
        <path key={i} d={s.d} fill="none" stroke={s.color} strokeWidth={radius - innerRadius} />
      ))}
    </svg>
  )
}

/* ---------- main ---------- */
const TableDashboard = () => {
  const token = GetToken()
  const t = useSelector((state) => state.language)
  const Language = translations[t]

  const [revenueData, setRevenueData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [timeframe, setTimeframe] = useState('month')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const fetchRevenueData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (startDate) params.set('from', startDate)
      if (endDate) params.set('to', endDate)
      const query = params.toString()
      const url = `${BaseUrl}/tables/dashboard/revenue-per-table${query ? `?${query}` : ''}`
      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setRevenueData(response.data || [])
    } catch (err) {
      console.error('Failed to fetch revenue data:', err)
      setError(Language.fLoadRevenuePta || 'Failed to load table revenue.')
    } finally {
      setLoading(false)
    }
  }, [token, Language, startDate, endDate])

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
  useEffect(() => {
    // Set default to "this month" the first time.
    const { start, end } = presetRanges.month()
    setStartDate(start)
    setEndDate(end)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (startDate && endDate) fetchRevenueData()
  }, [startDate, endDate, fetchRevenueData])

  /* ---------- derived ---------- */
  const safeRows = useMemo(() => {
    return (revenueData || [])
      .map((r) => ({
        tableNumber: r.tableNumber,
        totalRevenue: Number(r.totalRevenue) || 0,
      }))
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
  }, [revenueData])

  const totalRevenue = useMemo(
    () => safeRows.reduce((sum, r) => sum + r.totalRevenue, 0),
    [safeRows],
  )
  const averageRevenue = safeRows.length > 0 ? totalRevenue / safeRows.length : 0
  const topTable = safeRows[0] || null
  const max = topTable ? topTable.totalRevenue : 0

  const isEmpty = !loading && !error && safeRows.length === 0

  return (
    <div className="om-card">
      {/* ---------- Header ---------- */}
      <div className="om-card-header">
        <div className="om-card-header-left">
          <h5 className="om-card-title">
            <CIcon icon={cilChartPie} />
            {Language.tablePerformanceDashboard || 'Table performance'}
          </h5>
          <div className="om-card-subtitle">
            {startDate && endDate
              ? `${startDate} → ${endDate}`
              : Language.comprehensiveRevenueAnalytics || 'Revenue across your tables'}
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
        </div>
      </div>

      {/* Custom date pickers */}
      {timeframe === 'custom' && (
        <div
          style={{
            padding: '16px 20px 0 20px',
            display: 'flex',
            justifyContent: 'flex-end',
          }}
        >
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
        </div>
      )}

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
          <div style={{ flex: 1 }}>{error}</div>
          <CButton size="sm" color="danger" onClick={fetchRevenueData}>
            {Language.Retry || 'Retry'}
          </CButton>
        </div>
      ) : isEmpty ? (
        <div className="om-empty">
          <CIcon icon={cilChartPie} size="xl" />
          <div className="om-empty-title">{Language.noRevenueDataAvailable || 'No table data'}</div>
          <div className="om-empty-body">
            {Language.noRevenueDataHint ||
              'Table revenue will appear here once orders are archived.'}
          </div>
        </div>
      ) : (
        <>
          {/* ---------- Stat strip ---------- */}
          <div className="om-stats om-stats-4">
            {' '}
            <div className="om-stat">
              <div className="om-stat-label">
                <CIcon icon={cilMoney} /> {Language.TotalRevenue || 'Total revenue'}
              </div>
              <div className="om-stat-value is-success">
                {totalRevenue.toFixed(2)}
                <span className="unit">TND</span>
              </div>
            </div>
            <div className="om-stat">
              <div className="om-stat-label">
                <CIcon icon={cilRestaurant} /> {Language.Avg_Table || 'Avg / table'}
              </div>
              <div className="om-stat-value">
                {averageRevenue.toFixed(2)}
                <span className="unit">TND</span>
              </div>
            </div>
            <div className="om-stat">
              <div className="om-stat-label">
                <CIcon icon={cilChart} /> {Language.TopTable || 'Top table'}
              </div>
              <div className="om-stat-value is-warning">
                {topTable ? `#${topTable.tableNumber}` : '—'}
              </div>
              {topTable && (
                <div className="om-stat-hint">{topTable.totalRevenue.toFixed(2)} TND</div>
              )}
            </div>
            <div className="om-stat">
              <div className="om-stat-label">
                <CIcon icon={cilRestaurant} /> {Language.TotalTables || 'Tables'}
              </div>
              <div className="om-stat-value">{safeRows.length}</div>
            </div>
          </div>

          {/* ---------- Distribution + donut ---------- */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1.6fr) minmax(0, 1fr)',
              gap: 20,
              padding: '0 20px 20px 20px',
            }}
            className="om-revenue-split"
          >
            {/* Distribution */}
            <div>
              <div className="om-list-title" style={{ padding: '0 0 8px 0' }}>
                {Language.RevenueDistributionbyTable || 'Revenue distribution'}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {safeRows.map((row) => {
                  const pct = max > 0 ? (row.totalRevenue / max) * 100 : 0
                  const isTop = topTable && row.tableNumber === topTable.tableNumber
                  return (
                    <div key={row.tableNumber}>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          gap: 8,
                          fontSize: '0.85rem',
                          marginBottom: 4,
                        }}
                      >
                        <span
                          style={{
                            fontWeight: isTop ? 700 : 500,
                            color: isTop ? '#d97706' : '#1a1a1a',
                          }}
                        >
                          {Language.Table || 'Table'} {row.tableNumber}
                        </span>
                        <span
                          style={{
                            fontVariantNumeric: 'tabular-nums',
                            fontWeight: 700,
                          }}
                        >
                          {row.totalRevenue.toFixed(2)} TND
                        </span>
                      </div>
                      <div className="om-bar-track">
                        <div
                          className="om-bar-fill"
                          style={{
                            width: `${pct}%`,
                            background: isTop ? '#ffc107' : '#0d6efd',
                          }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Donut + legend */}
            <div>
              <div className="om-list-title" style={{ padding: '0 0 8px 0' }}>
                {Language.RevenueShare || 'Revenue share'}
              </div>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                <DonutChart
                  labels={safeRows.map((r) => `Table ${r.tableNumber}`)}
                  values={safeRows.map((r) => r.totalRevenue)}
                  colors={safeRows.map((_, i) => SLICE_COLORS[i % SLICE_COLORS.length])}
                  size={200}
                />
                <ul
                  style={{
                    listStyle: 'none',
                    padding: 0,
                    margin: 0,
                    width: '100%',
                    fontSize: '0.8rem',
                  }}
                >
                  {safeRows.map((row, i) => {
                    const pct = totalRevenue > 0 ? (row.totalRevenue / totalRevenue) * 100 : 0
                    return (
                      <li
                        key={row.tableNumber}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 8,
                          padding: '3px 0',
                        }}
                      >
                        <span
                          style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}
                        >
                          <span
                            style={{
                              display: 'inline-block',
                              width: 10,
                              height: 10,
                              borderRadius: 999,
                              background: SLICE_COLORS[i % SLICE_COLORS.length],
                              flexShrink: 0,
                            }}
                          />
                          <span
                            style={{
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {Language.Table || 'Table'} {row.tableNumber}
                          </span>
                        </span>
                        <span
                          style={{
                            color: '#6c757d',
                            fontVariantNumeric: 'tabular-nums',
                          }}
                        >
                          {pct.toFixed(1)}%
                        </span>
                      </li>
                    )
                  })}
                </ul>
              </div>
            </div>
          </div>

          {/* ---------- Top performers ---------- */}
          <div style={{ padding: '0 20px 20px 20px' }}>
            <div className="om-list-title" style={{ padding: '0 0 8px 0' }}>
              {Language.TopPerformers || 'Top performers'}
            </div>
            <div className="om-list">
              {safeRows.slice(0, 5).map((row, i) => (
                <div className="om-list-row" key={row.tableNumber}>
                  <div className="om-list-rank">#{i + 1}</div>
                  <div className="om-list-main">
                    <div className="om-list-primary">
                      {Language.Table || 'Table'} {row.tableNumber}
                    </div>
                    <div className="om-list-meta">
                      <span>{row.totalRevenue.toFixed(2)} TND</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default TableDashboard
