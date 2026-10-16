import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { CButton, CSpinner } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilUser, cilCalendar, cilMoney, cilChart, cilWarning, cilReload } from '@coreui/icons'
import axios from 'axios'
import { BaseUrl } from '../../../helpers/BaseUrl'
import { GetToken } from '../../../helpers/GetToken'
import { useSelector } from 'react-redux'
import translations from '../../../app/Language'
import './employeePerformance.css'

const MONTHS = [
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

const formatMonth = (key) => {
  if (!key || typeof key !== 'string') return '—'
  const [year, month] = key.split('-').map(Number)
  if (!year || !month || month < 1 || month > 12) return key
  return `${MONTHS[month - 1]} ${year}`
}

const RevenueByClient = () => {
  const token = GetToken()
  const t = useSelector((state) => state.language)
  const Language = translations[t]

  const [revenueData, setRevenueData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  /* ---------- fetch ---------- */
  const fetchRevenueByClient = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await axios.get(`${BaseUrl}/dashboard/revenue-by-client`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const normalized = (response.data || []).map((c) => ({
        clientId: c.clientId,
        clientName: c.clientName || 'Unknown',
        monthlyRevenue: (c.monthlyRevenue || []).map((m) => ({
          month: m.month,
          totalRevenue: Number(m.totalRevenue) || 0,
        })),
      }))
      setRevenueData(normalized)
    } catch (err) {
      console.error('Error fetching revenue by client:', err)
      setError(Language.fetchError || 'Failed to fetch revenue data. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [token, Language])

  useEffect(() => {
    fetchRevenueByClient()
  }, [fetchRevenueByClient])

  /* ---------- derived ---------- */
  const totalRevenue = useMemo(() => {
    return revenueData.reduce(
      (sum, c) => sum + c.monthlyRevenue.reduce((s, m) => s + m.totalRevenue, 0),
      0,
    )
  }, [revenueData])

  const clientCount = revenueData.length
  const averagePerClient = clientCount > 0 ? totalRevenue / clientCount : 0

  /* Flatten for the ranked list: one row per (client, month) pair, sorted by revenue */
  const flatRows = useMemo(() => {
    const rows = []
    revenueData.forEach((client) => {
      client.monthlyRevenue.forEach((m) => {
        rows.push({
          clientId: client.clientId,
          clientName: client.clientName,
          month: m.month,
          revenue: m.totalRevenue,
        })
      })
    })
    rows.sort((a, b) => b.revenue - a.revenue)
    return rows
  }, [revenueData])

  const maxRevenue = flatRows.length > 0 ? flatRows[0].revenue : 0

  const fmtTND = (v) =>
    new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
    }).format(Number(v) || 0)

  const barColor = (pct) => {
    if (pct >= 30) return '#198754'
    if (pct >= 10) return '#ffc107'
    return '#dc3545'
  }

  const isEmpty = !loading && !error && flatRows.length === 0

  /* ---------- render ---------- */
  return (
    <div className="em-card">
      {/* ---------- Header ---------- */}
      <div className="em-card-header">
        <div className="em-card-header-left">
          <h5 className="em-card-title">
            <CIcon icon={cilUser} />
            {Language.revenueByWaiter || 'Revenue by waiter'}
          </h5>
          <div className="em-card-subtitle">
            {Language.revenueByWaiterHint || 'Monthly revenue breakdown for each waiter'}
          </div>
        </div>

        <div className="em-card-header-right">
          <CButton
            color="secondary"
            variant="outline"
            onClick={fetchRevenueByClient}
            disabled={loading}
            aria-label={Language.Refresh || 'Refresh'}
          >
            <CIcon icon={cilReload} />
          </CButton>
        </div>
      </div>

      {/* ---------- Body ---------- */}
      {loading ? (
        <div className="em-skeleton">
          <div className="em-skeleton-line" style={{ width: '40%' }} />
          <div className="em-skeleton-block" />
        </div>
      ) : error ? (
        <div className="em-info em-info-danger">
          <CIcon icon={cilWarning} />
          <div style={{ flex: 1 }}>{error}</div>
          <CButton size="sm" color="danger" onClick={fetchRevenueByClient}>
            {Language.Retry || 'Retry'}
          </CButton>
        </div>
      ) : isEmpty ? (
        <div className="em-empty">
          <CIcon icon={cilMoney} size="xl" />
          <div className="em-empty-title">
            {Language.noRevenueDataAvailable || 'No revenue data yet'}
          </div>
          <div className="em-empty-body">
            {Language.noRevenueDataHint ||
              'Once your waiters have archived orders, their monthly totals will appear here.'}
          </div>
        </div>
      ) : (
        <>
          {/* ---------- Stats ---------- */}
          <div className="em-stats em-stats-4">
            <div className="em-stat">
              <div className="em-stat-label">
                <CIcon icon={cilUser} /> {Language.TotalWaiters || 'Waiters'}
              </div>
              <div className="em-stat-value">{clientCount}</div>
            </div>
            <div className="em-stat">
              <div className="em-stat-label">
                <CIcon icon={cilCalendar} /> {Language.TimePeriod || 'Period'}
              </div>
              <div className="em-stat-value" style={{ fontSize: '1rem' }}>
                {Language.AllData || 'All time'}
              </div>
            </div>
            <div className="em-stat">
              <div className="em-stat-label">
                <CIcon icon={cilMoney} /> {Language.TotalRevenue || 'Total'}
              </div>
              <div className="em-stat-value is-primary">
                {fmtTND(totalRevenue)}
                <span className="unit">TND</span>
              </div>
            </div>
            <div className="em-stat">
              <div className="em-stat-label">
                <CIcon icon={cilChart} /> {Language.Average || 'Avg / waiter'}
              </div>
              <div className="em-stat-value">
                {fmtTND(averagePerClient)}
                <span className="unit">TND</span>
              </div>
            </div>
          </div>

          {/* ---------- Ranked list ---------- */}
          <div className="em-list">
            {flatRows.map((row, index) => {
              const pctOfTotal = totalRevenue > 0 ? (row.revenue / totalRevenue) * 100 : 0
              const barPct = maxRevenue > 0 ? (row.revenue / maxRevenue) * 100 : 0
              return (
                <div className="em-row" key={`${row.clientId}-${row.month}-${index}`}>
                  <div className="em-rank">{index + 1}</div>
                  <div className="em-row-main">
                    <div className="em-row-top">
                      <span className="em-row-name">
                        {row.clientName}
                        <span className="em-row-month">{formatMonth(row.month)}</span>
                      </span>
                      <span className="em-row-amount">{fmtTND(row.revenue)} TND</span>
                    </div>
                    <div className="em-bar-track">
                      <div
                        className="em-bar-fill"
                        style={{
                          width: `${barPct}%`,
                          background: barColor(pctOfTotal),
                        }}
                      />
                    </div>
                    <div className="em-row-hint">
                      {pctOfTotal.toFixed(1)}% {Language.ofTotal || 'of total'}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

export default RevenueByClient
