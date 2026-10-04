import React, { useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import { CRow, CCol, CSpinner, CCard, CCardHeader, CCardBody, CProgress } from '@coreui/react'
import { CChartPie } from '@coreui/react-chartjs'
import CIcon from '@coreui/icons-react'
import { cilCash, cilCreditCard, cilWallet, cilMoney, cilChartPie } from '@coreui/icons'

import axios from 'axios'
import { BaseUrl } from '../../../helpers/BaseUrl'
import { GetToken } from '../../../helpers/GetToken'
import { useSelector } from 'react-redux'
import translations from '../../../app/Language'

const paymentMethodIcons = {
  Cash: cilCash,
  'Credit Card': cilCreditCard,
  'Mobile Payment': cilWallet,
  'Bank Transfer': cilMoney,
}

const DailyRevenue = () => {
  const token = GetToken()
  const [loading, setLoading] = useState(false)
  const [dailyRevenue, setDailyRevenue] = useState(0)
  const [revenueByMethod, setRevenueByMethod] = useState({})
  const t = useSelector((state) => state.language)
  const Language = translations[t]

  const getDailyRevenue = async () => {
    setLoading(true)
    try {
      const response = await axios.get(`${BaseUrl}/dashboard/daily-revenue`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      setDailyRevenue(response.data.totalRevenue || 0)
      setRevenueByMethod(response.data.revenueByPaymentMethod || {})
    } catch (err) {
      console.error('Error fetching daily revenue:', err)
    }
    setLoading(false)
  }

  useEffect(() => {
    getDailyRevenue()
  }, [])

  const pieLabels = Object.keys(revenueByMethod)
  const pieData = Object.values(revenueByMethod)
  const totalRevenue = dailyRevenue || 1 // Avoid division by zero

  // Helper function to determine progress bar color
  const getProgressColor = (value) => {
    if (value > 75) return 'success'
    if (value > 50) return 'info'
    if (value > 25) return 'warning'
    return 'danger'
  }

  return (
    <div style={{ minWidth: '100%' }}>
      <CRow className="justify-content-center" style={{ minWidth: '100%' }}>
        <CCol xs={12} lg={12} style={{ minWidth: '100%' }}>
          <CCard className="dashboard-card" style={{ minWidth: '100%' }}>
            <CCardHeader className="dashboard-card-header" style={{ minWidth: '100%' }}>
              <div className="d-flex justify-content-between align-items-center">
                <h3 className="dashboard-title" style={{ color: 'white' }}>
                  <CIcon icon={cilChartPie} className="me-2" style={{ color: 'white' }} />
                  {Language.DailyRevenue}
                </h3>
                <span className="badge bg-primary">{new Date().toLocaleDateString()}</span>
              </div>
            </CCardHeader>
            <CCardBody className="dashboard-card-body" style={{ minWidth: '100%' }}>
              {loading ? (
                <div className="text-center py-5">
                  <CSpinner color="primary" style={{ width: '3rem', height: '3rem' }} />
                  <p className="mt-3">{Language.Loading}...</p>
                </div>
              ) : (
                <>
                  <CRow className="mb-4" style={{ minWidth: '100%' }}>
                    <CCol xs={12} className="mb-4" style={{ minWidth: '100%' }}>
                      <div className="total-revenue-card">
                        <h4 className="text-muted">{Language.TodaysRevenue}</h4>
                        <h1 className="display-4 fw-bold text-primary">
                          {dailyRevenue?.toFixed(2)} TND
                        </h1>
                      </div>
                    </CCol>

                    {Object.entries(revenueByMethod).map(([method, amount], index) => {
                      const percentage = (amount / totalRevenue) * 100
                      return (
                        <CCol key={method} xs={12} sm={6} lg={3} className="mb-4">
                          <div className="payment-method-card">
                            <div className="method-icon">
                              <CIcon icon={paymentMethodIcons[method] || cilCash} size="xl" />
                            </div>
                            <div className="method-info">
                              <h5 className="method-name">{method}</h5>
                              <h3 className="method-amount">{amount.toFixed(2)} TND</h3>
                              <div className="method-percentage">
                                <span className="text-muted">{percentage.toFixed(1)}%</span>
                              </div>
                              <CProgress
                                color={
                                  ['success', 'primary', 'warning', 'info', 'secondary', 'danger'][
                                    index
                                  ]
                                }
                                value={percentage}
                                className="mt-2"
                                height={8}
                              />
                            </div>
                          </div>
                        </CCol>
                      )
                    })}
                  </CRow>

                  {pieLabels.length > 0 && (
                    <CRow className="mt-4" style={{ minWidth: '100%' }}>
                      <CCol xs={12} className="text-center">
                        <h4 className="section-title mb-4">{Language.RevenueDistribution}</h4>
                      </CCol>
                      <CCol xs={12} md={6} className="mb-4">
                        <div className="chart-container">
                          <CChartPie
                            data={{
                              labels: pieLabels,
                              datasets: [
                                {
                                  data: pieData,
                                  backgroundColor: [
                                    '#4e73df',
                                    '#1cc88a',
                                    '#36b9cc',
                                    '#f6c23e',
                                    '#e74a3b',
                                    '#858796',
                                  ],
                                  hoverBackgroundColor: [
                                    '#2e59d9',
                                    '#17a673',
                                    '#2c9faf',
                                    '#dda20a',
                                    '#be2617',
                                    '#6c757d',
                                  ],
                                  hoverBorderColor: 'rgba(234, 236, 244, 1)',
                                },
                              ],
                            }}
                            options={{
                              maintainAspectRatio: false,
                              responsive: true,
                              plugins: {
                                legend: {
                                  position: 'right',
                                  labels: {
                                    font: {
                                      size: 14,
                                      family: "'Nunito', sans-serif",
                                    },
                                    padding: 20,
                                    usePointStyle: true,
                                  },
                                },
                                tooltip: {
                                  backgroundColor: 'rgb(255,255,255)',
                                  bodyFontColor: '#858796',
                                  borderColor: '#dddfeb',
                                  borderWidth: 1,
                                  xPadding: 15,
                                  yPadding: 15,
                                  displayColors: false,
                                  caretPadding: 10,
                                  callbacks: {
                                    label: function (context) {
                                      const label = context.label || ''
                                      const value = context.raw || 0
                                      const percentage = ((value / totalRevenue) * 100).toFixed(1)
                                      return `${label}: ${value.toFixed(2)} TND (${percentage}%)`
                                    },
                                  },
                                },
                              },
                              cutout: '70%',
                            }}
                          />
                        </div>
                      </CCol>
                      <CCol xs={12} md={6} className="mb-4 d-flex align-items-center">
                        <div className="method-breakdown" style={{ minWidth: '100%' }}>
                          <h5 className="mb-3">{Language.PaymentMethodBreakdown}</h5>
                          <ul className="list-unstyled">
                            {pieLabels.map((label, index) => {
                              const percentage = (pieData[index] / totalRevenue) * 100
                              return (
                                <li key={label} className="mb-3">
                                  <div className="d-flex justify-content-between align-items-center mb-1">
                                    <span className="d-flex align-items-center">
                                      <CIcon
                                        icon={paymentMethodIcons[label] || cilCash}
                                        className="me-2"
                                        style={{ width: '16px', height: '16px' }}
                                      />
                                      <span className="text-truncate" style={{ maxWidth: '120px' }}>
                                        {label}
                                      </span>
                                    </span>
                                    <span className="fw-medium">{percentage.toFixed(1)}%</span>
                                  </div>
                                  <CProgress
                                    color={getProgressColor(percentage)}
                                    value={percentage}
                                    className="mt-1"
                                    height={8}
                                    animated
                                  />
                                </li>
                              )
                            })}
                          </ul>
                        </div>
                      </CCol>
                    </CRow>
                  )}
                </>
              )}
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>

      <style>{`
        .dashboard-card {
          border-radius: 15px;
          box-shadow: 0 0.15rem 1.75rem 0 rgba(58, 59, 69, 0.15);
          border: none;
          overflow: hidden;
          margin-bottom: 20px;
          min-width: 100%;
        }

        .dashboard-card-header {
          background: linear-gradient(135deg, #4e73df 0%, #224abe 100%);
          color: white;
          border-bottom: none;
          padding: 1.5rem;
          min-width: 100%;
        }

        .dashboard-title {
          margin: 0;
          font-weight: 600;
          color: white;
        }

        .total-revenue-card {
          background: white;
          border-radius: 10px;
          padding: 1rem;
          text-align: center;
          box-shadow: 0 0.125rem 0.25rem rgba(0, 0, 0, 0.075);
          border: 1px solid #e3e6f0;
          min-width: 100%;
        }

        .payment-method-card {
          background: white;
          border-radius: 10px;
          padding: 1.5rem;
          display: flex;
          align-items: center;
          box-shadow: 0 0.125rem 0.25rem rgba(0, 0, 0, 0.075);
          border: 1px solid #e3e6f0;
          height: 100%;
          min-width: 100%;
        }

        .method-icon {
          background: #f8f9fc;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-right: 1rem;
          color: #4e73df;
        }

        .method-info {
          flex: 1;
          min-width: 0;
        }

        .method-name {
          color: #5a5c69;
          font-size: 0.9rem;
          margin-bottom: 0.5rem;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .method-amount {
          color: #2e59d9;
          font-weight: 100;
          margin-bottom: 0.25rem;
        }

        .chart-container {
          height: 300px;
          position: relative;
          min-width: 100%;
        }

        .section-title {
          color: #4e73df;
          font-weight: 600;
          position: relative;
          display: inline-block;
        }

        .section-title:after {
          content: '';
          position: absolute;
          width: 50%;
          height: 3px;
          background: linear-gradient(to right, #4e73df, transparent);
          bottom: -5px;
          left: 0;
        }

        .method-breakdown {
          background: white;
          border-radius: 10px;
          padding: 1.5rem;
          box-shadow: 0 0.125rem 0.25rem rgba(0, 0, 0, 0.075);
          border: 1px solid #e3e6f0;
          min-width: 100%;
        }

        .list-unstyled {
          min-width: 100%;
        }
      `}</style>
    </div>
  )
}

DailyRevenue.propTypes = {
  className: PropTypes.string,
  withCharts: PropTypes.bool,
}

export default DailyRevenue
