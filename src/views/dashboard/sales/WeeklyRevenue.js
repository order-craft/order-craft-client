import React, { useEffect, useMemo, useState } from 'react'
import PropTypes from 'prop-types'
import { CCard, CCardBody, CButton, CSpinner } from '@coreui/react'
import { CChartPie } from '@coreui/react-chartjs'
import CIcon from '@coreui/icons-react'
import { cilChart, cilArrowTop, cilArrowBottom, cilCloudDownload, cilCalendar } from '@coreui/icons'
import axios from 'axios'
import { format, eachDayOfInterval, startOfWeek, endOfWeek } from 'date-fns'
import { GetToken } from '../../../helpers/GetToken'
import { BaseUrl } from '../../../helpers/BaseUrl'
import jsPDF from 'jspdf'
import 'jspdf-autotable'
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

const CurrentWeekRevenue = ({ className }) => {
  const token = GetToken()
  const [loading, setLoading] = useState(true)
  const [weeklyRevenue, setWeeklyRevenue] = useState([])
  const [growthRate, setGrowthRate] = useState(0)
  const [revenueByMethod, setRevenueByMethod] = useState({})

  const t = useSelector((state) => state.language)
  const Language = translations[t]

  const today = new Date()
  const weekStart = startOfWeek(today)
  const weekEnd = endOfWeek(today)
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd })

  const completeWeeklyData = useMemo(() => {
    return weekDays.map((date) => {
      const day = date.getDate()
      const revenueForDay = weeklyRevenue.find((item) => item._id.day === day)?.dailyRevenue || 0
      return {
        dayName: format(date, 'EEEE'),
        shortDayName: format(date, 'EEE'),
        date: format(date, 'MMMM dd, yyyy'),
        dailyRevenue: revenueForDay,
      }
    })
  }, [weekDays, weeklyRevenue])

  const totalWeekRevenue = useMemo(
    () => completeWeeklyData.reduce((sum, d) => sum + d.dailyRevenue, 0),
    [completeWeeklyData],
  )

  const maxDailyRevenue = useMemo(
    () => completeWeeklyData.reduce((max, d) => Math.max(max, d.dailyRevenue), 0),
    [completeWeeklyData],
  )

  const methodEntries = Object.entries(revenueByMethod || {})
  const isEmpty = !loading && totalWeekRevenue === 0

  /* ---------- fetch ---------- */
  useEffect(() => {
    const getCurrentWeekRevenue = async () => {
      setLoading(true)
      try {
        const response = await axios.get(`${BaseUrl}/dashboard/weekly-revenue`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        const { dailyRevenue, growthRate, revenueByPaymentMethod } = response.data
        setWeeklyRevenue(dailyRevenue || [])
        setGrowthRate(Number(growthRate) || 0)
        setRevenueByMethod(revenueByPaymentMethod || {})
      } catch (err) {
        console.error('Error fetching current week revenue', err)
      } finally {
        setLoading(false)
      }
    }
    getCurrentWeekRevenue()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* ---------- PDF ---------- */
  const exportToPDF = () => {
    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.width

    doc.setFontSize(18)
    doc.setFont('helvetica', 'bold')
    doc.text('Current Week Revenue', 14, 18)

    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(120)
    doc.text(`${format(weekStart, 'MMM dd')} → ${format(weekEnd, 'MMM dd, yyyy')}`, 14, 25)
    doc.text(`Generated on: ${format(new Date(), 'yyyy-MM-dd HH:mm')}`, 14, 31)

    doc.setTextColor(0)
    doc.setFontSize(11)
    doc.text(`Total: ${totalWeekRevenue.toFixed(2)} TND`, pageWidth - 15, 18, { align: 'right' })

    doc.autoTable({
      head: [['Day', 'Date', 'Revenue (TND)']],
      body: completeWeeklyData.map((item) => [
        item.dayName,
        item.date,
        item.dailyRevenue.toFixed(2),
      ]),
      startY: 40,
      headStyles: {
        fillColor: [41, 128, 185],
        textColor: 255,
        fontStyle: 'bold',
        fontSize: 10,
      },
      bodyStyles: { fontSize: 9 },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      margin: { top: 40, left: 14, right: 14 },
    })

    doc.save(`week-revenue-${format(new Date(), 'yyyy-MM-dd')}.pdf`)
  }

  /* ---------- render ---------- */
  const growthPositive = growthRate >= 0

  return (
    <CCard className={`sales-card ${className || ''}`}>
      {/* ---- Header ---- */}
      <div className="sales-card-header">
        <div className="sales-card-header-left">
          <h5 className="sales-card-title">
            <CIcon icon={cilChart} />
            {Language.CurrentWeekRevenue || 'This week'}
          </h5>
          <div className="sales-card-subtitle">
            {format(weekStart, 'MMM dd')} → {format(weekEnd, 'MMM dd, yyyy')}
          </div>
        </div>

        <div className="sales-card-header-right">
          <CButton
            color="secondary"
            variant="outline"
            onClick={exportToPDF}
            disabled={totalWeekRevenue === 0}
          >
            <CIcon icon={cilCloudDownload} className="me-2" />
            {Language.ExporttoPDF || 'Export PDF'}
          </CButton>
        </div>
      </div>

      <CCardBody className="p-0">
        {loading ? (
          <div className="sales-skeleton">
            <div>
              <div className="sales-skeleton-line" style={{ width: '70%' }} />
              <div className="sales-skeleton-line" style={{ width: '50%' }} />
              <div className="sales-skeleton-line" style={{ width: '85%' }} />
              <div className="sales-skeleton-line" style={{ width: '60%' }} />
            </div>
            <div>
              <div className="sales-skeleton-circle" />
            </div>
          </div>
        ) : isEmpty ? (
          <div className="sales-empty">
            <CIcon icon={cilCalendar} size="xl" />
            <div className="sales-empty-title">
              {Language.noRevenueThisWeek || 'No revenue this week yet'}
            </div>
            <div className="sales-empty-body">
              {Language.noRevenueThisWeekHint ||
                'Paid orders will appear here as the week goes on.'}
            </div>
          </div>
        ) : (
          <>
            {/* Total + growth */}
            <div style={{ padding: '20px 20px 0 20px' }}>
              <div className="sales-big-number">
                {totalWeekRevenue.toFixed(2)}
                <span className="unit">TND</span>
              </div>
              <div style={{ marginTop: 8 }}>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '3px 10px',
                    borderRadius: 999,
                    background: growthPositive ? '#d1e7dd' : '#f8d7da',
                    color: growthPositive ? '#0f5132' : '#842029',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                  }}
                >
                  <CIcon icon={growthPositive ? cilArrowTop : cilArrowBottom} />
                  {Math.abs(growthRate).toFixed(1)}%
                  <span style={{ fontWeight: 500, opacity: 0.8 }}>vs last week</span>
                </span>
              </div>
            </div>

            {/* Split: daily rows + payment pie */}
            <div className="sales-split">
              {/* Daily rows */}
              <div className="sales-breakdown">
                {completeWeeklyData.map((day) => {
                  const pct = maxDailyRevenue > 0 ? (day.dailyRevenue / maxDailyRevenue) * 100 : 0
                  const isToday =
                    format(new Date(), 'yyyy-MM-dd') === format(new Date(day.date), 'yyyy-MM-dd')
                  return (
                    <div className="sales-breakdown-row" key={day.date}>
                      <div className="sales-breakdown-top">
                        <span className="sales-breakdown-name">
                          {isToday ? (
                            <strong style={{ color: 'var(--cui-primary, #b5502b)' }}>
                              {day.shortDayName}
                            </strong>
                          ) : (
                            day.shortDayName
                          )}
                        </span>
                        <span className="sales-breakdown-value">
                          <span className="sales-breakdown-amount">
                            {day.dailyRevenue.toFixed(2)} TND
                          </span>
                        </span>
                      </div>
                      <div className="sales-bar-track">
                        <div
                          className="sales-bar-fill"
                          style={{
                            width: `${pct}%`,
                            background: isToday ? 'var(--cui-primary, #b5502b)' : '#d8a98a',
                          }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Payment pie */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
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
                                totalWeekRevenue > 0
                                  ? ((value / totalWeekRevenue) * 100).toFixed(1)
                                  : '0.0'
                              return `${ctx.label}: ${value.toFixed(2)} TND (${pct}%)`
                            },
                          },
                        },
                      },
                      cutout: '68%',
                    }}
                  />
                </div>

                {methodEntries.length > 0 && (
                  <div className="sales-breakdown">
                    {methodEntries.map(([method, amount], i) => {
                      const pct = totalWeekRevenue > 0 ? (amount / totalWeekRevenue) * 100 : 0
                      const color = SLICE_COLORS[i % SLICE_COLORS.length]
                      return (
                        <div className="sales-breakdown-row" key={method}>
                          <div className="sales-breakdown-top">
                            <span className="sales-breakdown-name">{method}</span>
                            <span className="sales-breakdown-value">
                              <span className="sales-breakdown-amount">
                                {amount.toFixed(2)} TND
                              </span>
                              <span className="sales-breakdown-pct">{pct.toFixed(1)}%</span>
                            </span>
                          </div>
                          <div className="sales-bar-track">
                            <div
                              className="sales-bar-fill"
                              style={{
                                width: `${pct}%`,
                                background: color,
                              }}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </CCardBody>
    </CCard>
  )
}

CurrentWeekRevenue.propTypes = {
  className: PropTypes.string,
}

export default CurrentWeekRevenue
