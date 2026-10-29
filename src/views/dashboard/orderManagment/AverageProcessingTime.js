import React, { useState } from 'react'
import { CButton, CSpinner } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import {
  cilClock,
  cilChart,
  cilCheckCircle,
  cilWarning,
  cilInfo,
  cilFire,
  cilInbox,
  cilArrowRight,
} from '@coreui/icons'
import axios from 'axios'
import { BaseUrl } from '../../../helpers/BaseUrl'
import { GetToken } from '../../../helpers/GetToken'
import { useSelector } from 'react-redux'
import translations from '../../../app/Language'
import './orderManagement.css'

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

  const fetchAverageProcessingTime = async () => {
    if (!startDate || !endDate) {
      setError(Language.selectBothDates || 'Select both start and end dates')
      return
    }
    setLoading(true)
    setError(null)
    setData(null)
    try {
      const response = await axios.post(
        `${BaseUrl}/dashboard/average-processing-time`,
        { startDate, endDate },
        { headers: { Authorization: `Bearer ${token}` } },
      )
      setData(response.data)
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

  // Render one metric card given a normalized metric object.
  const renderMetricCard = (metric, opts) => {
    if (!metric) {
      return (
        <div className="om-stat" key={opts.key}>
          <div className="om-stat-label">
            <CIcon icon={opts.icon} /> {opts.label}
          </div>
          <div className="om-stat-value" style={{ color: '#a0aec0', fontSize: '1rem' }}>
            —
          </div>
          <div className="om-stat-hint">
            {Language.processingNoDataForFlow || 'No timing data for this flow.'}
          </div>
        </div>
      )
    }

    const tone = calculateEfficiency(metric.avg)
    const pct = Math.min((metric.avg / 120) * 100, 100)

    return (
      <div className="om-stat" key={opts.key}>
        <div className="om-stat-label">
          <CIcon icon={opts.icon} /> {opts.label}
        </div>
        <div className="om-stat-value">{formatMinutes(metric.avg)}</div>
        <div className="om-bar-track">
          <div className="om-bar-fill" style={{ width: `${pct}%`, background: opts.barColor }} />
        </div>
        <div className="om-stat-hint">
          {Language.Efficiency || 'Efficiency'}: <strong>{tone.label}</strong> · {metric.count}{' '}
          {Language.processingStatCount || 'orders'}
        </div>
        <div className="om-stat-detail">
          <span className="om-stat-detail-label">{Language.Fastest || 'Fastest'}</span>
          <span className="om-stat-detail-value">{formatMinutes(metric.min)}</span>
        </div>
        <div className="om-stat-detail">
          <span className="om-stat-detail-label">{Language.Slowest || 'Slowest'}</span>
          <span className="om-stat-detail-value">{formatMinutes(metric.max)}</span>
        </div>
      </div>
    )
  }

  const renderBody = () => {
    if (!data) return null

    if (data.statusFlowDisabled || data.flow === 'two-step') {
      return (
        <div className="om-info">
          <CIcon icon={cilInfo} />
          <div>
            {data.message ||
              Language.statusFlowDisabledNotice ||
              'Order status flow is disabled for this business — processing times are not tracked.'}
          </div>
        </div>
      )
    }

    const flow = data.flow || 'three-step'

    if (flow === 'three-step') {
      return (
        <div className="om-stats">
          {renderMetricCard(data.pendingToPreparing, {
            key: 'p2p',
            label: Language.OrderAcceptance || 'Acceptance',
            icon: cilClock,
            barColor: '#d97706',
          })}
          {renderMetricCard(data.preparingToCompleted, {
            key: 'p2c',
            label: Language.OrderCompletion || 'Completion',
            icon: cilCheckCircle,
            barColor: '#198754',
          })}
        </div>
      )
    }

    if (flow === 'four-step') {
      return (
        <div className="om-stats em-stats-4">
          {renderMetricCard(data.pendingToPreparing, {
            key: 'p2p',
            label: Language.processingPendingToPreparing || 'Acceptance',
            icon: cilClock,
            barColor: '#d97706',
          })}
          {renderMetricCard(data.preparingToReady, {
            key: 'p2r',
            label: Language.processingPreparingToReady || 'Preparation',
            icon: cilFire,
            barColor: '#0891b2',
          })}
          {renderMetricCard(data.readyToDelivered, {
            key: 'r2d',
            label: Language.processingReadyToDelivered || 'Delivery',
            icon: cilArrowRight,
            barColor: '#0d6efd',
          })}
          {renderMetricCard(data.pendingToDelivered, {
            key: 'p2d',
            label: Language.processingPendingToDelivered || 'Full pipeline',
            icon: cilInbox,
            barColor: '#198754',
          })}
        </div>
      )
    }

    if (flow === 'delivery-only') {
      return (
        <div className="om-stats">
          {renderMetricCard(data.placedToDelivered, {
            key: 'pl2d',
            label: Language.processingPlacedToDelivered || 'Delivery',
            icon: cilArrowRight,
            barColor: '#0d6efd',
          })}
        </div>
      )
    }

    return (
      <div className="om-info">
        <CIcon icon={cilInfo} />
        <div>{Language.processingNoDataForFlow || 'No timing data for this flow.'}</div>
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
      ) : !data ? (
        <div className="om-empty">
          <CIcon icon={cilClock} size="xl" />
          <div className="om-empty-title">{Language.noDataYet || 'No analysis yet'}</div>
          <div className="om-empty-body">
            {Language.analyzeHint ||
              'Pick a range and tap Analyze to see how efficient the kitchen is.'}
          </div>
        </div>
      ) : (
        renderBody()
      )}
    </div>
  )
}

export default AverageProcessingTime
