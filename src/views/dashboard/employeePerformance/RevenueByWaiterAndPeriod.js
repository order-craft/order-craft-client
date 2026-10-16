import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { CButton, CSpinner } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilUser, cilCalendar, cilMoney, cilChart, cilWarning, cilFilter } from '@coreui/icons'
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
const firstOfMonthISO = () => {
  const d = new Date()
  return toLocalISO(new Date(d.getFullYear(), d.getMonth(), 1))
}
const lastOfMonthISO = () => {
  const d = new Date()
  return toLocalISO(new Date(d.getFullYear(), d.getMonth() + 1, 0))
}

const RevenueByWaiterAndPeriod = () => {
  const token = GetToken()
  const t = useSelector((state) => state.language)
  const Language = translations[t]

  const [waiters, setWaiters] = useState([])
  const [selectedWaiter, setSelectedWaiter] = useState('')
  const [startDate, setStartDate] = useState(firstOfMonthISO())
  const [endDate, setEndDate] = useState(lastOfMonthISO())
  const [revenueData, setRevenueData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  /* ---------- fetch waiters ---------- */
  useEffect(() => {
    const loadWaiters = async () => {
      try {
        const response = await axios.get(`${BaseUrl}/auth/superClient/getUsers`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        setWaiters(response.data || [])
      } catch (err) {
        console.error('Error fetching waiters:', err)
      }
    }
    loadWaiters()
  }, [token])

  /* ---------- fetch revenue ---------- */
  const fetchRevenue = useCallback(async () => {
    if (!startDate || !endDate) {
      setError(Language.selectBothDates || 'Select both start and end dates')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const response = await axios.post(
        `${BaseUrl}/dashboard/revenue-by-waiter-and-period`,
        { clientId: selectedWaiter || undefined, startDate, endDate },
        { headers: { Authorization: `Bearer ${token}` } },
      )
      const normalized = (response.data || [])
        .map((w) => ({
          clientId: w.clientId,
          clientName: w.clientName || 'Unknown',
          totalRevenue: Number(w.totalRevenue) || 0,
        }))
        .sort((a, b) => b.totalRevenue - a.totalRevenue)
      setRevenueData(normalized)
    } catch (err) {
      console.error('Error fetching revenue:', err)
      setError(Language.fetchError || 'Failed to fetch revenue data. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [token, selectedWaiter, startDate, endDate, Language])

  useEffect(() => {
    fetchRevenue()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate, selectedWaiter])

  /* ---------- derived ---------- */
  const totalRevenue = useMemo(
    () => revenueData.reduce((sum, w) => sum + w.totalRevenue, 0),
    [revenueData],
  )
  const averageRevenue = revenueData.length > 0 ? totalRevenue / revenueData.length : 0
  const maxRevenue = revenueData.length > 0 ? revenueData[0].totalRevenue : 0

  const fmtTND = (v) =>
    new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
    }).format(Number(v) || 0)

  const barColor = (pct) => {
    if (pct >= 30) return '#198754'
    if (pct >= 10) return '#ffc107'
    return '#dc3545'
  }

  const isEmpty = !loading && !error && revenueData.length === 0

  const selectedWaiterName = selectedWaiter
    ? waiters.find((w) => w._id === selectedWaiter)?.fullName
    : null

  /* ---------- render ---------- */
  return (
    <div className="em-card">
      {/* ---------- Header ---------- */}
      <div className="em-card-header">
        <div className="em-card-header-left">
          <h5 className="em-card-title">
            <CIcon icon={cilFilter} />
            {Language.RevenueByWaiterAndPeriod || 'Revenue by waiter · period'}
          </h5>
          <div className="em-card-subtitle">
            {selectedWaiterName ? selectedWaiterName : Language.allWaiters || 'All waiters'} ·{' '}
            {startDate} → {endDate}
          </div>
        </div>

        <div className="em-card-header-right">
          <CButton
            color="primary"
            onClick={fetchRevenue}
            disabled={loading || !startDate || !endDate}
          >
            {loading ? (
              <>
                <CSpinner size="sm" className="me-2" />
                {Language.Loading || 'Loading…'}
              </>
            ) : (
              <>
                <CIcon icon={cilChart} className="me-2" />
                {Language.Apply || 'Apply'}
              </>
            )}
          </CButton>
        </div>
      </div>

      {/* ---------- Filters row ---------- */}
      <div className="em-filters">
        <div className="em-date" style={{ minWidth: 200 }}>
          <CIcon icon={cilUser} style={{ color: '#6c757d' }} />
          <select
            value={selectedWaiter}
            onChange={(e) => setSelectedWaiter(e.target.value)}
            aria-label="Select waiter"
            style={{
              border: 'none',
              outline: 'none',
              background: 'transparent',
              fontSize: '0.88rem',
              color: '#1a1a1a',
              cursor: 'pointer',
              width: '100%',
            }}
          >
            <option value="">{Language.allWaiters || 'All waiters'}</option>
            {waiters.map((w) => (
              <option key={w._id} value={w._id}>
                {w.fullName}
              </option>
            ))}
          </select>
        </div>

        <div className="em-date-group">
          <div className="em-date">
            <CIcon icon={cilCalendar} style={{ color: '#6c757d' }} />
            <input
              type="date"
              value={startDate}
              max={endDate || todayISO()}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <span className="em-date-sep">→</span>
          <div className="em-date">
            <input
              type="date"
              value={endDate}
              min={startDate}
              max={todayISO()}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
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
          <CButton size="sm" color="danger" onClick={fetchRevenue}>
            {Language.Retry || 'Retry'}
          </CButton>
        </div>
      ) : isEmpty ? (
        <div className="em-empty">
          <CIcon icon={cilMoney} size="xl" />
          <div className="em-empty-title">
            {Language.noRevenueInRange || 'No revenue in this range'}
          </div>
          <div className="em-empty-body">
            {selectedWaiterName
              ? `${selectedWaiterName} had no archived orders in this period.`
              : Language.noRevenueInRangeHint || 'Try a wider range or a different waiter.'}
          </div>
        </div>
      ) : (
        <>
          {/* ---------- Stats ---------- */}
          <div className="em-stats em-stats-4">
            <div className="em-stat">
              <div className="em-stat-label">
                <CIcon icon={cilUser} /> {Language.Waiters || 'Waiters'}
              </div>
              <div className="em-stat-value">{revenueData.length}</div>
            </div>
            <div className="em-stat">
              <div className="em-stat-label">
                <CIcon icon={cilCalendar} /> {Language.Period || 'Period'}
              </div>
              <div className="em-stat-value" style={{ fontSize: '0.95rem' }}>
                {startDate} → {endDate}
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
                {fmtTND(averageRevenue)}
                <span className="unit">TND</span>
              </div>
            </div>
          </div>

          {/* ---------- Ranked list ---------- */}
          <div className="em-list">
            {revenueData.map((row, index) => {
              const share = totalRevenue > 0 ? (row.totalRevenue / totalRevenue) * 100 : 0
              const barPct = maxRevenue > 0 ? (row.totalRevenue / maxRevenue) * 100 : 0
              const isTop = index === 0
              return (
                <div className="em-row" key={row.clientId}>
                  <div className={`em-rank ${isTop ? 'is-top' : ''}`}>{index + 1}</div>
                  <div className="em-row-main">
                    <div className="em-row-top">
                      <span className="em-row-name">
                        {row.clientName}
                        {isTop && <span className="em-top-pill">{Language.Top || 'Top'}</span>}
                      </span>
                      <span className="em-row-amount">{fmtTND(row.totalRevenue)} TND</span>
                    </div>
                    <div className="em-bar-track">
                      <div
                        className="em-bar-fill"
                        style={{
                          width: `${barPct}%`,
                          background: barColor(share),
                        }}
                      />
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

export default RevenueByWaiterAndPeriod
