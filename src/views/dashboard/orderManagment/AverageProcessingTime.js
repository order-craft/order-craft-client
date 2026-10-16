import React, { useState } from 'react'
import { CButton, CSpinner } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilClock, cilChart, cilCheckCircle, cilWarning, cilInfo } from '@coreui/icons'
import axios from 'axios'
import { BaseUrl } from '../../../helpers/BaseUrl'
import { GetToken } from '../../../helpers/GetToken'
import { useSelector } from 'react-redux'
import translations from '../../../app/Language'
import './orderManagement.css'

/* local-date helpers — avoid the UTC offset bug */
const toLocalISO = (d) => {
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}
const todayISO = () => toLocalISO(new Date())

const AverageProcessingTime = () => {
  const t = useSelector((state) => state.language)
  const Language = translations[t]
  const token = GetToken()

  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [avgTimes, setAvgTimes] = useState(null)
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

  const fetchAverageProcessingTime = async () => {
    if (!startDate || !endDate) {
      setError(Language.selectBothDates || 'Select both start and end dates')
      return
    }
    setLoading(true)
    setError(null)
    setAvgTimes(null)
    try {
      const response = await axios.post(
        `${BaseUrl}/dashboard/average-processing-time`,
        { startDate, endDate },
        { headers: { Authorization: `Bearer ${token}` } },
      )
      setAvgTimes(response.data)
    } catch (err) {
      console.error('Error fetching average processing time:', err)
      setError(
        err.response?.data?.message ||
          Language.fetchError ||
          'Failed to fetch data. Please try again.',
      )
    } finally {
      setLoading(false)
    }
  }

  const formatMinutes = (minutes) => {
    const value = Number(minutes) || 0
    if (value < 60) return `${Math.round(value)} min`
    const hours = Math.floor(value / 60)
    const mins = Math.round(value % 60)
    return `${hours}h ${mins}m`
  }

  const calculateEfficiency = (time) => {
    const v = Number(time) || 0
    if (v < 30) return { label: Language.Excellent || 'Excellent', tone: 'success' }
    if (v < 60) return { label: Language.Good || 'Good', tone: 'info' }
    if (v < 90) return { label: Language.Average || 'Average', tone: 'warning' }
    return { label: Language.NeedsImprovement || 'Needs improvement', tone: 'danger' }
  }

  /* ---------- render ---------- */
  const renderStats = () => {
    if (!avgTimes || avgTimes.statusFlowDisabled) return null

    const acceptanceTone = calculateEfficiency(avgTimes.avgPendingToPreparing)
    const completionTone = calculateEfficiency(avgTimes.avgPreparingToCompleted)

    const acceptancePct = Math.min((Number(avgTimes.avgPendingToPreparing) / 120) * 100, 100)
    const completionPct = Math.min((Number(avgTimes.avgPreparingToCompleted) / 180) * 100, 100)

    return (
      <div className="om-stats">
        {/* Acceptance */}
        <div className="om-stat">
          <div className="om-stat-label">
            <CIcon icon={cilClock} /> {Language.OrderAcceptance || 'Acceptance'}
          </div>
          <div className="om-stat-value">{formatMinutes(avgTimes.avgPendingToPreparing)}</div>
          <div className="om-bar-track">
            <div
              className="om-bar-fill"
              style={{
                width: `${acceptancePct}%`,
                background: '#d97706',
              }}
            />
          </div>
          <div className="om-stat-hint">
            {Language.Efficiency || 'Efficiency'}: <strong>{acceptanceTone.label}</strong>
          </div>
          <div className="om-stat-detail">
            <span className="om-stat-detail-label">{Language.Fastest || 'Fastest'}</span>
            <span className="om-stat-detail-value">
              {formatMinutes(avgTimes.minPendingToPreparing)}
            </span>
          </div>
          <div className="om-stat-detail">
            <span className="om-stat-detail-label">{Language.Slowest || 'Slowest'}</span>
            <span className="om-stat-detail-value">
              {formatMinutes(avgTimes.maxPendingToPreparing)}
            </span>
          </div>
        </div>

        {/* Completion */}
        <div className="om-stat">
          <div className="om-stat-label">
            <CIcon icon={cilCheckCircle} /> {Language.OrderCompletion || 'Completion'}
          </div>
          <div className="om-stat-value">{formatMinutes(avgTimes.avgPreparingToCompleted)}</div>
          <div className="om-bar-track">
            <div
              className="om-bar-fill"
              style={{
                width: `${completionPct}%`,
                background: '#198754',
              }}
            />
          </div>
          <div className="om-stat-hint">
            {Language.Efficiency || 'Efficiency'}: <strong>{completionTone.label}</strong>
          </div>
          <div className="om-stat-detail">
            <span className="om-stat-detail-label">{Language.Fastest || 'Fastest'}</span>
            <span className="om-stat-detail-value">
              {formatMinutes(avgTimes.minPreparingToCompleted)}
            </span>
          </div>
          <div className="om-stat-detail">
            <span className="om-stat-detail-label">{Language.Slowest || 'Slowest'}</span>
            <span className="om-stat-detail-value">
              {formatMinutes(avgTimes.maxPreparingToCompleted)}
            </span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="om-card">
      {/* ---------- Header ---------- */}
      <div className="om-card-header">
        <div className="om-card-header-left">
          <h5 className="om-card-title">
            <CIcon icon={cilClock} />
            {Language.OrderProcessingEfficiency || 'Order processing efficiency'}
          </h5>
          <div className="om-card-subtitle">
            {startDate && endDate
              ? `${startDate} → ${endDate}`
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

          <CButton
            color="primary"
            onClick={fetchAverageProcessingTime}
            disabled={loading || !startDate || !endDate}
          >
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

      {/* ---------- Custom range pickers ---------- */}
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

      {/* ---------- Body ---------- */}
      {loading ? (
        <div className="om-skeleton">
          <div className="om-skeleton-line" style={{ width: '40%' }} />
          <div className="om-skeleton-block" />
        </div>
      ) : error ? (
        <div
          className="om-info"
          style={{ background: '#fee2e2', borderColor: '#fecaca', color: '#991b1b' }}
        >
          <CIcon icon={cilWarning} />
          <div>{error}</div>
        </div>
      ) : avgTimes?.statusFlowDisabled ? (
        <div className="om-info">
          <CIcon icon={cilInfo} />
          <div>
            {Language.statusFlowDisabledNotice ||
              'Order status flow is disabled for this business — processing times are not tracked.'}
          </div>
        </div>
      ) : !avgTimes ? (
        <div className="om-empty">
          <CIcon icon={cilClock} size="xl" />
          <div className="om-empty-title">{Language.noDataYet || 'No analysis yet'}</div>
          <div className="om-empty-body">
            {Language.analyzeHint ||
              'Pick a range and tap Analyze to see how efficient the kitchen is.'}
          </div>
        </div>
      ) : (
        renderStats()
      )}
    </div>
  )
}

export default AverageProcessingTime
