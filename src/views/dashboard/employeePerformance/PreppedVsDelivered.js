import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { CButton, CSpinner } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilWarning, cilChart, cilCalendar } from '@coreui/icons'
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

const PreppedVsDelivered = () => {
  const token = GetToken()
  const t = useSelector((state) => state.language)
  const Language = translations[t]

  const [startDate, setStartDate] = useState(firstOfMonthISO())
  const [endDate, setEndDate] = useState(todayISO())
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await axios.post(
        `${BaseUrl}/dashboard/staff-role-breakdown`,
        { startDate, endDate },
        { headers: { Authorization: `Bearer ${token}` } },
      )
      const list = (res.data?.staff || [])
        .filter((s) => s.preparedCount > 0 || s.deliveredCount > 0)
        .map((s) => ({
          staffId: s.staffId,
          name: s.name || 'Unknown',
          isDeleted: !!s.isDeleted,
          preparedCount: Number(s.preparedCount) || 0,
          deliveredCount: Number(s.deliveredCount) || 0,
        }))
      // Sort by (prepared + delivered) desc
      list.sort((a, b) => b.preparedCount + b.deliveredCount - (a.preparedCount + a.deliveredCount))
      setRows(list)
    } catch (err) {
      console.error('Error fetching staff role breakdown:', err)
      setError(err.response?.data?.message || 'Failed to load breakdown')
    } finally {
      setLoading(false)
    }
  }, [token, startDate, endDate])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const maxTotal = useMemo(
    () => rows.reduce((m, r) => Math.max(m, r.preparedCount + r.deliveredCount), 0),
    [rows],
  )

  const isEmpty = !loading && !error && rows.length === 0

  return (
    <div className="em-card">
      <div className="em-card-header">
        <div className="em-card-header-left">
          <h5 className="em-card-title">
            <CIcon icon={cilChart} />
            {Language.preppedVsDeliveredTitle || 'Prepped vs delivered'}
          </h5>
          <div className="em-card-subtitle">
            {Language.preppedVsDeliveredHint || 'Orders each staff member prepared and delivered'}
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
      ) : isEmpty ? (
        <div className="em-empty">
          <CIcon icon={cilChart} size="xl" />
          <div className="em-empty-title">
            {Language.preppedVsDeliveredEmpty || 'No prepped or delivered orders'}
          </div>
          <div className="em-empty-body">
            {Language.preppedVsDeliveredEmptyHint || 'Try a different date range or flow.'}
          </div>
        </div>
      ) : (
        <div className="em-bar-block" style={{ padding: '14px 20px 18px 20px' }}>
          {rows.map((r, i) => {
            const total = r.preparedCount + r.deliveredCount
            const widthPct = maxTotal > 0 ? (total / maxTotal) * 100 : 0
            const preparedPct = total > 0 ? (r.preparedCount / total) * widthPct : 0
            const deliveredPct = total > 0 ? (r.deliveredCount / total) * widthPct : 0
            return (
              <div key={r.staffId || i} className="em-bar-block-row">
                <div className="em-bar-block-label">
                  {r.name}
                  {r.isDeleted && (
                    <span className="em-role-pill is-deleted">
                      {Language.roleBreakdownDeletedBadge || 'Deleted'}
                    </span>
                  )}
                </div>
                <div className="em-bar-block-track">
                  <div
                    className="em-bar-block-seg is-preparer"
                    style={{ width: `${preparedPct}%` }}
                    title={`${Language.preparedPill || 'Prepared'}: ${r.preparedCount}`}
                  />
                  <div
                    className="em-bar-block-seg is-deliverer"
                    style={{ width: `${deliveredPct}%` }}
                    title={`${Language.deliveredPill || 'Delivered'}: ${r.deliveredCount}`}
                  />
                </div>
                <div className="em-bar-block-values">
                  <span className="em-bar-block-value is-preparer">{r.preparedCount}</span>
                  <span className="em-bar-block-value is-deliverer">{r.deliveredCount}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default PreppedVsDelivered
