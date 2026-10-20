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

/* Convert a value + previous cumulative offset into an SVG arc path */
const polarToCartesian = (cx, cy, r, angleDeg) => {
  const rad = ((angleDeg - 90) * Math.PI) / 180
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

const arcPath = (cx, cy, r, startAngle, endAngle) => {
  const start = polarToCartesian(cx, cy, r, endAngle)
  const end = polarToCartesian(cx, cy, r, startAngle)
  const largeArc = endAngle - startAngle <= 180 ? 0 : 1
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y}`
}

/* Donut chart rendered as pure SVG. Nothing measures anything. */
const DonutChart = ({ labels, values, colors, size = 260 }) => {
  const total = values.reduce((a, b) => a + b, 0)
  const radius = size / 2 - 20
  const innerRadius = radius * 0.6
  const cx = size / 2
  const cy = size / 2

  if (total <= 0) {
    return null
  }

  let cumulative = 0
  const slices = values.map((value, i) => {
    const startAngle = (cumulative / total) * 360
    cumulative += value
    const endAngle = (cumulative / total) * 360
    return {
      path: arcPath(cx, cy, radius, startAngle, endAngle),
      color: colors[i % colors.length],
    }
  })

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{ display: 'block' }}
      aria-hidden="true"
    >
      {slices.map((s, i) => (
        <path key={i} d={s.path} fill="none" stroke={s.color} strokeWidth={radius - innerRadius} />
      ))}
    </svg>
  )
}

const MonthPieChart = () => {
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

  const { labels, values, colors } = useMemo(() => {
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
    return {
      labels: names,
      values: totals,
      colors: names.map((_, i) => SLICE_COLORS[i % SLICE_COLORS.length]),
    }
  }, [revenueData])

  const isEmpty = !loading && labels.length === 0
  const total = values.reduce((a, b) => a + b, 0)

  return (
    <div className="pp-card">
      <div className="pp-card-header">
        <div className="pp-card-header-left">
          <h5 className="pp-card-title">
            {Language.RevenuePerProductMonth ||
              'Revenue per product — year to date'}
          </h5>
          <div className="pp-card-subtitle">
            {Language.shareOfTotal || 'Share of total revenue'}
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
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 32,
            padding: 24,
            flexWrap: 'wrap',
          }}
        >
          <DonutChart labels={labels} values={values} colors={colors} size={260} />

          <ul
            style={{
              listStyle: 'none',
              padding: 0,
              margin: 0,
              flex: '1 1 220px',
              minWidth: 220,
            }}
          >
            {labels.map((label, i) => {
              const value = values[i]
              const pct = total > 0 ? (value / total) * 100 : 0
              return (
                <li
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                    padding: '6px 0',
                    fontSize: '0.88rem',
                  }}
                >
                  <span
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
                        background: colors[i % colors.length],
                        flexShrink: 0,
                      }}
                    />
                    <span
                      style={{
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {label}
                    </span>
                  </span>
                  <span
                    style={{
                      whiteSpace: 'nowrap',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    <strong>{Number(value || 0).toFixed(2)} TND</strong>{' '}
                    <span style={{ color: '#6c757d' }}>{pct.toFixed(1)}%</span>
                  </span>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}

export default MonthPieChart
