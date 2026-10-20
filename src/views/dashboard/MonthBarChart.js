import React, { useEffect, useMemo, useState } from 'react'
import CIcon from '@coreui/icons-react'
import { cilWarning } from '@coreui/icons'
import axios from 'axios'
import { BaseUrl } from '../../helpers/BaseUrl'
import { GetToken } from '../../helpers/GetToken'
import { useSelector } from 'react-redux'
import translations from '../../app/Language'
import './productPerformance/productPerformance.css'

const SLICE_COLORS = [
  '#0d6efd',
  '#198754',
  '#0dcaf0',
  '#ffc107',
  '#e83e8c',
  '#6f42c1',
  '#fd7e14',
  '#20c997',
  '#dc3545',
  '#6c757d',
]

const MonthBarChart = () => {
  const token = GetToken()
  const t = useSelector((state) => state.language)
  const Language = translations[t]

  const [revenueData, setRevenueData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const response = await axios.get(`${BaseUrl}/dashboard/revenue-by-product-by-month`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        setRevenueData(response.data || [])
      } catch (err) {
        console.error('Error fetching monthly revenue by product:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const rows = useMemo(() => {
    const names = []
    const totals = []
    revenueData.forEach((monthData) => {
      ;(monthData.products || []).forEach((product) => {
        const safeValue = Number(product.totalRevenue) || 0
        const idx = names.indexOf(product.productName)
        if (idx === -1) {
          names.push(product.productName)
          totals.push(safeValue)
        } else {
          totals[idx] += safeValue
        }
      })
    })
    return names
      .map((name, i) => ({
        name,
        value: totals[i],
        color: SLICE_COLORS[i % SLICE_COLORS.length],
      }))
      .sort((a, b) => b.value - a.value)
  }, [revenueData])

  const isEmpty = !loading && rows.length === 0
  const max = rows.length > 0 ? rows[0].value : 0
  const total = rows.reduce((sum, r) => sum + r.value, 0)

  return (
    <div className="pp-card">
      <div className="pp-card-header">
        <div className="pp-card-header-left">
          <h5 className="pp-card-title">
            {Language.RevenuePerProductMonthBar  || 'Revenue per product — ranked'}
          </h5>
          <div className="pp-card-subtitle">
            {Language.totalRevenueMonthHint || 'Total revenue, year to date'}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="pp-skeleton">
          <div className="pp-skeleton-chart" />
        </div>
      ) : isEmpty ? (
        <div className="pp-empty">
          <CIcon icon={cilWarning} size="xl" />
          <div className="pp-empty-title">{Language.noProductData || 'No product revenue yet'}</div>
          <div className="pp-empty-body">
            {Language.noProductDataHint ||
              'Product revenue will appear here once orders are archived.'}
          </div>
        </div>
      ) : (
        <div style={{ padding: 24 }}>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
            }}
          >
            {rows.map((row, index) => {
              const widthPct = max > 0 ? (row.value / max) * 100 : 0
              const share = total > 0 ? (row.value / total) * 100 : 0
              return (
                <div
                  key={index}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(0, 1fr) auto',
                    gap: 12,
                    alignItems: 'center',
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 12,
                        marginBottom: 4,
                        fontSize: '0.88rem',
                      }}
                    >
                      <span
                        style={{
                          fontWeight: 600,
                          color: '#1a1a1a',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {row.name}
                      </span>
                      <span
                        style={{
                          whiteSpace: 'nowrap',
                          color: '#6c757d',
                          fontSize: '0.78rem',
                        }}
                      >
                        {share?.toFixed(1)}%
                      </span>
                    </div>
                    <div
                      style={{
                        width: '100%',
                        height: 8,
                        borderRadius: 999,
                        background: '#f1f3f5',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          width: `${widthPct}%`,
                          height: '100%',
                          borderRadius: 999,
                          background: row.color,
                          transition: 'width 0.4s ease',
                        }}
                      />
                    </div>
                  </div>
                  <div
                    style={{
                      fontWeight: 700,
                      color: '#1a1a1a',
                      fontSize: '0.9rem',
                      fontVariantNumeric: 'tabular-nums',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {Number(row.value || 0).toFixed(2)} TND{' '}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export default MonthBarChart
