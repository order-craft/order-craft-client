import React, { useEffect, useMemo, useState } from 'react'
import { CButton, CFormSwitch, CSpinner } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilSearch, cilReload, cilWarning } from '@coreui/icons'
import axios from 'axios'
import { GetToken } from '../../helpers/GetToken'
import { BaseUrl } from '../../helpers/BaseUrl'
import { useSelector } from 'react-redux'
import translations from '../../app/Language'
import { ACCENTS } from '../../helpers/palette'
import './products.css'

/* Deterministic color per product for the placeholder fallback */
const placeholderColors = ACCENTS
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

  /* ---------- category grouping ---------- */
  // Products carry no category of their own; the admin menu tree does. Staff
  // accounts can't read that endpoint, so they simply get one flat group.
  const [categoryOf, setCategoryOf] = useState({})
  useEffect(() => {
    let cancelled = false
    axios
      .get(`${BaseUrl}/menu/admin`, { headers: { Authorization: `Bearer ${token}` } })
      .then(({ data }) => {
        if (cancelled) return
        const map = {}
        ;(data?.sections || []).forEach((section) =>
          (section.categories || []).forEach((cat, ci) =>
            (cat.products || []).forEach((p) => {
              const id = p?._id || p
              if (!map[id]) {
                map[id] = {
                  key: cat._id || `${section._id}-${ci}`,
                  name: cat.name,
                  section: section.name,
                }
              }
            }),
          ),
        )
        setCategoryOf(map)
      })
      .catch(() => {
        /* not an admin, or no menu yet: keep the flat list */
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
      result = result.filter((p) => !!p.available === available)
    }
    return result
  }, [products, search, availabilityFilter])

  const totalProducts = products.length
  const totalAvailable = products.filter((p) => p.available).length
  const totalUnavailable = totalProducts - totalAvailable
  const soldOut = products.filter((p) => !p.available)

  const groups = useMemo(() => {
    const byKey = new Map()
    filteredProducts.forEach((p) => {
      const cat = categoryOf[p._id]
      const key = cat ? cat.key : '__other__'
      if (!byKey.has(key)) {
        byKey.set(key, {
          key,
          name: cat ? cat.name : null,
          section: cat ? cat.section : null,
          items: [],
        })
      }
      byKey.get(key).items.push(p)
    })
    // Menu order first (insertion order follows the products list); "other" last.
    return [...byKey.values()].sort((a, b) =>
      a.key === '__other__' ? 1 : b.key === '__other__' ? -1 : 0,
    )
  }, [filteredProducts, categoryOf])

  const hasCategories = Object.keys(categoryOf).length > 0

  const clearFilters = () => {
    setSearch('')
    setAvailabilityFilter('all')
  }

  const priceOf = (p) => {
    const price = Number(p.price || 0)
    const disc = Number(p.discountPercentage || 0)
    return { final: disc > 0 ? price * (1 - disc / 100) : price, original: price, disc }
  }

  /* ---------- render ---------- */
  return (
    <div className="oc-stack">
      {/* ---- Toolbar ---- */}
      <div className="oc-toolbar">
        <div className="oc-toolbar-group">
          <div className="oc-seg" role="group" aria-label="Filter by availability">
            {[
              ['all', Language.tlAll || 'All', totalProducts],
              ['available', Language.avOnMenu || 'On menu', totalAvailable],
              ['unavailable', Language.avSoldOut || 'Sold out', totalUnavailable],
            ].map(([key, label, count]) => (
              <button
                key={key}
                type="button"
                className={availabilityFilter === key ? 'is-active' : ''}
                onClick={() => setAvailabilityFilter(key)}
              >
                {label}
                <span className="oc-seg-count">{count}</span>
              </button>
            ))}
          </div>
          <label className="oc-search">
            <CIcon icon={cilSearch} width={15} />
            <input
              type="text"
              placeholder={`${Language.search || 'Search'} ${Language.products || 'products'}`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search products"
            />
          </label>
        </div>
        <button
          type="button"
          className="oc-icon-btn"
          onClick={fetchProducts}
          disabled={loading}
          aria-label="Refresh"
          title="Refresh"
        >
          {loading ? <CSpinner size="sm" /> : <CIcon icon={cilReload} />}
        </button>
      </div>

      {error && (
        <div className="alert alert-danger mb-0" role="alert">
          {error}
        </div>
      )}

      {/* ---- Sold out right now: the list staff restore from mid-service ---- */}
      {products.length > 0 &&
        (soldOut.length > 0 ? (
          <section
            className="av-soldout"
            aria-label={Language.avSoldOutNow || 'Sold out right now'}
          >
            <div className="av-soldout-head">
              <span className="av-soldout-title">
                {Language.avSoldOutNow || 'Sold out right now'}
                <span className="av-soldout-count">{soldOut.length}</span>
              </span>
              <span className="av-soldout-hint">
                {Language.avSoldOutHint || 'Guests can’t order these until you put them back.'}
              </span>
            </div>
            <div className="av-soldout-list">
              {soldOut.map((p) => (
                <span key={p._id} className="av-chip">
                  {p.name}
                  <button
                    type="button"
                    onClick={() => toggleAvailability(p._id, p.available)}
                    disabled={busyIds.has(p._id)}
                  >
                    {busyIds.has(p._id) ? (
                      <CSpinner size="sm" />
                    ) : (
                      Language.avBackOn || 'Back on menu'
                    )}
                  </button>
                </span>
              ))}
            </div>
          </section>
        ) : (
          availabilityFilter === 'all' &&
          !search && (
            <p className="av-allgood">
              {Language.avAllAvailable || 'Everything on the menu is available.'}
            </p>
          )
        ))}

      {/* ---- Products by category ---- */}
      {loading && products.length === 0 ? (
        <div className="oc-panel oc-empty">
          <CSpinner color="primary" size="sm" />
        </div>
      ) : products.length === 0 ? (
        <div className="oc-panel oc-empty">
          <span className="oc-empty-icon">
            <CIcon icon={cilWarning} />
          </span>
          <span className="oc-empty-title">{Language.noProductsFound || 'No products'}</span>
          <span className="oc-empty-body">
            {Language.noProductsYetHint || 'Add products to a menu category to see them here.'}
          </span>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="oc-panel oc-empty">
          <span className="oc-empty-icon">
            <CIcon icon={cilSearch} />
          </span>
          <span className="oc-empty-title">{Language.noProductsMatch || 'No products match'}</span>
          <span className="oc-empty-body">
            {Language.noProductsMatchHint || 'Try a different search or clear filters.'}
          </span>
          <CButton color="primary" className="mt-2" onClick={clearFilters}>
            {Language.clearFilters || 'Clear filters'}
          </CButton>
        </div>
      ) : (
        groups.map((group) => {
          const off = group.items.filter((p) => !p.available).length
          return (
            <section key={group.key} className="av-group">
              <header className="av-group-head">
                <h3 className="av-group-title">
                  {group.name ||
                    (hasCategories
                      ? Language.avOther || 'Other products'
                      : Language.products || 'Products')}
                </h3>
                {group.section && <span className="av-group-section">{group.section}</span>}
                <span className="av-group-meta">
                  {group.items.length}
                  {off > 0 && (
                    <b>
                      {' · '}
                      {off} {(Language.avSoldOut || 'Sold out').toLowerCase()}
                    </b>
                  )}
                </span>
              </header>
              <div className="av-grid">
                {group.items.map((product) => {
                  const busy = busyIds.has(product._id)
                  const { final, original, disc } = priceOf(product)
                  return (
                    <div
                      key={product._id}
                      className={`av-item ${product.available ? '' : 'is-off'} ${busy ? 'is-busy' : ''}`}
                    >
                      <div className="av-thumb">
                        {product.img ? (
                          <img src={product.img} alt="" />
                        ) : (
                          <span style={{ background: colorFor(product._id) }}>
                            {(product.name || '?').charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="av-info">
                        <span className="av-name">{product.name}</span>
                        <span className="av-price">
                          {final.toFixed(2)} TND
                          {disc > 0 && <s>{original.toFixed(2)}</s>}
                        </span>
                      </div>
                      <label className="av-switch">
                        <span className={product.available ? 'is-on' : 'is-off'}>
                          {product.available
                            ? Language.avOnMenu || 'On menu'
                            : Language.avSoldOut || 'Sold out'}
                        </span>
                        {busy ? (
                          <CSpinner size="sm" />
                        ) : (
                          <CFormSwitch
                            checked={!!product.available}
                            onChange={() => toggleAvailability(product._id, product.available)}
                            aria-label={`${product.name}: ${
                              product.available
                                ? Language.avOnMenu || 'On menu'
                                : Language.avSoldOut || 'Sold out'
                            }`}
                          />
                        )}
                      </label>
                    </div>
                  )
                })}
              </div>
            </section>
          )
        })
      )}
    </div>
  )
}

export default ProductList
