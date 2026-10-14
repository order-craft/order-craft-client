import React, { useEffect, useMemo, useState } from 'react'
import PropTypes from 'prop-types'
import { CCard, CCardBody, CButton } from '@coreui/react'
import { CChartLine } from '@coreui/react-chartjs'
import CIcon from '@coreui/icons-react'
import { cilChart, cilCloudDownload, cilCalendar } from '@coreui/icons'
import axios from 'axios'
import jsPDF from 'jspdf'
import 'jspdf-autotable'
import { BaseUrl } from '../../../helpers/BaseUrl'
import { GetToken } from '../../../helpers/GetToken'
import { useSelector } from 'react-redux'
import translations from '../../../app/Language'
import './sales.css'

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

const YearlyRevenue = ({ className }) => {
  const t = useSelector((state) => state.language)
  const Language = translations[t]
  const token = GetToken()

  const [loading, setLoading] = useState(true)
  const [yearlyRevenue, setYearlyRevenue] = useState([])

  const currentYear = new Date().getFullYear()

  /* ---------- derived ---------- */
  const rows = useMemo(() => {
    return yearlyRevenue.map((item, index) => ({
      index,
      month: MONTHS[index] || item.month || '',
      shortMonth: (MONTHS[index] || '').substring(0, 3),
      revenue: Number(item.revenue) || 0,
    }))
  }, [yearlyRevenue])

  const totalRevenue = useMemo(() => rows.reduce((sum, r) => sum + r.revenue, 0), [rows])

  const bestMonth = useMemo(() => {
    if (rows.length === 0) return null
    return rows.reduce((best, r) => (r.revenue > best.revenue ? r : best), rows[0])
  }, [rows])

  const isEmpty = !loading && totalRevenue === 0

  /* ---------- fetch ---------- */
  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const response = await axios.get(`${BaseUrl}/dashboard/revenue-year`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        setYearlyRevenue(response.data || [])
      } catch (err) {
        console.error('Error fetching yearly revenue:', err)
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
    doc.text('Yearly Revenue Report', 14, 18)

    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(120)
    doc.text(String(currentYear), 14, 25)
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 31)

    doc.setTextColor(0)
    doc.setFontSize(11)
    doc.text(`Total: ${totalRevenue.toFixed(2)} TND`, pageWidth - 15, 18, { align: 'right' })

    doc.autoTable({
      head: [['Month', 'Revenue (TND)']],
      body: rows.map((r) => [r.month, r.revenue.toFixed(2)]),
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

    doc.save(`yearly-revenue-${currentYear}.pdf`)
  }

  /* ---------- render ---------- */
  return (
    <CCard className={`sales-card ${className || ''}`}>
      {/* ---- Header ---- */}
      <div className="sales-card-header">
        <div className="sales-card-header-left">
          <h5 className="sales-card-title">
            <CIcon icon={cilChart} />
            {Language.YearlyRevenue || 'This year'}
          </h5>
          <div className="sales-card-subtitle">{currentYear}</div>
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
              <div className="sales-skeleton-line" style={{ width: '70%' }} />
              <div className="sales-skeleton-line" style={{ width: '50%' }} />
              <div className="sales-skeleton-line" style={{ width: '85%' }} />
              <div className="sales-skeleton-line" style={{ width: '60%' }} />
            </div>
          </div>
        ) : isEmpty ? (
          <div className="sales-empty">
            <CIcon icon={cilCalendar} size="xl" />
            <div className="sales-empty-title">
              {Language.noRevenueThisYear || 'No revenue this year yet'}
            </div>
            <div className="sales-empty-body">
              {Language.noRevenueThisYearHint ||
                'Paid orders will appear here as the year goes on.'}
            </div>
          </div>
        ) : (
          <>
            {/* Total + best month */}
            <div style={{ padding: '20px 20px 0 20px' }}>
              <div className="sales-big-number">
                {totalRevenue.toFixed(2)}
                <span className="unit">TND</span>
              </div>
              {bestMonth && (
                <div
                  style={{
                    marginTop: 8,
                    fontSize: '0.8rem',
                    color: '#6c757d',
                  }}
                >
                  {Language.bestMonth || 'Best month'}:{' '}
                  <strong style={{ color: '#198754' }}>{bestMonth.month}</strong> ·{' '}
                  {bestMonth.revenue.toFixed(2)} TND
                </div>
              )}
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
                  labels: rows.map((r) => r.shortMonth),
                  datasets: [
                    {
                      label: 'Monthly revenue',
                      backgroundColor: 'rgba(13, 110, 253, 0.1)',
                      borderColor: 'rgba(13, 110, 253, 0.9)',
                      borderWidth: 2,
                      tension: 0.35,
                      pointBackgroundColor: '#fff',
                      pointBorderColor: '#0d6efd',
                      pointBorderWidth: 2,
                      pointRadius: 4,
                      pointHoverRadius: 6,
                      data: rows.map((r) => r.revenue),
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
                          return rows[idx]?.month || ''
                        },
                        label: (context) => `${context.parsed.y.toFixed(2)} TND`,
                      },
                    },
                  },
                  scales: {
                    x: { grid: { display: false } },
                    y: {
                      beginAtZero: true,
                      grid: { color: 'rgba(0, 0, 0, 0.05)' },
                      ticks: { callback: (v) => `${v}` },
                    },
                  },
                }}
              />
            </div>

            {/* Breakdown */}
            <div className="sales-split" style={{ gridTemplateColumns: '1fr' }}>
              <div className="sales-breakdown">
                {rows.map((r, i) => {
                  const pct = totalRevenue > 0 ? (r.revenue / totalRevenue) * 100 : 0
                  const color = SLICE_COLORS[i % SLICE_COLORS.length]
                  const isBest = bestMonth && r.index === bestMonth.index
                  return (
                    <div className="sales-breakdown-row" key={r.index}>
                      <div className="sales-breakdown-top">
                        <span className="sales-breakdown-name">
                          {isBest ? (
                            <strong style={{ color: '#198754' }}>{r.month}</strong>
                          ) : (
                            r.month
                          )}
                        </span>
                        <span className="sales-breakdown-value">
                          <span className="sales-breakdown-amount">{r.revenue.toFixed(2)} TND</span>
                          <span className="sales-breakdown-pct">{pct.toFixed(1)}%</span>
                        </span>
                      </div>
                      <div className="sales-bar-track">
                        <div
                          className="sales-bar-fill"
                          style={{
                            width: `${pct}%`,
                            background: isBest ? '#198754' : color,
                          }}
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

YearlyRevenue.propTypes = {
  className: PropTypes.string,
}

export default YearlyRevenue
