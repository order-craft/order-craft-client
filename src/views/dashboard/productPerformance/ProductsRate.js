import React, { useEffect, useMemo, useState } from 'react'
import {
  CButton,
  CPagination,
  CPaginationItem,
  CSpinner,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilSearch, cilStar, cilWarning } from '@coreui/icons'
import axios from 'axios'
import { BaseUrl } from '../../../helpers/BaseUrl'
import { GetToken } from '../../../helpers/GetToken'
import { useSelector } from 'react-redux'
import translations from '../../../app/Language'
import './productPerformance.css'

const ProductsRate = () => {
  const token = GetToken()
  const t = useSelector((state) => state.language)
  const Language = translations[t]

  const [productRatings, setProductRatings] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortConfig, setSortConfig] = useState({
    key: 'rate',
    direction: 'descending',
  })
  const [margins, setMargins] = useState({})

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const [ratingsRes, marginsRes] = await Promise.all([
          axios.get(`${BaseUrl}/products/rates`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get(`${BaseUrl}/dashboard/product-margins`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ])
        setProductRatings(ratingsRes.data || [])
        const map = {}
        ;(marginsRes.data || []).forEach((m) => {
          map[String(m.productId)] = m
        })
        setMargins(map)
      } catch (error) {
        console.error('Failed to fetch product data:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* ---------- derived ---------- */
  const filtered = useMemo(() => {
    if (!searchTerm.trim()) return productRatings
    const q = searchTerm.trim().toLowerCase()
    return productRatings.filter((p) => (p.productName || '').toLowerCase().includes(q))
  }, [productRatings, searchTerm])

  const sorted = useMemo(() => {
    const arr = [...filtered]
    arr.sort((a, b) => {
      const av = a[sortConfig.key]
      const bv = b[sortConfig.key]
      if (av < bv) return sortConfig.direction === 'ascending' ? -1 : 1
      if (av > bv) return sortConfig.direction === 'ascending' ? 1 : -1
      return 0
    })
    return arr
  }, [filtered, sortConfig])

  const totalPages = Math.max(1, Math.ceil(sorted.length / itemsPerPage))
  const safePage = Math.min(currentPage, totalPages)
  const firstIndex = (safePage - 1) * itemsPerPage
  const lastIndex = firstIndex + itemsPerPage
  const currentProducts = sorted.slice(firstIndex, lastIndex)

  /* ---------- actions ---------- */
  const requestSort = (key) => {
    setSortConfig((prev) =>
      prev.key === key && prev.direction === 'ascending'
        ? { key, direction: 'descending' }
        : { key, direction: 'ascending' },
    )
  }

  const sortIcon = (key) => {
    if (sortConfig.key !== key) return '↕'
    return sortConfig.direction === 'ascending' ? '↑' : '↓'
  }

  const getRatingTone = (rating) => {
    if (rating >= 4) return 'success'
    if (rating >= 3) return 'info'
    if (rating >= 2) return 'warning'
    return 'danger'
  }

  return (
    <div className="pp-card">
      <div className="pp-card-header">
        <div className="pp-card-header-left">
          <h5 className="pp-card-title">
            <CIcon icon={cilStar} />
            {Language.productsRating || 'Products & ratings'}
          </h5>
          <div className="pp-card-subtitle">
            <strong>{productRatings.length}</strong>{' '}
            {productRatings.length === 1 ? 'product' : 'products'}
            {' · '}
            with ratings and margins
          </div>
        </div>

        <div className="pp-card-header-right">
          <div className="pp-search">
            <CIcon icon={cilSearch} className="pp-search-icon" />
            <input
              type="text"
              placeholder={Language.searchProducts || 'Search products'}
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value)
                setCurrentPage(1)
              }}
            />
          </div>
          <select
            className="pp-perpage"
            value={itemsPerPage}
            onChange={(e) => {
              setItemsPerPage(Number(e.target.value))
              setCurrentPage(1)
            }}
            aria-label="Rows per page"
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="pp-skeleton">
          <div className="pp-skeleton-chart" />
        </div>
      ) : productRatings.length === 0 ? (
        <div className="pp-empty">
          <CIcon icon={cilWarning} size="xl" />
          <div className="pp-empty-title">{Language.noProductsFound || 'No products yet'}</div>
          <div className="pp-empty-body">
            {Language.noProductsHint || 'Products with ratings and margins will appear here.'}
          </div>
        </div>
      ) : (
        <>
          <div className="pp-table-wrap">
            <CTable hover responsive className="pp-table">
              <CTableHead>
                <CTableRow>
                  <CTableHeaderCell onClick={() => requestSort('productName')}>
                    {Language.productName || 'Product'}{' '}
                    <span className="pp-sort">{sortIcon('productName')}</span>
                  </CTableHeaderCell>
                  <CTableHeaderCell className="text-end" onClick={() => requestSort('rate')}>
                    {Language.rate || 'Rating'} <span className="pp-sort">{sortIcon('rate')}</span>
                  </CTableHeaderCell>
                  <CTableHeaderCell className="text-end" onClick={() => requestSort('raters')}>
                    {Language.numberOfRaters || 'Raters'}{' '}
                    <span className="pp-sort">{sortIcon('raters')}</span>
                  </CTableHeaderCell>
                  <CTableHeaderCell className="text-end" onClick={() => requestSort('price')}>
                    {Language.price || 'Price'} <span className="pp-sort">{sortIcon('price')}</span>
                  </CTableHeaderCell>
                  <CTableHeaderCell className="text-end">
                    {Language.profit || 'Profit'}
                  </CTableHeaderCell>
                </CTableRow>
              </CTableHead>
              <CTableBody>
                {currentProducts.map((product) => {
                  const m = margins[String(product.productId)]
                  return (
                    <CTableRow key={product.productId}>
                      <CTableDataCell className="fw-semibold">{product.productName}</CTableDataCell>
                      <CTableDataCell className="text-end">
                        <span className={`pp-pill pp-pill-${getRatingTone(product.rate)}`}>
                          {Number(product.rate || 0).toFixed(2)}
                          <CIcon icon={cilStar} />
                        </span>
                      </CTableDataCell>
                      <CTableDataCell className="text-end">{product.raters ?? 0}</CTableDataCell>
                      <CTableDataCell className="text-end">
                        {Number(product.price || 0).toFixed(2)} TND
                      </CTableDataCell>
                      <CTableDataCell className="text-end">
                        {!m ? (
                          <span className="text-muted">—</span>
                        ) : m.avgUnitCost == null ? (
                          <span className="pp-pill pp-pill-warning">
                            {Language.noRecipe || 'No recipe'}
                          </span>
                        ) : (
                          <>
                            <span
                              className={`pp-pill pp-pill-${
                                m.marginPercent >= 40
                                  ? 'success'
                                  : m.marginPercent >= 20
                                    ? 'info'
                                    : 'warning'
                              }`}
                            >
                              {Number(m.marginPercent || 0).toFixed(0)}%
                            </span>
                            <div className="small text-muted">
                              {Number(m.profit || 0).toFixed(2)} TND
                            </div>
                          </>
                        )}
                      </CTableDataCell>
                    </CTableRow>
                  )
                })}
              </CTableBody>
            </CTable>
          </div>

          <div className="pp-pagination">
            <div className="pp-page-info">
              {Language.showing || 'Showing'}{' '}
              <strong>
                {firstIndex + 1}–{Math.min(lastIndex, sorted.length)}
              </strong>{' '}
              {Language.of || 'of'} <strong>{sorted.length}</strong>{' '}
              {Language.products || 'products'}
            </div>

            <CPagination>
              <CPaginationItem
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={safePage === 1}
                aria-label="Previous"
              >
                &laquo;
              </CPaginationItem>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum
                if (totalPages <= 5) pageNum = i + 1
                else if (safePage <= 3) pageNum = i + 1
                else if (safePage >= totalPages - 2) pageNum = totalPages - 4 + i
                else pageNum = safePage - 2 + i
                return (
                  <CPaginationItem
                    key={pageNum}
                    active={pageNum === safePage}
                    onClick={() => setCurrentPage(pageNum)}
                  >
                    {pageNum}
                  </CPaginationItem>
                )
              })}
              <CPaginationItem
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage === totalPages}
                aria-label="Next"
              >
                &raquo;
              </CPaginationItem>
            </CPagination>
          </div>
        </>
      )}
    </div>
  )
}

export default ProductsRate
