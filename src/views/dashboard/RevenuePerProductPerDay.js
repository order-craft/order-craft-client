import { useEffect, useRef, useState } from 'react'
import { CChartLine } from '@coreui/react-chartjs'
import { getStyle } from '@coreui/utils'
import axios from 'axios'
import { BaseUrl } from '../../helpers/BaseUrl'
import { GetToken } from '../../helpers/GetToken'
import { CSpinner, CCard, CCardBody } from '@coreui/react'

const RevenuePerProductPerDay = ({ onDataUpdate }) => {
  const chartRef = useRef(null)
  const [revenueData, setRevenueData] = useState([])
  const [loading, setLoading] = useState(true)
  const [maxValue, setMaxValue] = useState(0)
  const token = GetToken()

  useEffect(() => {
    const getRevenueByProductForCurrentWeek = async () => {
      setLoading(true)
      try {
        const response = await axios.get(`${BaseUrl}/dashboard/revenue-by-product-by-day`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        setRevenueData(response.data)
        onDataUpdate(response.data)

        const allValues = response.data.flatMap((dayData) =>
          dayData.products.map((product) => product.totalRevenue),
        )
        setMaxValue(Math.max(...allValues, 60))
      } catch (err) {
        console.error('Error fetching revenue by product by day:', err)
      }
      setLoading(false)
    }
    getRevenueByProductForCurrentWeek()
  }, [token])

  // Get current week's days
  const now = new Date()
  const currentDay = now.getDay()
  const startOfWeek = new Date(now)
  startOfWeek.setDate(now.getDate() - currentDay)

  const daysOfWeek = Array.from({ length: 7 }, (_, i) => {
    const day = new Date(startOfWeek)
    day.setDate(startOfWeek.getDate() + i)
    return day
  })

  const labels = daysOfWeek.map((date) =>
    date.toLocaleDateString('default', { weekday: 'short', day: 'numeric' }),
  )

  // Prepare datasets
  const productNames = []
  const datasets = []

  revenueData.forEach((dayData) => {
    dayData.products.forEach((product) => {
      if (!productNames.includes(product.productName)) {
        productNames.push(product.productName)
      }
    })
  })

  productNames.forEach((productName, index) => {
    const dataPoints = daysOfWeek.map((date) => {
      const dayData = revenueData.find(
        (day) => new Date(day.date).toDateString() === date.toDateString(),
      )
      return dayData
        ? dayData.products.find((p) => p.productName === productName)?.totalRevenue || 0
        : 0
    })

    datasets.push({
      label: productName,
      data: dataPoints,
      borderColor: `hsl(${(index * 360) / productNames.length}, 70%, 50%)`,
      backgroundColor: `hsla(${(index * 360) / productNames.length}, 70%, 50%, 0.2)`,
      tension: 0.4,
      borderWidth: 2,
      pointRadius: 4,
      pointHoverRadius: 6,
    })
  })

  return (
    <CCard className="chart-container">
      <CCardBody>
        {loading ? (
          <div className="text-center py-5">
            <CSpinner color="primary" />
          </div>
        ) : (
          <div style={{ height: '100%' }}>
            <CChartLine
              ref={chartRef}
              data={{ labels, datasets }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'bottom',
                    labels: {
                      usePointStyle: true,
                      padding: 10,
                    },
                  },
                  tooltip: {
                    callbacks: {
                      label: (context) =>
                        `${context.dataset.label}: ${context.parsed.y.toFixed(2)} TND`,
                    },
                  },
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    max: maxValue,
                    ticks: {
                      callback: (value) => `${value} TND`,
                      stepSize: Math.ceil(maxValue / 5),
                    },
                    grid: {
                      color: getStyle('--cui-border-color-translucent'),
                    },
                  },
                  x: {
                    grid: {
                      display: false,
                    },
                  },
                },
              }}
            />
          </div>
        )}
      </CCardBody>
    </CCard>
  )
}

export default RevenuePerProductPerDay
