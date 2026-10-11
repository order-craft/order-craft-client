import React, { useEffect, useMemo, useState } from 'react'
import { CCard, CCardBody, CButton, CFormSwitch, CSpinner } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilSearch, cilFilter, cilReload, cilWarning } from '@coreui/icons'
import axios from 'axios'
import { GetToken } from '../../helpers/GetToken'
import { BaseUrl } from '../../helpers/BaseUrl'
import { useSelector } from 'react-redux'
import translations from '../../app/Language'
import './products.css'

const ITEMS_PER_PAGE = 10

/* Deterministic color per product for the placeholder fallback */
const placeholderColors = [
  '#0d6efd',
  '#6610f2',
  '#d63384',
  '#fd7e14',
  '#198754',
  '#20c997',
  '#0dcaf0',
]
const colorFor = (id) => {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0
  return placeholderColors[Math.abs(h) % placeholderColors.length]
}

const ProductList = () => {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(false)
  const [busyIds, setBusyIds] = useState(new Set())
  const [search, setSearch] = useState('')
  const [availabilityFilter, setAvailabilityFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [error, setError] = useState('')

  const token = GetToken()
  const t = useSelector((state) => state.language)
  const Language = translations[t]

  /* ---------- data ---------- */
  const fetchProducts = async () => {
    setLoading(true)
    setError('')
    try {
      const response = await axios.get(`${BaseUrl}/products`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setProducts(response.data)
    } catch (err) {
      setError(Language.fetchError || 'Failed to fetch products')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProducts()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* ---------- toggle (optimistic) ---------- */
  const toggleAvailability = async (productId, currentAvailability) => {
    const next = !currentAvailability

    // Optimistically update
    setProducts((prev) => prev.map((p) => (p._id === productId ? { ...p, available: next } : p)))
    setBusyIds((prev) => {
      const s = new Set(prev)
      s.add(productId)
      return s
    })

    try {
      await axios.put(
        `${BaseUrl}/products/${productId}/availability`,
        { available: next },
        { headers: { Authorization: `Bearer ${token}` } },
      )
    } catch (err) {
      // Revert on failure
      setProducts((prev) =>
        prev.map((p) => (p._id === productId ? { ...p, available: currentAvailability } : p)),
      )
      setError(err.response?.data?.error || Language.updateError || 'Failed to update availability')
      setTimeout(() => setError(''), 5000)
    } finally {
      setBusyIds((prev) => {
        const s = new Set(prev)
        s.delete(productId)
        return s
      })
    }
  }

  /* ---------- derived ---------- */
  const filteredProducts = useMemo(() => {
    let result = products

    if (search.trim()) {
      const q = search.trim().toLowerCase()
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.description && p.description.toLowerCase().includes(q)),
      )
    }

    if (availabilityFilter !== 'all') {
      const available = availabilityFilter === 'available'
      result = result.filter((p) => p.available === available)
    }

    return result
  }, [products, search, availabilityFilter])

  const totalProducts = products.length
  const totalAvailable = products.filter((p) => p.available).length
  const totalUnavailable = totalProducts - totalAvailable

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / ITEMS_PER_PAGE))
  const safePage = Math.min(currentPage, totalPages)
  const indexOfLastItem = safePage * ITEMS_PER_PAGE
  const indexOfFirstItem = indexOfLastItem - ITEMS_PER_PAGE
  const currentItems = filteredProducts.slice(indexOfFirstItem, indexOfLastItem)

  // Reset page if filter shrinks the list below current page
  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(1)
  }, [totalPages, currentPage])

  const clearFilters = () => {
    setSearch('')
    setAvailabilityFilter('all')
    setCurrentPage(1)
  }

  /* ---------- render ---------- */
  return (
    <CCard>
      <CCardBody>
        {/* ---- Section top strip ---- */}
        <div className="pl-top">
          <div className="pl-top-left">
            <h5 className="pl-title">{Language.productManagement || 'Product availability'}</h5>
            <div className="pl-meta">
              <strong>{totalProducts}</strong> {totalProducts === 1 ? 'product' : 'products'}
              {' · '}
              <strong>{totalAvailable}</strong> available
              {' · '}
              <strong>{totalUnavailable}</strong> unavailable
            </div>
          </div>

          <div className="pl-top-right">
            <div className="pl-search">
              <CIcon icon={cilSearch} className="pl-search-icon" />
              <input
                type="text"
                placeholder={`${Language.search || 'Search'} ${Language.products || 'products'}`}
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setCurrentPage(1)
                }}
              />
            </div>

            <div className="pl-filter">
              <CIcon icon={cilFilter} className="pl-filter-icon" />
              <select
                value={availabilityFilter}
                onChange={(e) => {
                  setAvailabilityFilter(e.target.value)
                  setCurrentPage(1)
                }}
                aria-label="Filter by availability"
              >
                <option value="all">{Language.allStatuses || 'All statuses'}</option>
                <option value="available">{Language.available || 'Available'}</option>
                <option value="unavailable">{Language.unavailable || 'Unavailable'}</option>
              </select>
            </div>

            <CButton color="secondary" variant="outline" onClick={fetchProducts} disabled={loading}>
              <CIcon icon={cilReload} />
            </CButton>
          </div>
        </div>

        {error && (
          <div className="alert alert-danger mb-3" role="alert">
            {error}
          </div>
        )}

        {/* ---- Content ---- */}
        {loading && products.length === 0 ? (
          <div className="text-center py-5">
            <CSpinner color="primary" />
            <div className="mt-3">{Language.loading || 'Loading products...'}</div>
          </div>
        ) : products.length === 0 ? (
          <div className="pl-empty">
            <CIcon icon={cilWarning} size="xl" />
            <div className="pl-empty-title">{Language.noProductsFound || 'No products'}</div>
            <div className="pl-empty-body">
              {Language.noProductsYetHint || 'Add products to a menu category to see them here.'}
            </div>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="pl-empty">
            <CIcon icon={cilSearch} size="xl" />
            <div className="pl-empty-title">{Language.noProductsMatch || 'No products match'}</div>
            <div className="pl-empty-body">
              {Language.noProductsMatchHint || 'Try a different search or clear filters.'}
            </div>
            <CButton color="primary" onClick={clearFilters}>
              {Language.clearFilters || 'Clear filters'}
            </CButton>
          </div>
        ) : (
          <>
            <div className="pl-list">
              {currentItems.map((product) => {
                const busy = busyIds.has(product._id)
                const fallbackColor = colorFor(product._id)
                return (
                  <div className={`pl-row ${busy ? 'is-busy' : ''}`} key={product._id}>
                    <div className="pl-thumb">
                      {product.img ? (
                        <img src={product.img} alt={product.name} />
                      ) : (
                        <div className="pl-thumb-fallback" style={{ background: fallbackColor }}>
                          {(product.name || '?').charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>

                    <div className="pl-info">
                      <p className="pl-name">{product.name}</p>
                      {product.description && <div className="pl-desc">{product.description}</div>}
                    </div>

                    <div className="pl-price">{Number(product.price || 0).toFixed(2)} TND</div>

                    <div className="pl-toggle">
                      <span className={`pl-toggle-label ${product.available ? '' : 'is-off'}`}>
                        {product.available
                          ? Language.available || 'Available'
                          : Language.unavailable || 'Unavailable'}
                      </span>
                      {busy ? (
                        <CSpinner size="sm" />
                      ) : (
                        <CFormSwitch
                          checked={!!product.available}
                          onChange={() => toggleAvailability(product._id, product.available)}
                          aria-label="Toggle availability"
                        />
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="pl-pagination">
              <div className="pl-page-info">
                {Language.showing || 'Showing'}{' '}
                <strong>
                  {indexOfFirstItem + 1}–{Math.min(indexOfLastItem, filteredProducts.length)}
                </strong>{' '}
                {Language.of || 'of'} <strong>{filteredProducts.length}</strong>{' '}
                {Language.products || 'products'}
              </div>

              <div className="pl-page-buttons">
                <CButton
                  color="secondary"
                  variant="outline"
                  size="sm"
                  disabled={safePage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                >
                  {Language.previous || 'Previous'}
                </CButton>
                <CButton
                  color="secondary"
                  variant="outline"
                  size="sm"
                  disabled={safePage === totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                >
                  {Language.next || 'Next'}
                </CButton>
              </div>
            </div>
          </>
        )}
      </CCardBody>
    </CCard>
  )
}

export default ProductList
