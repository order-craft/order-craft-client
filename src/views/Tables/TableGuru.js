import React, { useState, useEffect } from 'react'
import {
  CCard,
  CCardBody,
  CCardHeader,
  CProgress,
  CProgressBar,
  CCol,
  CRow,
  CWidgetStatsF,
  CSpinner,
  CTooltip,
  CAvatar,
  CBadge,
  CContainer,
} from '@coreui/react'
import { cilRestaurant, cilChart } from '@coreui/icons'
import CIcon from '@coreui/icons-react'
import axios from 'axios'
import { BaseUrl } from '../../helpers/BaseUrl'
import { GetToken } from '../../helpers/GetToken'

const TableGuru = () => {
  const [revenueData, setRevenueData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const token = GetToken()

  const fetchRevenueData = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await axios.get(`${BaseUrl}/tables/guru/revenue-per-table`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      setRevenueData(response.data || [])
    } catch (error) {
      console.error('Failed to fetch revenue data:', error)
      setError('Failed to load revenue data. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRevenueData()
  }, [])

  if (loading) {
    return (
      <CCard>
        <CCardBody className="text-center p-5">
          <CSpinner />
          <div className="mt-3">Loading table performance data...</div>
        </CCardBody>
      </CCard>
    )
  }

  if (error) {
    return (
      <CCard>
        <CCardBody className="text-center p-5 text-danger">
          {error}
          <button onClick={fetchRevenueData} className="btn btn-sm btn-primary ms-2">
            Retry
          </button>
        </CCardBody>
      </CCard>
    )
  }

  if (!revenueData || revenueData.length === 0) {
    return (
      <CCard>
        <CCardBody className="text-center p-5 text-muted">No revenue data available</CCardBody>
      </CCard>
    )
  }

  // Find max revenue for scaling
  const maxRevenue = Math.max(...revenueData.map((item) => item.totalRevenue))
  const sortedData = [...revenueData].sort((a, b) => b.totalRevenue - a.totalRevenue)
  const topTable = sortedData[0]

  return (
    <CCard className="mb-4">
      <CCardHeader className="bg-gradient-primary text-white py-3">
        <div className="d-flex justify-content-between align-items-center">
          <div>
            <h3 className="h4 mb-1" style={{ color: 'black' }}>
              🏆 Table Revenue Race
            </h3>
            <small className="opacity-75" style={{ color: 'black' }}>
              Real-time table performance ranking
            </small>
          </div>
          <CIcon icon={cilChart} height={36} className="text-white-50" />
        </div>
      </CCardHeader>
      <CCardBody className="p-4">
        {topTable && (
          <CContainer className="mb-4">
            <CWidgetStatsF
              className="mb-4 shadow-sm"
              color="warning"
              icon={<CIcon icon={cilChart} height={36} />}
              title="Current Leader"
              value={`Table ${topTable.tableNumber}`}
              footer={
                <div className="d-flex justify-content-between align-items-center">
                  <span className="fs-6">Total Revenue</span>
                  <CBadge color="warning" className="fs-6">
                    {topTable.totalRevenue.toFixed(2)} TND
                  </CBadge>
                </div>
              }
            />
          </CContainer>
        )}

        <div className="table-performance-list">
          <CRow className="g-4">
            {sortedData.map((table) => (
              <CCol xs={12} key={table.tableNumber}>
                <div className="bg-light-subtle rounded-3 p-3 shadow-sm">
                  <CRow className="align-items-center g-3">
                    {/* Table Number */}
                    <CCol xs="auto">
                      <CTooltip content={`Table ${table.tableNumber}`}>
                        <CAvatar
                          color={table.tableNumber === topTable.tableNumber ? 'warning' : 'primary'}
                          textColor="white"
                          size="lg"
                          className="position-relative"
                        >
                          {table.tableNumber}
                          {table.tableNumber === topTable.tableNumber && (
                            <div className="position-absolute top-0 start-100 translate-middle">
                              <CIcon
                                icon={cilChart}
                                className="text-warning"
                                style={{ fontSize: '1.25rem' }}
                              />
                            </div>
                          )}
                        </CAvatar>
                      </CTooltip>
                    </CCol>

                    {/* Progress Bar */}
                    <CCol>
                      <CTooltip content={`${table.totalRevenue.toFixed(2)}TND`}>
                        <div>
                          <CProgress className="rounded-pill">
                            <CProgressBar
                              value={(table.totalRevenue / maxRevenue) * 100}
                              color={
                                table.tableNumber === topTable.tableNumber ? 'warning' : 'primary'
                              }
                              animated
                              className="rounded-pill"
                            />
                          </CProgress>
                        </div>
                      </CTooltip>
                    </CCol>

                    {/* Percentage */}
                    <CCol xs="auto" className="text-end">
                      <span className="text-muted fw-semibold">
                        {((table.totalRevenue / maxRevenue) * 100).toFixed(0)}%
                      </span>
                    </CCol>
                  </CRow>
                </div>
              </CCol>
            ))}
          </CRow>
        </div>

        <style>{`
          .table-performance-list {
            max-height: 500px;
            overflow-y: auto;
            padding-right: 8px;
          }

          @media (max-width: 768px) {
            .table-performance-list {
              max-height: 400px;
            }
          }

          /* Scrollbar Styling */
          .table-performance-list::-webkit-scrollbar {
            width: 6px;
          }
          .table-performance-list::-webkit-scrollbar-track {
            background: rgba(0, 0, 0, 0.05);
            border-radius: 4px;
          }
          .table-performance-list::-webkit-scrollbar-thumb {
            background: rgba(0, 0, 0, 0.2);
            border-radius: 4px;
          }
        `}</style>
      </CCardBody>
    </CCard>
  )
}

export default TableGuru
