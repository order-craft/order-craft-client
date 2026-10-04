import React, { useEffect, useState } from 'react'
import { CChartPie, CChartBar } from '@coreui/react-chartjs'
import axios from 'axios'
import { BaseUrl } from '../../helpers/BaseUrl'
import { GetToken } from '../../helpers/GetToken'
import { CSpinner, CCard, CCardBody, CButton, CButtonGroup } from '@coreui/react'
import { useSelector } from 'react-redux'
import translations from '../../app/Language'

const MainChart = ({ onDataUpdate }) => {
  const [revenueData, setRevenueData] = useState([])
  const [loading, setLoading] = useState(true)
  const [chartType, setChartType] = useState('pie')
  const token = GetToken()
  const t = useSelector((state) => state.language)
  const Language = translations[t]

  useEffect(() => {
    const getRevenueByProductByMonth = async () => {
      setLoading(true)
      try {
        const response = await axios.get(`${BaseUrl}/dashboard/revenue-by-product-by-month`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        setRevenueData(response.data)
        onDataUpdate(response.data)
      } catch (err) {
        console.error('Error fetching revenue by product:', err)
      }
      setLoading(false)
    }
    getRevenueByProductByMonth()
  }, [token])

  // Prepare data for charts
  const productNames = []
  const revenues = []

  revenueData.forEach((monthData) => {
    monthData.products.forEach((product) => {
      const index = productNames.indexOf(product.productName)
      if (index === -1) {
        productNames.push(product.productName)
        revenues.push(product.totalRevenue)
      } else {
        revenues[index] += product.totalRevenue
      }
    })
  })

  const colors = productNames.map((_, i) => `hsl(${(i * 360) / productNames.length}, 70%, 50%)`)

  return (
    <CCard className="chart-container">
      <CCardBody>
        <div className="d-flex justify-content-end mb-3">
          <CButtonGroup>
            <CButton
              color={chartType === 'pie' ? 'primary' : 'outline-secondary'}
              size="sm"
              onClick={() => setChartType('pie')}
            >
              {Language.PieChart}
            </CButton>
            <CButton
              color={chartType === 'bar' ? 'primary' : 'outline-secondary'}
              size="sm"
              onClick={() => setChartType('bar')}
            >
              {Language.BarChart}
            </CButton>
          </CButtonGroup>
        </div>

        {loading ? (
          <div className="text-center py-5">
            <CSpinner color="primary" />
          </div>
        ) : chartType === 'pie' ? (
          <CChartPie
            height={340}
            data={{
              labels: productNames,
              datasets: [
                {
                  data: revenues,
                  backgroundColor: colors,
                  hoverBackgroundColor: colors.map((c) => `${c}CC`),
                },
              ],
            }}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: {
                  position: 'right',
                  labels: {
                    // usePointStyle: true,
                    padding: 20,
                    font: { size: 12 },
                  },
                },
                tooltip: {
                  callbacks: {
                    label: (context) => {
                      const value = context.raw || 0
                      const total = revenues.reduce((a, b) => a + b, 0)
                      const percentage = ((value / total) * 100).toFixed(1)
                      return `${context.label}: ${value.toFixed(2)} TND (${percentage}%)`
                    },
                  },
                },
              },
            }}
          />
        ) : (
          <CChartBar
            height={340}
            data={{
              labels: productNames,
              datasets: [
                {
                  label: 'Revenue (TND)',
                  data: revenues,
                  backgroundColor: colors,
                  borderColor: colors,
                  borderWidth: 1,
                },
              ],
            }}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: { display: false },
                tooltip: {
                  callbacks: {
                    label: (context) => `${context.raw.toFixed(2)} TND`,
                  },
                },
              },
              scales: {
                y: {
                  beginAtZero: true,
                  ticks: {
                    callback: (value) => `${value} TND`,
                  },
                },
              },
            }}
          />
        )}
      </CCardBody>
    </CCard>
  )
}

export default MainChart
