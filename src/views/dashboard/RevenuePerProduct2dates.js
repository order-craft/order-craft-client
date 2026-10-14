import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { CButton } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilWarning, cilCalendar } from '@coreui/icons'
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

const toLocalISO = (d) => {
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}
const todayISO = () => toLocalISO(new Date())
const daysAgoISO = (n) => {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return toLocalISO(d)
}

const RevenuePerProduct2dates = () => {
  const t = useSelector((state) => state.language)
  const Language = translations[t]
  const token = GetToken()

  const [revenueData, setRevenueData] = useState([])
  const [loading, setLoading] = useState(true)
  const [startDate, setStartDate] = useState(daysAgoISO(7))
  const [endDate, setEndDate] = useState(todayISO())

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const response = await axios.post(
        `${BaseUrl}/dashboard/revenue-by-product-between-dates`,
        { startDate, endDate },
        { headers: { Authorization: `Bearer ${token}` } },
      )
      setRevenueData(response.data || [])
    } catch (err) {
      console.error('Error fetching revenue by product:', err)
      setRevenueData([])
    } finally {
      setLoading(false)
    }
  }, [token, startDate, endDate])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const rows = useMemo(() => {
    return [...revenueData]
      .map((r, i) => ({
        name: r.productName,
        value: Number(r.totalRevenue) || 0,
        color: SLICE_COLORS[i % SLICE_COLORS.length],
      }))
      .sort((a, b) => b.value - a.value)
  }, [revenueData])

  const isEmpty = !loading && rows.length === 0
  const max = rows.length > 0 ? rows[0].value : 0
  const total = rows.reduce((s, r) => s + r.value, 0)

  return (
    <>
      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 12,
          marginBottom: 16,
          flexWrap: 'wrap',
        }}
      >
        <div className="pp-date-group">
          <div className="pp-date">
            <CIcon icon={cilCalendar} style={{ color: '#6c757d' }} />
            <input
              type="date"
              value={startDate}
              max={endDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <span className="pp-date-sep">→</span>
          <div className="pp-date">
            <input
              type="date"
              value={endDate}
              min={startDate}
              max={todayISO()}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>
        <CButton color="primary" onClick={fetchData} disabled={loading}>
          {Language.Apply || 'Apply'}
        </CButton>
      </div>

      {loading ? (
        <div className="pp-skeleton">
          <div className="pp-skeleton-chart" />
        </div>
      ) : isEmpty ? (
        <div className="pp-empty">
          <CIcon icon={cilWarning} size="xl" />
          <div className="pp-empty-title">
            {Language.noProductData || 'No product revenue in this range'}
          </div>
          <div className="pp-empty-body">
            {Language.noProductDataHint || 'Try a different date range.'}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {rows.map((row, i) => {
            const widthPct = max > 0 ? (row.value / max) * 100 : 0
            const share = total > 0 ? (row.value / total) * 100 : 0
            return (
              <div
                key={i}
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
      )}
    </>
  )
}

export default RevenuePerProduct2dates
