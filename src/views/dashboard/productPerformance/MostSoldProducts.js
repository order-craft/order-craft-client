import React, { useEffect, useMemo, useState } from 'react'
import CIcon from '@coreui/icons-react'
import { cilStar, cilWarning } from '@coreui/icons'
import axios from 'axios'
import { BaseUrl } from '../../../helpers/BaseUrl'
import { GetToken } from '../../../helpers/GetToken'
import { useSelector } from 'react-redux'
import translations from '../../../app/Language'
import './productPerformance.css'

const RANK_COLORS = ['#d4a017', '#94a3b8', '#b45309'] // gold, silver, bronze

const MostSoldProducts = () => {
  const token = GetToken()
  const t = useSelector((state) => state.language)
  const Language = translations[t]

  const [mostSold, setMostSold] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const response = await axios.get(`${BaseUrl}/dashboard/most-sold-products`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        setMostSold(response.data || [])
      } catch (err) {
        console.error('Error fetching most sold products:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const isEmpty = !loading && mostSold.length === 0

  const top3 = useMemo(() => mostSold.slice(0, 3), [mostSold])
  const rest = useMemo(() => mostSold.slice(3), [mostSold])
  const maxSold = mostSold[0]?.totalSold || 0

  return (
    <div className="pp-card">
      <div className="pp-card-header">
        <div className="pp-card-header-left">
          <h5 className="pp-card-title">
            <CIcon icon={cilStar} />
            {Language.mostSoldProducts || 'Most sold products'}
          </h5>
          <div className="pp-card-subtitle">
            <strong>{mostSold.length}</strong>{' '}
            {mostSold.length === 1
              ? Language.product || 'product'
              : Language.products || 'products'}{' '}
            {Language.rankedByUnitsSold || 'ranked by units sold'}
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
          <div className="pp-empty-title">{Language.noProductsData || 'No products sold yet'}</div>
          <div className="pp-empty-body">
            {Language.noProductsDataHint ||
              'Sales ranking will appear here once orders are archived.'}
          </div>
        </div>
      ) : (
        <>
          {/* Top 3 */}
          <div className="pp-top3">
            {top3.map((product, index) => {
              const pct = maxSold > 0 ? (product.totalSold / maxSold) * 100 : 0
              return (
                <div className="pp-top3-card" key={product._id}>
                  <div className="pp-top3-rank" style={{ background: RANK_COLORS[index] }}>
                    {index + 1}
                  </div>
                  <div className="pp-top3-name" title={product.productName}>
                    {product.productName}
                  </div>
                  <div className="pp-top3-count">
                    {product.totalSold}{' '}
                    <span className="pp-top3-unit">{Language.sold || 'sold'}</span>
                  </div>
                  <div className="pp-bar-track">
                    <div
                      className="pp-bar-fill"
                      style={{
                        width: `${pct}%`,
                        background: RANK_COLORS[index],
                      }}
                    />
                  </div>
                </div>
              )
            })}
          </div>

          {/* Rest */}
          {rest.length > 0 && (
            <div className="pp-sold-list">
              {rest.map((product, index) => {
                const pct = maxSold > 0 ? (product.totalSold / maxSold) * 100 : 0
                return (
                  <div className="pp-sold-row" key={product._id}>
                    <div className="pp-sold-rank">{index + 4}</div>
                    <div className="pp-sold-name" title={product.productName}>
                      {product.productName}
                    </div>
                    <div className="pp-sold-bar">
                      <div className="pp-bar-track">
                        <div
                          className="pp-bar-fill"
                          style={{
                            width: `${pct}%`,
                            background: '#0d6efd',
                          }}
                        />
                      </div>
                    </div>
                    <div className="pp-sold-count">{product.totalSold}</div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default MostSoldProducts
