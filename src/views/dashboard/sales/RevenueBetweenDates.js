import React, { useCallback, useEffect, useMemo, useState } from 'react'
import PropTypes from 'prop-types'
import { CCard, CCardBody } from '@coreui/react'
import { CChartLine, CChartPie } from '@coreui/react-chartjs'
import CIcon from '@coreui/icons-react'
import { cilCalendar, cilChart, cilWarning } from '@coreui/icons'
import axios from 'axios'
import { format } from 'date-fns'
import { GetToken } from '../../../helpers/GetToken'
import { BaseUrl } from '../../../helpers/BaseUrl'
import { useSelector } from 'react-redux'
import translations from '../../../app/Language'
import './sales.css'

const SLICE_COLORS = [
  '#0d6efd',
  '#198754',
  '#0dcaf0',
  '#ffc107',
  '#e83e8c',
  '#6f42c1',
  '#fd7e14',
  '#20c997',
]

const RevenueBetweenDates = ({ className }) => {
  const t = useSelector((state) => state.language)
  const Language = translations[t]
  const token = GetToken()

  const [loading, setLoading] = useState(true)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [revenueData, setRevenueData] = useState([])
  const [paymentMethods, setPaymentMethods] = useState({})
  const [errorMessage, setErrorMessage] = useState('')

  /* ---------- derived ---------- */
  const completeRevenueData = useMemo(() => {
    if (!Array.isArray(revenueData)) return []
    return revenueData.map((item) => {
      const year = item._id?.year || 0
      const month = item._id?.month || 1
      const day = item._id?.day || 1
      const date = new Date(year, month - 1, day)
      if (isNaN(date)) {
        return {
          shortLabel: '—',
          dateLabel: 'Invalid Date',
          dailyRevenue: 0,
        }
      }
      return {
        shortLabel: format(date, 'MMM d'),
        dateLabel: format(date, 'MMMM d, yyyy'),
        dailyRevenue: Number(item.dailyRevenue) || 0,
      }
    })
  }, [revenueData])

  const totalRevenue = useMemo(
    () => completeRevenueData.reduce((sum, d) => sum + d.dailyRevenue, 0),
    [completeRevenueData],
  )

  const methodEntries = Object.entries(paymentMethods || {})
  const isEmpty = !loading && totalRevenue === 0

  /* ---------- fetch ---------- */
  const fetchRevenueBetweenDates = useCallback(
    async (from, to) => {
      setLoading(true)
      setErrorMessage('')
      try {
        const response = await axios.post(
          `${BaseUrl}/dashboard/revenue-between-dates`,
          { startDate: from || undefined, endDate: to || undefined },
          { headers: { Authorization: `Bearer ${token}` } },
        )
        setRevenueData(response.data.dailyRevenue || [])
        setPaymentMethods(response.data.revenueByPaymentMethod || {})
      } catch (err) {
        setErrorMessage(Language.errorFetchingRange || "Couldn't load revenue for that range.")
      } finally {
        setLoading(false)
      }
    },
    [token, Language],
  )

  /* ---------- initial load: last 14 days ---------- */
  useEffect(() => {
    const today = new Date()
    const fourteenDaysAgo = new Date()
    fourteenDaysAgo.setDate(today.getDate() - 14)

    const from = format(fourteenDaysAgo, 'yyyy-MM-dd')
    const to = format(today, 'yyyy-MM-dd')
    setStartDate(from)
    setEndDate(to)
    fetchRevenueBetweenDates(from, to)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleDateChange = (e) => {
    const { name, value } = e.target
    if (name === 'endDate' && value && new Date(value) > new Date()) {
      setErrorMessage(Language.endDateAfterToday || "End date can't be greater than today.")
      return
    }
    setErrorMessage('')

    const nextStart = name === 'startDate' ? value : startDate
    const nextEnd = name === 'endDate' ? value : endDate
    if (name === 'startDate') setStartDate(value)
    else if (name === 'endDate') setEndDate(value)

    if (nextStart && nextEnd) {
      fetchRevenueBetweenDates(nextStart, nextEnd)
    }
  }

  /* ---------- render ---------- */
  return (
    <CCard className={`sales-card ${className || ''}`}>
      {/* ---- Header ---- */}
      <div className="sales-card-header">
        <div className="sales-card-header-left">
          <h5 className="sales-card-title">
            <CIcon icon={cilChart} />
            {Language.RevenueBetweenDates || 'Custom range'}
          </h5>
          <div className="sales-card-subtitle">
            {startDate && endDate
              ? `${startDate} → ${endDate}`
              : Language.pickRange || 'Pick a date range'}
          </div>
        </div>

        <div className="sales-card-header-right">
          <div className="sales-date-group">
            <div className="sales-date">
              <CIcon icon={cilCalendar} className="sales-date-icon" />
              <input
                type="date"
                name="startDate"
                value={startDate}
                onChange={handleDateChange}
                max={endDate || undefined}
              />
            </div>
            <span className="sales-date-sep">→</span>
            <div className="sales-date">
              <input
                type="date"
                name="endDate"
                value={endDate}
                onChange={handleDateChange}
                min={startDate || undefined}
                max={format(new Date(), 'yyyy-MM-dd')}
              />
            </div>
          </div>
        </div>
      </div>

      <CCardBody className="p-0">
        {loading ? (
          <div className="sales-skeleton">
            <div>
              <div className="sales-skeleton-line" style={{ width: '40%' }} />
              <div className="sales-skeleton-line" style={{ width: '30%' }} />
              <div style={{ height: 200, marginTop: 12 }}>
                <div className="sales-skeleton-line" style={{ height: 200 }} />
              </div>
            </div>
            <div>
              <div className="sales-skeleton-circle" />
            </div>
          </div>
        ) : errorMessage ? (
          <div className="sales-empty">
            <CIcon icon={cilWarning} size="xl" />
            <div className="sales-empty-title">
              {Language.errorMessage || 'Something went wrong'}
            </div>
            <div className="sales-empty-body">{errorMessage}</div>
          </div>
        ) : isEmpty ? (
          <div className="sales-empty">
            <CIcon icon={cilCalendar} size="xl" />
            <div className="sales-empty-title">
              {Language.noRevenueInRange || 'No revenue in this range'}
            </div>
            <div className="sales-empty-body">
              {Language.noRevenueInRangeHint || 'Try a different start or end date.'}
            </div>
          </div>
        ) : (
          <>
            {/* Total */}
            <div style={{ padding: '20px 20px 0 20px' }}>
              <div className="sales-big-number">
                {totalRevenue.toFixed(2)}
                <span className="unit">TND</span>
              </div>
            </div>

            {/* Line chart */}
            <div
              style={{
                padding: '16px 20px 0 20px',
                height: 240,
                position: 'relative',
              }}
            >
              <CChartLine
                data={{
                  labels: completeRevenueData.map((d) => d.shortLabel),
                  datasets: [
                    {
                      label: Language.DailyRevenue || 'Daily revenue',
                      backgroundColor: 'rgba(13, 110, 253, 0.1)',
                      borderColor: 'rgba(13, 110, 253, 0.9)',
                      borderWidth: 2,
                      tension: 0.35,
                      pointBackgroundColor: '#fff',
                      pointBorderColor: '#0d6efd',
                      pointBorderWidth: 2,
                      pointRadius: 3,
                      pointHoverRadius: 6,
                      data: completeRevenueData.map((d) => d.dailyRevenue),
                    },
                  ],
                }}
                options={{
                  maintainAspectRatio: false,
                  responsive: true,
                  plugins: {
                    legend: { display: false },
                    tooltip: {
                      callbacks: {
                        title: (items) => {
                          const idx = items[0].dataIndex
                          return completeRevenueData[idx]?.dateLabel || ''
                        },
                        label: (context) => `${context.parsed.y.toFixed(2)} TND`,
                      },
                    },
                  },
                  scales: {
                    x: {
                      grid: { display: false },
                      ticks: { autoSkip: true, maxTicksLimit: 10 },
                    },
                    y: {
                      beginAtZero: true,
                      grid: { color: 'rgba(0, 0, 0, 0.05)' },
                      ticks: { callback: (v) => `${v}` },
                    },
                  },
                }}
              />
            </div>

            {/* Pie + breakdown */}
            {methodEntries.length > 0 && (
              <div className="sales-split">
                <div className="sales-chart">
                  <CChartPie
                    data={{
                      labels: methodEntries.map(([m]) => m),
                      datasets: [
                        {
                          data: methodEntries.map(([, v]) => v),
                          backgroundColor: methodEntries.map(
                            (_, i) => SLICE_COLORS[i % SLICE_COLORS.length],
                          ),
                          borderWidth: 0,
                        },
                      ],
                    }}
                    options={{
                      maintainAspectRatio: false,
                      responsive: true,
                      plugins: {
                        legend: { display: false },
                        tooltip: {
                          callbacks: {
                            label: (ctx) => {
                              const value = ctx.raw || 0
                              const pct =
                                totalRevenue > 0 ? ((value / totalRevenue) * 100).toFixed(1) : '0.0'
                              return `${ctx.label}: ${value.toFixed(2)} TND (${pct}%)`
                            },
                          },
                        },
                      },
                      cutout: '68%',
                    }}
                  />
                </div>

                <div className="sales-breakdown">
                  {methodEntries.map(([method, amount], i) => {
                    const pct = totalRevenue > 0 ? (amount / totalRevenue) * 100 : 0
                    const color = SLICE_COLORS[i % SLICE_COLORS.length]
                    return (
                      <div className="sales-breakdown-row" key={method}>
                        <div className="sales-breakdown-top">
                          <span className="sales-breakdown-name">{method}</span>
                          <span className="sales-breakdown-value">
                            <span className="sales-breakdown-amount">
                              {Number(amount).toFixed(2)} TND
                            </span>
                            <span className="sales-breakdown-pct">{pct.toFixed(1)}%</span>
                          </span>
                        </div>
                        <div className="sales-bar-track">
                          <div
                            className="sales-bar-fill"
                            style={{ width: `${pct}%`, background: color }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </CCardBody>
    </CCard>
  )
}

RevenueBetweenDates.propTypes = {
  className: PropTypes.string,
}

export default RevenueBetweenDates
