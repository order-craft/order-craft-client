import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { CButton, CCard, CCardBody } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilStar, cilReload, cilChart, cilWarning } from '@coreui/icons'
import axios from 'axios'
import { BaseUrl } from '../../helpers/BaseUrl'
import { GetToken } from '../../helpers/GetToken'
import { useSelector } from 'react-redux'
import translations from '../../app/Language'
import './tableGuru.css'

const MEDALS = {
  0: { accent: '#d4a017', bg: '#fef3c7' },
  1: { accent: '#94a3b8', bg: '#f1f5f9' },
  2: { accent: '#b45309', bg: '#ffedd5' },
}

const TableGuru = () => {
  const token = GetToken()
  const t = useSelector((state) => state.language)
  const Language = translations[t]

  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchRevenueData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await axios.get(`${BaseUrl}/tables/dashboard/revenue-per-table`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setData(response.data || [])
    } catch (err) {
      console.error('Failed to fetch table leaderboard:', err)
      setError(err.response?.data?.message || 'Failed to load table leaderboard.')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    fetchRevenueData()
  }, [fetchRevenueData])

  const sorted = useMemo(() => {
    return [...data].sort((a, b) => (b.totalRevenue || 0) - (a.totalRevenue || 0))
  }, [data])

  const totals = useMemo(() => {
    const revenue = sorted.reduce((sum, t) => sum + (t.totalRevenue || 0), 0)
    const top = sorted[0] || null
    return { revenue, top, count: sorted.length }
  }, [sorted])

  const maxRevenue = sorted[0]?.totalRevenue || 0

  return (
    <CCard className="mb-4">
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
                  <strong>{totals.count}</strong> {totals.count === 1 ? 'table' : 'tables'} open
                  {' · '}
                  <strong>{totals.revenue.toFixed(2)}</strong> TND live
                  {totals.top && (
                    <>
                      {' · Leading: '}
                      <strong>Table {totals.top.tableNumber}</strong>
                    </>
                  )}
                </>
              ) : (
                'Live ranking · updates as orders come in'
              )}
            </div>
          </div>

          <div className="tg-header-right">
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
            <div className="tg-empty-title">
              {Language.noOpenTables || 'No open tables right now'}
            </div>
            <div className="tg-empty-body">
              {Language.noOpenTablesHint ||
                'As soon as an order is placed, its table appears here.'}
            </div>
          </div>
        ) : (
          <>
            <div className="tg-stats">
              <div className="tg-stat">
                <div className="tg-stat-label">{Language.liveRevenue || 'Live revenue'}</div>
                <div className="tg-stat-value is-primary">
                  {totals.revenue.toFixed(2)}
                  <span className="tg-stat-unit">TND</span>
                </div>
              </div>
              <div className="tg-stat">
                <div className="tg-stat-label">{Language.openTables || 'Open tables'}</div>
                <div className="tg-stat-value">{totals.count}</div>
              </div>
              <div className="tg-stat">
                <div className="tg-stat-label">{Language.topTable || 'Leading table'}</div>
                <div className="tg-stat-value is-success">
                  {totals.top ? `#${totals.top.tableNumber}` : '—'}
                </div>
              </div>
            </div>

            <div className="tg-list">
              {sorted.map((row, index) => {
                const revenue = row.totalRevenue || 0
                const pct = maxRevenue > 0 ? (revenue / maxRevenue) * 100 : 0
                const medal = MEDALS[index]

                return (
                  <div
                    key={row.tableNumber}
                    className={`tg-row ${medal ? 'is-medal' : ''}`}
                    style={medal ? { '--tg-accent': medal.accent } : undefined}
                  >
                    <div
                      className="tg-rank"
                      style={medal ? { background: medal.bg, color: medal.accent } : undefined}
                    >
                      {index + 1}
                    </div>

                    <div className="tg-info">
                      <div className="tg-table-line">
                        <span className="tg-table-name">
                          {Language.table || 'Table'} {row.tableNumber}
                        </span>
                        {index === 0 && <span className="tg-crown">Leading</span>}
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
                      <div className="tg-revenue">{revenue.toFixed(2)} TND</div>
                      <div className="tg-pct">{pct.toFixed(0)}%</div>
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
