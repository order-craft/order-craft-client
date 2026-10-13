import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { CButton, CCard, CCardBody, CSpinner } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilStar, cilReload, cilChart, cilWarning } from '@coreui/icons'
import axios from 'axios'
import { BaseUrl } from '../../helpers/BaseUrl'
import { GetToken } from '../../helpers/GetToken'
import { useSelector } from 'react-redux'
import translations from '../../app/Language'
import './tableGuru.css'

const PERIODS = [
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'This week' },
  { key: 'month', label: 'This month' },
  { key: 'all', label: 'All time' },
]

/* Medal colors for the top 3 */
const MEDALS = {
  0: { accent: '#d4a017', bg: '#fef3c7', label: 'gold' }, // gold
  1: { accent: '#94a3b8', bg: '#f1f5f9', label: 'silver' }, // silver
  2: { accent: '#b45309', bg: '#ffedd5', label: 'bronze' }, // bronze
}

const TableGuru = () => {
  const token = GetToken()
  const t = useSelector((state) => state.language)
  const Language = translations[t]

  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [period, setPeriod] = useState('month')

  /* ---------- fetch ---------- */
  const fetchRevenueData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await axios.get(
        `${BaseUrl}/tables/dashboard/revenue-per-table?period=${period}`,
        { headers: { Authorization: `Bearer ${token}` } },
      )
      setData(response.data || [])
    } catch (err) {
      console.error('Failed to fetch table leaderboard:', err)
      setError(err.response?.data?.message || 'Failed to load table leaderboard.')
    } finally {
      setLoading(false)
    }
  }, [token, period])

  useEffect(() => {
    fetchRevenueData()
  }, [fetchRevenueData])

  /* ---------- derived ---------- */
  const sorted = useMemo(() => {
    return [...data].sort((a, b) => (b.totalRevenue || 0) - (a.totalRevenue || 0))
  }, [data])

  const totals = useMemo(() => {
    const revenue = sorted.reduce((sum, t) => sum + (t.totalRevenue || 0), 0)
    const withSales = sorted.filter((t) => (t.totalRevenue || 0) > 0).length
    const top = sorted[0] || null
    return { revenue, withSales, top }
  }, [sorted])

  const maxRevenue = sorted[0]?.totalRevenue || 0

  /* ---------- render ---------- */
  return (
    <CCard className="mb-4">
      {/* ---- Top strip ---- */}
      <div className="tg-header">
        <div className="tg-header-inner">
          <div className="tg-header-left">
            <h5 className="tg-title">
              <CIcon icon={cilStar} className="tg-title-icon" />
              {Language.tableLeaderboard || 'Table leaderboard'}
            </h5>
            <div className="tg-subtitle">
              {data.length > 0 ? (
                <>
                  <strong>{sorted.length}</strong> {sorted.length === 1 ? 'table' : 'tables'}
                  {' · '}
                  <strong>{totals.revenue.toFixed(2)}</strong> TND
                  {totals.top && (
                    <>
                      {' · Top: '}
                      <strong>Table {totals.top.tableNumber}</strong>
                    </>
                  )}
                </>
              ) : (
                'Revenue ranking across your tables'
              )}
            </div>
          </div>

          <div className="tg-header-right">
            <div className="tg-tabs">
              {PERIODS.map((p) => (
                <button
                  key={p.key}
                  type="button"
                  className={`tg-tab ${period === p.key ? 'is-active' : ''}`}
                  onClick={() => setPeriod(p.key)}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <CButton
              color="primary"
              onClick={fetchRevenueData}
              disabled={loading}
              aria-label="Refresh"
            >
              <CIcon icon={cilReload} />
            </CButton>
          </div>
        </div>
      </div>

      <CCardBody className="p-0">
        {loading && data.length === 0 ? (
          <div className="tg-skeleton">
            <div className="tg-skeleton-row" />
            <div className="tg-skeleton-row" />
            <div className="tg-skeleton-row" />
            <div className="tg-skeleton-row" />
          </div>
        ) : error && data.length === 0 ? (
          <div className="tg-empty">
            <CIcon icon={cilWarning} size="xl" />
            <div className="tg-empty-title">{Language.errorMessage || 'Something went wrong'}</div>
            <div className="tg-empty-body">{error}</div>
            <CButton color="primary" onClick={fetchRevenueData}>
              {Language.retry || 'Retry'}
            </CButton>
          </div>
        ) : data.length === 0 ? (
          <div className="tg-empty">
            <CIcon icon={cilChart} size="xl" />
            <div className="tg-empty-title">{Language.noTableData || 'No table data yet'}</div>
            <div className="tg-empty-body">
              {Language.noTableDataHint ||
                'Once orders are archived, revenue will start ranking tables here.'}
            </div>
          </div>
        ) : (
          <>
            {/* Stats */}
            <div className="tg-stats">
              <div className="tg-stat">
                <div className="tg-stat-label">{Language.totalRevenue || 'Total revenue'}</div>
                <div className="tg-stat-value is-primary">
                  {totals.revenue.toFixed(2)}
                  <span className="tg-stat-unit">TND</span>
                </div>
              </div>
              <div className="tg-stat">
                <div className="tg-stat-label">
                  {Language.tablesWithSales || 'Tables with sales'}
                </div>
                <div className="tg-stat-value">{totals.withSales}</div>
              </div>
              <div className="tg-stat">
                <div className="tg-stat-label">{Language.topTable || 'Top table'}</div>
                <div className="tg-stat-value is-success">
                  {totals.top ? `#${totals.top.tableNumber}` : '—'}
                </div>
              </div>
            </div>

            {/* Leaderboard list */}
            <div className="tg-list">
              {sorted.map((row, index) => {
                const revenue = row.totalRevenue || 0
                const pct = maxRevenue > 0 ? (revenue / maxRevenue) * 100 : 0
                const medal = MEDALS[index]
                const isZero = revenue === 0

                return (
                  <div
                    key={row.tableNumber}
                    className={`tg-row ${medal ? 'is-medal' : ''} ${isZero ? 'is-zero' : ''}`}
                    style={medal ? { '--tg-accent': medal.accent } : undefined}
                  >
                    <div
                      className="tg-rank"
                      style={
                        medal
                          ? {
                              background: medal.bg,
                              color: medal.accent,
                            }
                          : undefined
                      }
                    >
                      {index + 1}
                    </div>

                    <div className="tg-info">
                      <div className="tg-table-line">
                        <span className="tg-table-name">
                          {Language.table || 'Table'} {row.tableNumber}
                        </span>
                        {index === 0 && !isZero && <span className="tg-crown">Top</span>}
                      </div>
                      <div className="tg-bar-track">
                        <div
                          className="tg-bar-fill"
                          style={{
                            width: `${pct}%`,
                            background: medal?.accent || 'var(--cui-primary, #0d6efd)',
                          }}
                        />
                      </div>
                    </div>

                    <div className="tg-amount">
                      <div className="tg-revenue">{isZero ? '—' : `${revenue.toFixed(2)} TND`}</div>
                      <div className="tg-pct">{isZero ? 'no sales' : `${pct.toFixed(0)}%`}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </CCardBody>
    </CCard>
  )
}

export default TableGuru
