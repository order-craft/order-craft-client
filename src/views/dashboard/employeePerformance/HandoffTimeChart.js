import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { CButton, CSpinner } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilClock, cilWarning, cilCalendar, cilInfo } from '@coreui/icons'
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

// Anything over this average is flagged as "slow".
const SLOW_THRESHOLD_MS = 5 * 60 * 1000 // 5 minutes

const fmtDuration = (ms) => {
  if (ms == null) return '—'
  const totalSeconds = Math.round(ms / 1000)
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  if (m === 0) return `${s}s`
  return `${m}m ${s.toString().padStart(2, '0')}s`
}

const HandoffTimeChart = () => {
  const token = GetToken()
  const t = useSelector((state) => state.language)
  const Language = translations[t]

  const [startDate, setStartDate] = useState(firstOfMonthISO())
  const [endDate, setEndDate] = useState(todayISO())
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [flowNotice, setFlowNotice] = useState(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    setFlowNotice(null)
    try {
      const res = await axios.post(
        `${BaseUrl}/dashboard/staff-role-breakdown`,
        { startDate, endDate },
        { headers: { Authorization: `Bearer ${token}` } },
      )
      const staff = res.data?.staff || []
      const deliverers = staff
        .filter((s) => s.avgReadyToDeliveredMs != null && s.deliveredCount > 0)
        .map((s) => ({
          staffId: s.staffId,
          name: s.name || 'Unknown',
          isDeleted: !!s.isDeleted,
          avgHandoffMs: Number(s.avgReadyToDeliveredMs) || 0,
          deliveredCount: Number(s.deliveredCount) || 0,
          avgPrepMs: s.avgPreparingToReadyMs != null ? Number(s.avgPreparingToReadyMs) : null,
        }))
        .sort((a, b) => a.avgHandoffMs - b.avgHandoffMs) // fastest first

      // If nobody has any ready→delivered data at all, we assume the tenant
      // isn't on four-step (ready/delivered don't exist outside it).
      const anyPrepOrDeliver = staff.some((s) => s.preparedCount > 0 || s.deliveredCount > 0)
      if (!anyPrepOrDeliver) {
        setFlowNotice(Language.handoffTimeOnlyFourStep)
      }

      setRows(deliverers)
    } catch (err) {
      console.error('Error fetching handoff data:', err)
      setError(err.response?.data?.message || 'Failed to load handoff data')
    } finally {
      setLoading(false)
    }
  }, [token, startDate, endDate, Language])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const maxHandoff = useMemo(() => rows.reduce((m, r) => Math.max(m, r.avgHandoffMs), 0), [rows])

  const isEmpty = !loading && !error && !flowNotice && rows.length === 0

  return (
    <div className="em-card">
      <div className="em-card-header">
        <div className="em-card-header-left">
          <h5 className="em-card-title">
            <CIcon icon={cilClock} />
            {Language.handoffTimeTitle || 'Handoff time'}
          </h5>
          <div className="em-card-subtitle">
            {Language.handoffTimeHint || 'Average time from ready to delivered, per deliverer'}
          </div>
        </div>

        <div className="em-card-header-right">
          <div className="em-date">
            <CIcon icon={cilCalendar} style={{ color: '#6c757d' }} />
            <input
              type="date"
              value={startDate}
              max={endDate}
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
          <CButton color="primary" onClick={fetchData} disabled={loading}>
            {loading ? <CSpinner size="sm" /> : Language.Apply || 'Apply'}
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
          <CButton size="sm" color="danger" onClick={fetchData}>
            {Language.Retry || 'Retry'}
          </CButton>
        </div>
      ) : flowNotice ? (
        <div className="em-info">
          <CIcon icon={cilInfo} />
          <div>{flowNotice}</div>
        </div>
      ) : isEmpty ? (
        <div className="em-empty">
          <CIcon icon={cilClock} size="xl" />
          <div className="em-empty-title">
            {Language.handoffTimeEmpty || 'No deliveries in this range'}
          </div>
          <div className="em-empty-body">
            {Language.handoffTimeEmptyHint ||
              'Handoff timing is only tracked for four-step tenants.'}
          </div>
        </div>
      ) : (
        <div className="em-bar-block" style={{ padding: '14px 20px 18px 20px' }}>
          {rows.map((r, i) => {
            const widthPct = maxHandoff > 0 ? (r.avgHandoffMs / maxHandoff) * 100 : 0
            const isSlow = r.avgHandoffMs > SLOW_THRESHOLD_MS
            return (
              <div key={r.staffId || i} className="em-bar-block-row">
                <div className="em-bar-block-label">
                  {r.name}
                  {r.isDeleted && (
                    <span className="em-role-pill is-deleted">
                      {Language.roleBreakdownDeletedBadge || 'Deleted'}
                    </span>
                  )}
                  {isSlow && (
                    <span className="em-role-pill is-warning">
                      {Language.handoffSlow || 'Slow'}
                    </span>
                  )}
                </div>
                <div className="em-bar-block-track">
                  <div
                    className="em-bar-block-seg"
                    style={{
                      width: `${widthPct}%`,
                      background: isSlow ? '#f59e0b' : '#0d6efd',
                    }}
                  />
                </div>
                <div className="em-bar-block-values">
                  <span className="em-bar-block-value">{fmtDuration(r.avgHandoffMs)}</span>
                  <span className="em-bar-block-subvalue">
                    {r.deliveredCount} {Language.deliveredPill || 'delivered'}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default HandoffTimeChart
