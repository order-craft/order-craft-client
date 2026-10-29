import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { CButton, CSpinner } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import {
  cilUser,
  cilCalendar,
  cilDollar,
  cilChart,
  cilWarning,
  cilReload,
  cilCheckCircle,
  cilArrowRight,
} from '@coreui/icons'
import axios from 'axios'
import { BaseUrl } from '../../../helpers/BaseUrl'
import { GetToken } from '../../../helpers/GetToken'
import { useSelector } from 'react-redux'
import translations from '../../../app/Language'
import './employeePerformance.css'

const toLocalISO = (d) => {
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}
const todayISO = () => toLocalISO(new Date())

const DailyRevenuePerWaiter = () => {
  const token = GetToken()
  const t = useSelector((state) => state.language)
  const Language = translations[t]

  const [date, setDate] = useState(todayISO())
  const [revenueData, setRevenueData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchDailyRevenue = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await axios.post(
        `${BaseUrl}/dashboard/daily-revenue-per-waiter`,
        { date },
        { headers: { Authorization: `Bearer ${token}` } },
      )
      const list = (response.data || []).map((w) => ({
        staffId: w.staffId,
        name: w.name || 'Unknown',
        role: w.role || null,
        isDeleted: !!w.isDeleted,
        totalRevenue: Number(w.totalRevenue) || 0,
        preparedCount: Number(w.preparedCount) || 0,
        preparedRevenue: Number(w.preparedRevenue) || 0,
        deliveredCount: Number(w.deliveredCount) || 0,
        deliveredRevenue: Number(w.deliveredRevenue) || 0,
      }))
      list.sort((a, b) => b.totalRevenue - a.totalRevenue)
      setRevenueData(list)
    } catch (err) {
      console.error('Error fetching daily revenue:', err)
      setError(Language.fetchError || 'Failed to fetch daily revenue. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [token, date, Language])

  useEffect(() => {
    fetchDailyRevenue()
  }, [fetchDailyRevenue])

  const totalRevenue = useMemo(
    () => revenueData.reduce((sum, w) => sum + w.totalRevenue, 0),
    [revenueData],
  )
  const averageRevenue = revenueData.length > 0 ? totalRevenue / revenueData.length : 0
  const topWaiter = revenueData[0] || null
  const maxRevenue = topWaiter?.totalRevenue || 0

  const fmtTND = (v) =>
    new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
    }).format(Number(v) || 0)

  const tone = (revenue) => {
    if (averageRevenue === 0) return 'default'
    if (revenue >= averageRevenue * 1.5) return 'success'
    if (revenue >= averageRevenue) return 'info'
    if (revenue >= averageRevenue * 0.5) return 'warning'
    return 'danger'
  }

  const barColor = {
    success: '#198754',
    info: '#0dcaf0',
    warning: '#ffc107',
    danger: '#dc3545',
    default: '#6c757d',
  }

  const isEmpty = !loading && !error && revenueData.length === 0

  return (
    <div className="em-card">
      <div className="em-card-header">
        <div className="em-card-header-left">
          <h5 className="em-card-title">
            <CIcon icon={cilUser} />
            {Language.DailyRevenuePerWaiter || 'Daily revenue per waiter'}
          </h5>
          <div className="em-card-subtitle">
            {Language.performanceBreakdown || 'Revenue performance for a single day'}
          </div>
        </div>

        <div className="em-card-header-right">
          <div className="em-date">
            <CIcon icon={cilCalendar} style={{ color: '#6c757d' }} />
            <input
              type="date"
              value={date}
              max={todayISO()}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <CButton
            color="secondary"
            variant="outline"
            onClick={fetchDailyRevenue}
            disabled={loading}
            aria-label={Language.Refresh || 'Refresh'}
          >
            <CIcon icon={cilReload} />
          </CButton>
        </div>
      </div>

      {loading ? (
        <div className="em-skeleton">
          <div className="em-skeleton-line" style={{ width: '40%' }} />
          <div className="em-skeleton-block" />
        </div>
      ) : error ? (
        <div className="em-info em-info-danger">
          <CIcon icon={cilWarning} />
          <div style={{ flex: 1 }}>{error}</div>
          <CButton size="sm" color="danger" onClick={fetchDailyRevenue}>
            {Language.Retry || 'Retry'}
          </CButton>
        </div>
      ) : isEmpty ? (
        <div className="em-empty">
          <CIcon icon={cilDollar} size="xl" />
          <div className="em-empty-title">
            {Language.noRevenueThisDay || 'No revenue for this day'}
          </div>
          <div className="em-empty-body">
            {Language.noRevenueThisDayHint ||
              'Try another date — waiting staff with archived orders will show up here.'}
          </div>
        </div>
      ) : (
        <>
          <div className="em-stats em-stats-4">
            <div className="em-stat">
              <div className="em-stat-label">
                <CIcon icon={cilUser} /> {Language.TotalWaiters || 'Waiters'}
              </div>
              <div className="em-stat-value">{revenueData.length}</div>
            </div>
            <div className="em-stat">
              <div className="em-stat-label">
                <CIcon icon={cilDollar} /> {Language.TotalRevenue || 'Total revenue'}
              </div>
              <div className="em-stat-value is-primary">
                {fmtTND(totalRevenue)}
                <span className="unit">TND</span>
              </div>
            </div>
            <div className="em-stat">
              <div className="em-stat-label">
                <CIcon icon={cilChart} /> {Language.Average || 'Average'}
              </div>
              <div className="em-stat-value">
                {fmtTND(averageRevenue)}
                <span className="unit">TND</span>
              </div>
            </div>
            <div className="em-stat">
              <div className="em-stat-label">
                <CIcon icon={cilUser} /> {Language.TopWaiter || 'Top waiter'}
              </div>
              <div className="em-stat-value is-success" style={{ fontSize: '1rem' }}>
                {topWaiter ? topWaiter.name : '—'}
              </div>
              {topWaiter && (
                <div className="em-stat-hint">{fmtTND(topWaiter.totalRevenue)} TND</div>
              )}
            </div>
          </div>

          <div className="em-list">
            {revenueData.map((row, index) => {
              const pct = maxRevenue > 0 ? (row.totalRevenue / maxRevenue) * 100 : 0
              const share = totalRevenue > 0 ? (row.totalRevenue / totalRevenue) * 100 : 0
              const t = tone(row.totalRevenue)
              const isTop = index === 0
              return (
                <div className="em-row" key={row.staffId || index}>
                  <div className={`em-rank ${isTop ? 'is-top' : ''}`}>{index + 1}</div>
                  <div className="em-row-main">
                    <div className="em-row-top">
                      <span className="em-row-name">
                        {row.name}
                        {row.isDeleted && (
                          <span className="em-role-pill is-deleted">
                            {Language.roleBreakdownDeletedBadge || 'Deleted'}
                          </span>
                        )}
                        {isTop && <span className="em-top-pill">{Language.Top || 'Top'}</span>}
                      </span>
                      <span className="em-row-amount">{fmtTND(row.totalRevenue)} TND</span>
                    </div>
                    <div className="em-bar-track">
                      <div
                        className="em-bar-fill"
                        style={{
                          width: `${pct}%`,
                          background: barColor[t],
                        }}
                      />
                    </div>

                    <div className="em-role-row">
                      {row.preparedCount > 0 && (
                        <span className="em-role-pill is-preparer">
                          <CIcon icon={cilCheckCircle} />
                          {Language.preparedPill || 'Prepared'} · {row.preparedCount} ·{' '}
                          {fmtTND(row.preparedRevenue)} TND
                        </span>
                      )}
                      {row.deliveredCount > 0 && (
                        <span className="em-role-pill is-deliverer">
                          <CIcon icon={cilArrowRight} />
                          {Language.deliveredPill || 'Delivered'} · {row.deliveredCount} ·{' '}
                          {fmtTND(row.deliveredRevenue)} TND
                        </span>
                      )}
                      {row.preparedCount === 0 && row.deliveredCount === 0 && (
                        <span className="em-role-pill is-muted">
                          {Language.roleBreakdownEmpty || 'No role data'}
                        </span>
                      )}
                    </div>

                    <div className="em-row-hint">
                      {share.toFixed(1)}% {Language.ofTotal || 'of total'}
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

export default DailyRevenuePerWaiter
