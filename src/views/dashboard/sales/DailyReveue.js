import React, { useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import { CCard, CCardBody, CSpinner } from '@coreui/react'
import { CChartPie } from '@coreui/react-chartjs'
import CIcon from '@coreui/icons-react'
import { cilChartPie, cilCash, cilCreditCard, cilWallet, cilMoney } from '@coreui/icons'
import axios from 'axios'
import { BaseUrl } from '../../../helpers/BaseUrl'
import { GetToken } from '../../../helpers/GetToken'
import { useSelector } from 'react-redux'
import translations from '../../../app/Language'
import './sales.css'

const paymentMethodIcons = {
  Cash: cilCash,
  'Credit Card': cilCreditCard,
  'Mobile Payment': cilWallet,
  'Bank Transfer': cilMoney,
}

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

const DailyRevenue = ({ className }) => {
  const token = GetToken()
  const [loading, setLoading] = useState(true)
  const [dailyRevenue, setDailyRevenue] = useState(0)
  const [revenueByMethod, setRevenueByMethod] = useState({})
  const [dateLabel, setDateLabel] = useState('')

  const t = useSelector((state) => state.language)
  const Language = translations[t]

  useEffect(() => {
    const getDailyRevenue = async () => {
      setLoading(true)
      try {
        const response = await axios.get(`${BaseUrl}/dashboard/daily-revenue`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        setDailyRevenue(response.data.totalRevenue || 0)
        setRevenueByMethod(response.data.revenueByPaymentMethod || {})
        setDateLabel(
          new Date().toLocaleDateString(undefined, {
            weekday: 'long',
            month: 'short',
            day: 'numeric',
          }),
        )
      } catch (err) {
        console.error('Error fetching daily revenue:', err)
      } finally {
        setLoading(false)
      }
    }
    getDailyRevenue()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const entries = Object.entries(revenueByMethod)
  const total = dailyRevenue || 0
  const isEmpty = !loading && (entries.length === 0 || total === 0)

  return (
    <CCard className={`sales-card ${className || ''}`}>
      {/* ---- Header ---- */}
      <div className="sales-card-header">
        <div className="sales-card-header-left">
          <h5 className="sales-card-title">
            <CIcon icon={cilChartPie} />
            {Language.DailyRevenue || "Today's revenue"}
          </h5>
          <div className="sales-card-subtitle">
            {dateLabel ||
              new Date().toLocaleDateString(undefined, {
                weekday: 'long',
                month: 'short',
                day: 'numeric',
              })}
          </div>
        </div>
      </div>

      <CCardBody className="p-0">
        {loading ? (
          <div className="sales-skeleton">
            <div>
              <div className="sales-skeleton-circle" />
            </div>
            <div>
              <div className="sales-skeleton-line" style={{ width: '80%' }} />
              <div className="sales-skeleton-line" style={{ width: '60%' }} />
              <div className="sales-skeleton-line" style={{ width: '70%' }} />
              <div className="sales-skeleton-line" style={{ width: '50%' }} />
            </div>
          </div>
        ) : isEmpty ? (
          <div className="sales-empty">
            <CIcon icon={cilChartPie} size="xl" />
            <div className="sales-empty-title">
              {Language.noRevenueYet || 'No revenue yet today'}
            </div>
            <div className="sales-empty-body">
              {Language.noRevenueYetHint || 'Paid orders will appear here as the day goes on.'}
            </div>
          </div>
        ) : (
          <>
            {/* Total */}
            <div
              style={{
                padding: '20px 20px 0 20px',
              }}
            >
              <div className="sales-big-number">
                {total.toFixed(2)}
                <span className="unit">TND</span>
              </div>
            </div>

            {/* Pie + breakdown */}
            <div className="sales-split">
              <div className="sales-chart">
                <CChartPie
                  data={{
                    labels: entries.map(([method]) => method),
                    datasets: [
                      {
                        data: entries.map(([, amount]) => amount),
                        backgroundColor: entries.map(
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
                          label: (context) => {
                            const value = context.raw || 0
                            const pct = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0'
                            return `${context.label}: ${value.toFixed(2)} TND (${pct}%)`
                          },
                        },
                      },
                    },
                    cutout: '68%',
                  }}
                />
              </div>

              <div className="sales-breakdown">
                {entries.map(([method, amount], i) => {
                  const pct = total > 0 ? (amount / total) * 100 : 0
                  const color = SLICE_COLORS[i % SLICE_COLORS.length]
                  return (
                    <div className="sales-breakdown-row" key={method}>
                      <div className="sales-breakdown-top">
                        <span className="sales-breakdown-name">
                          <CIcon icon={paymentMethodIcons[method] || cilCash} />
                          {method}
                        </span>
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

DailyRevenue.propTypes = {
  className: PropTypes.string,
}

export default DailyRevenue
