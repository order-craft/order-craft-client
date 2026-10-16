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

const RevenuePerProductPerDay = () => {
  const token = GetToken()
  const t = useSelector((state) => state.language)
  const Language = translations[t]

  const [revenueData, setRevenueData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const response = await axios.get(`${BaseUrl}/dashboard/revenue-by-product-by-day`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        setRevenueData(response.data || [])
      } catch (err) {
        console.error('Error fetching revenue by product by day:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const daysOfWeek = useMemo(() => {
    const now = new Date()
    const startOfWeek = new Date(now)
    startOfWeek.setDate(now.getDate() - now.getDay())
    return Array.from({ length: 7 }, (_, i) => {
      const day = new Date(startOfWeek)
      day.setDate(startOfWeek.getDate() + i)
      return day
    })
  }, [])

  const labels = daysOfWeek.map((date) =>
    date.toLocaleDateString(undefined, {
      weekday: 'short',
      day: 'numeric',
    }),
  )

  const rows = useMemo(() => {
    const names = []
    revenueData.forEach((dayData) => {
      ;(dayData.products || []).forEach((product) => {
        if (!names.includes(product.productName)) {
          names.push(product.productName)
        }
      })
    })

    return names.map((name, i) => {
      const values = daysOfWeek.map((date) => {
        const dayData = revenueData.find(
          (day) => new Date(day.date).toDateString() === date.toDateString(),
        )
        return Number(dayData?.products.find((p) => p.productName === name)?.totalRevenue) || 0
      })
      const rowTotal = values.reduce((a, b) => a + b, 0)
      return {
        name,
        values,
        total: rowTotal,
        color: SLICE_COLORS[i % SLICE_COLORS.length],
      }
    })
  }, [revenueData, daysOfWeek])

  const isEmpty = !loading && rows.length === 0
  const dayTotals = daysOfWeek.map((_, dIdx) => rows.reduce((sum, r) => sum + r.values[dIdx], 0))
  const maxDay = Math.max(...dayTotals, 0)

  return (
    <>
      {loading ? (
        <div className="pp-skeleton">
          <div className="pp-skeleton-chart" />
        </div>
      ) : isEmpty ? (
        <div className="pp-empty">
          <CIcon icon={cilWarning} size="xl" />
          <div className="pp-empty-title">
            {Language.noProductData || 'No product revenue this week'}
          </div>
          <div className="pp-empty-body">
            {Language.noProductDataHint ||
              'Product revenue will appear here once orders are archived.'}
          </div>
        </div>
      ) : (
        <div className="pp-week-wrap">
          {/* Daily totals row */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: `minmax(140px, 1fr) repeat(7, minmax(60px, 1fr))`,
              gap: 8,
              padding: '8px 0',
              borderBottom: '1px solid #eceef1',
              marginBottom: 8,
              fontSize: '0.78rem',
              fontWeight: 700,
              color: '#6c757d',
              textTransform: 'uppercase',
              letterSpacing: '0.03em',
            }}
          >
            <div>{Language.product || 'Product'}</div>
            {labels.map((l) => (
              <div key={l} style={{ textAlign: 'right' }}>
                {l}
              </div>
            ))}
          </div>

          {/* Rows */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {rows.map((row, i) => (
              <div
                key={i}
                style={{
                  display: 'grid',
                  gridTemplateColumns: `minmax(140px, 1fr) repeat(7, minmax(60px, 1fr))`,
                  gap: 8,
                  alignItems: 'center',
                  fontSize: '0.85rem',
                  padding: '6px 0',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    minWidth: 0,
                  }}
                >
                  <span
                    style={{
                      display: 'inline-block',
                      width: 10,
                      height: 10,
                      borderRadius: 999,
                      background: row.color,
                      flexShrink: 0,
                    }}
                  />
                  <span
                    style={{
                      fontWeight: 600,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {row.name}
                  </span>
                </div>
                {row.values.map((v, i) => (
                  <div
                    key={i}
                    style={{
                      textAlign: 'right',
                      fontVariantNumeric: 'tabular-nums',
                      color: v > 0 ? '#1a1a1a' : '#cbd5e0',
                      fontWeight: v > 0 ? 600 : 400,
                    }}
                  >
                    {v > 0 ? Number(v || 0).toFixed(2) : '—'}{' '}
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* Footer: daily totals */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: `minmax(140px, 1fr) repeat(7, minmax(60px, 1fr))`,
              gap: 8,
              padding: '10px 0 0 0',
              borderTop: '1px solid #eceef1',
              marginTop: 8,
              fontSize: '0.85rem',
              fontWeight: 800,
            }}
          >
            <div>{Language.total || 'Total'}</div>
            {dayTotals.map((t, i) => (
              <div
                key={i}
                style={{
                  textAlign: 'right',
                  fontVariantNumeric: 'tabular-nums',
                  color: maxDay > 0 && t === maxDay ? '#198754' : '#1a1a1a',
                }}
              >
                {t > 0 ? Number(t || 0).toFixed(2) : '—'}{' '}
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  )
}

export default RevenuePerProductPerDay
