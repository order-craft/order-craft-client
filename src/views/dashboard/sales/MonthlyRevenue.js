import React, { useEffect, useMemo, useState } from 'react'
import PropTypes from 'prop-types'
import { CCard, CCardBody, CButton } from '@coreui/react'
import { CChartLine, CChartPie } from '@coreui/react-chartjs'
import CIcon from '@coreui/icons-react'
import { cilChart, cilArrowTop, cilArrowBottom, cilCloudDownload, cilCalendar } from '@coreui/icons'
import axios from 'axios'
import { format } from 'date-fns'
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

const CurrentMonthRevenue = ({ className }) => {
  const t = useSelector((state) => state.language)
  const Language = translations[t]
  const token = GetToken()

  const [loading, setLoading] = useState(true)
  const [monthlyRevenue, setMonthlyRevenue] = useState([])
  const [revenueByPaymentMethod, setRevenueByPaymentMethod] = useState({})
  const [totalRevenue, setTotalRevenue] = useState(0)
  const [previousMonthRevenue, setPreviousMonthRevenue] = useState(0)
  const [growth, setGrowth] = useState(0)

  const today = new Date()

  /* ---------- derived ---------- */
  const completeMonthlyData = useMemo(() => {
    return Array.from({ length: today.getDate() }, (_, index) => {
      const day = index + 1
      const revenueForDay = monthlyRevenue.find((item) => item._id.day === day)?.dailyRevenue || 0
      const date = new Date(today.getFullYear(), today.getMonth(), day)
      return {
        day,
        dateLabel: format(date, 'MMM d'),
        date: format(date, 'MMMM dd, yyyy'),
        dailyRevenue: revenueForDay,
      }
    })
  }, [monthlyRevenue, today])

  const methodEntries = Object.entries(revenueByPaymentMethod || {})
  const isEmpty = !loading && totalRevenue === 0

  /* ---------- fetch ---------- */
  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const [revenueRes, growthRes] = await Promise.all([
          axios.get(`${BaseUrl}/dashboard/monthly-revenue`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get(`${BaseUrl}/dashboard/monthly-revenue-growth`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ])

        setMonthlyRevenue(revenueRes.data.dailyRevenue || [])
        setRevenueByPaymentMethod(revenueRes.data.revenueByPaymentMethod || {})
        setTotalRevenue(revenueRes.data.totalRevenue || 0)
        setGrowth(Number(growthRes.data.growthRate) || 0)
        setPreviousMonthRevenue(Number(growthRes.data.previousMonthRevenue) || 0)
      } catch (err) {
        console.error('Error fetching current month revenue', err)
      } finally {
        setLoading(false)
      }
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* ---------- PDF ---------- */
  const exportToPDF = () => {
    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.width

    doc.setFontSize(18)
    doc.setFont('helvetica', 'bold')
    doc.text(Language.monthlyRevenueReport || 'Monthly Revenue Report', 14, 18)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(120)
    doc.text(format(new Date(), 'MMMM yyyy'), 14, 25)
    doc.text(
      `${Language.Generatedon || 'Generated on'}: ${format(new Date(), 'yyyy-MM-dd HH:mm')}`,
      14,
      31,
    )
    doc.setTextColor(0)
    doc.setFontSize(11)
    doc.text(`${Language.total || 'Total'}: ${totalRevenue.toFixed(2)} TND`, pageWidth - 15, 18, {
      align: 'right',
    })
    doc.autoTable({
      head: [
        [Language.Day || 'Day', Language.date || 'Date', `${Language.revenue || 'Revenue'} (TND)`],
      ],
      body: completeMonthlyData.map((item) => [item.day, item.date, item.dailyRevenue.toFixed(2)]),
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

    doc.save(`monthly-revenue-${format(new Date(), 'yyyy-MM')}.pdf`)
  }

  /* ---------- render ---------- */
  const growthPositive = growth >= 0
  const rangeLabel = format(new Date(), 'MMMM yyyy')

  return (
    <CCard className={`sales-card ${className || ''}`}>
      {/* ---- Header ---- */}
      <div className="sales-card-header">
        <div className="sales-card-header-left">
          <h5 className="sales-card-title">
            <CIcon icon={cilChart} />
            {Language.CurrentMonthRevenue || 'This month'}
          </h5>
          <div className="sales-card-subtitle">{rangeLabel}</div>
        </div>

        <div className="sales-card-header-right">
          <CButton
            color="secondary"
            variant="outline"
            onClick={exportToPDF}
            disabled={totalRevenue === 0}
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
              <div className="sales-skeleton-line" style={{ width: '40%' }} />
              <div className="sales-skeleton-line" style={{ width: '30%' }} />
              <div style={{ height: 220, marginTop: 12 }}>
                <div className="sales-skeleton-line" style={{ height: 220 }} />
              </div>
            </div>
            <div>
              <div className="sales-skeleton-circle" />
            </div>
          </div>
        ) : isEmpty ? (
          <div className="sales-empty">
            <CIcon icon={cilCalendar} size="xl" />
            <div className="sales-empty-title">
              {Language.noRevenueThisMonth || 'No revenue this month yet'}
            </div>
            <div className="sales-empty-body">
              {Language.noRevenueThisMonthHint ||
                'Paid orders will appear here as the month goes on.'}
            </div>
          </div>
        ) : (
          <>
            {/* Total + growth */}
            <div style={{ padding: '20px 20px 0 20px' }}>
              <div className="sales-big-number">
                {totalRevenue.toFixed(2)}
                <span className="unit">TND</span>
              </div>
              <div
                style={{
                  marginTop: 8,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  flexWrap: 'wrap',
                }}
              >
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
                  {Math.abs(growth).toFixed(1)}%
                  <span style={{ fontWeight: 500, opacity: 0.8 }}>
                    {' '}
                    {Language.vsLastMonth || 'vs last month'}
                  </span>
                </span>
                <span
                  style={{
                    fontSize: '0.8rem',
                    color: '#6c757d',
                  }}
                >
                  {Language.previousMonth || 'Last month'}: {previousMonthRevenue.toFixed(2)} TND
                </span>
              </div>
            </div>

            {/* Line chart */}
            <div
              style={{
                padding: '16px 20px 0 20px',
                height: 260,
                position: 'relative',
              }}
            >
              <CChartLine
                data={{
                  labels: completeMonthlyData.map((item) => item.day),
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
                      pointRadius: 2,
                      pointHoverRadius: 5,
                      data: completeMonthlyData.map((item) => item.dailyRevenue),
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
                          return completeMonthlyData[idx]?.dateLabel || ''
                        },
                        label: (context) => `${context.parsed.y.toFixed(2)} TND`,
                      },
                    },
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      grid: { color: 'rgba(0, 0, 0, 0.05)' },
                      ticks: { callback: (v) => `${v}` },
                    },
                    x: {
                      grid: { display: false },
                      ticks: {
                        autoSkip: true,
                        maxTicksLimit: 10,
                      },
                    },
                  },
                }}
              />
            </div>

            {/* Pie + breakdown */}
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
                          <span className="sales-breakdown-amount">{amount.toFixed(2)} TND</span>
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
          </>
        )}
      </CCardBody>
    </CCard>
  )
}

CurrentMonthRevenue.propTypes = {
  className: PropTypes.string,
}

export default CurrentMonthRevenue
