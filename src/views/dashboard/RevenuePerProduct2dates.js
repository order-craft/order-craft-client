import React, { useEffect, useRef, useState } from 'react'
import { CChartBar } from '@coreui/react-chartjs'
import { getStyle } from '@coreui/utils'
import axios from 'axios'
import { BaseUrl } from '../../helpers/BaseUrl'
import { GetToken } from '../../helpers/GetToken'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import {
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CForm,
  CFormLabel,
  CRow,
  CSpinner,
} from '@coreui/react'
import { useSelector } from 'react-redux'
import translations from '../../app/Language'
import CIcon from '@coreui/icons-react'
import { cilFilter } from '@coreui/icons'

const RevenuePerProduct2dates = () => {
  const t = useSelector((state) => state.language)
  const Language = translations[t]

  const chartRef = useRef(null)
  const [revenueData, setRevenueData] = useState([])
  const [loading, setLoading] = useState(false)
  const [maxValue, setMaxValue] = useState(0)
  const [startDate, setStartDate] = useState(new Date(new Date().setDate(new Date().getDate() - 7)))
  const [endDate, setEndDate] = useState(new Date())
  const token = GetToken()

  const fetchData = async () => {
    setLoading(true)
    try {
      const response = await axios.post(
        `${BaseUrl}/dashboard/revenue-by-product-between-dates`,
        { startDate, endDate },
        { headers: { Authorization: `Bearer ${token}` } },
      )
      setRevenueData(response.data)
      const allValues = response.data.map((product) => product.totalRevenue)
      setMaxValue(Math.max(...allValues, 60))
    } catch (err) {
      console.error('Error fetching revenue by product:', err)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleSubmit = (e) => {
    e.preventDefault()
    fetchData()
  }

  const labels = revenueData.map((data) => data.productName)
  const dataPoints = revenueData.map((data) => data.totalRevenue)
  const colors = labels.map((_, i) => `hsl(${(i * 360) / labels.length}, 70%, 50%)`)

  return (
    <CCard className="dashboard-card">
      <CCardHeader className="dashboard-card-header">
        <h3 className="dashboard-title">{Language.ProductRevenueDateRange}</h3>
      </CCardHeader>
      <CCardBody>
        <CRow className="mb-4">
          <CCol md={12}>
            <CForm onSubmit={handleSubmit}>
              <CRow>
                <CCol md={5}>
                  <CFormLabel>{Language.StartDate}</CFormLabel>
                  <DatePicker
                    selected={startDate}
                    onChange={(date) => setStartDate(date)}
                    className="form-control"
                    dateFormat="MMM d, yyyy"
                    maxDate={endDate}
                  />
                </CCol>
                <CCol md={5}>
                  <CFormLabel>{Language.EndDate}</CFormLabel>
                  <DatePicker
                    selected={endDate}
                    onChange={(date) => setEndDate(date)}
                    className="form-control"
                    dateFormat="MMM d, yyyy"
                    minDate={startDate}
                    maxDate={new Date()}
                  />
                </CCol>
                <CCol md={2} className="d-flex align-items-end">
                  <CButton color="primary" type="submit" disabled={loading}>
                    <CIcon icon={cilFilter} className="me-1" />
                    {Language.Apply}
                  </CButton>
                </CCol>
              </CRow>
            </CForm>
          </CCol>
        </CRow>

        {loading ? (
          <div className="text-center py-5">
            <CSpinner color="primary" />
          </div>
        ) : (
          <div style={{ height: '100%' }}>
            <CChartBar
              ref={chartRef}
              data={{
                labels,
                datasets: [
                  {
                    label: 'Revenue (TND)',
                    data: dataPoints,
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

export default RevenuePerProduct2dates
