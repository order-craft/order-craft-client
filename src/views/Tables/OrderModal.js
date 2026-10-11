// ManualOrderModal.jsx
import { useState, useEffect, useMemo } from 'react'
import { CAlert, CButton, CModal, CSpinner } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import {
  cilCart,
  cilSearch,
  cilCheck,
  cilX,
  cilWarning,
  cilPlus,
  cilMinus,
  cilChevronLeft,
  cilChevronRight,
} from '@coreui/icons'
import axios from 'axios'
import { BaseUrl } from '../../helpers/BaseUrl'
import { GetToken } from '../../helpers/GetToken'
import { useSelector } from 'react-redux'
import translations from '../../app/Language'
import './ManualOrderModal.css'

const ITEMS_PER_PAGE = 8

const ManualOrderModal = ({
  visible,
  onClose,
  tableId,
  onOrderPlaced,
  enableOrderType = false,
}) => {
  const [modalProducts, setModalProducts] = useState([])
  const [productSearchQuery, setProductSearchQuery] = useState('')
  const [selectedProducts, setSelectedProducts] = useState([])
  const [orderType, setOrderType] = useState('to-go')
  const [currentPage, setCurrentPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const token = GetToken()
  const t = useSelector((state) => state.language)
  const Language = translations[t]

  const resetForm = () => {
    setProductSearchQuery('')
    setSelectedProducts([])
    setOrderType('to-go')
    setCurrentPage(1)
    setError(null)
  }

  useEffect(() => {
    if (visible) fetchProducts()
  }, [visible])

  const fetchProducts = async () => {
    setError(null)
    try {
      const { data } = await axios.get(`${BaseUrl}/products`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setModalProducts(data)
    } catch (err) {
      console.error('Error fetching products', err)
      setError(Language.errorFetchingProducts || 'Error fetching products')
    }
  }

  const filteredProducts = useMemo(
    () =>
      modalProducts.filter((p) => p.name.toLowerCase().includes(productSearchQuery.toLowerCase())),
    [modalProducts, productSearchQuery],
  )

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / ITEMS_PER_PAGE))
  const indexOfLastProduct = currentPage * ITEMS_PER_PAGE
  const indexOfFirstProduct = indexOfLastProduct - ITEMS_PER_PAGE
  const currentProducts = filteredProducts.slice(indexOfFirstProduct, indexOfLastProduct)

  const paginate = (pageNumber) => setCurrentPage(Math.min(Math.max(pageNumber, 1), totalPages))

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(1)
  }, [totalPages, currentPage])

  /* ----- selection helpers ----- */
  const getSelected = (productId) => selectedProducts.find((p) => p.productId === productId)

  const handleRowClick = (productId) => {
    // Tap on empty row = select qty 1. Tap on selected row = no-op.
    if (getSelected(productId)) return
    setSelectedProducts((prev) => [...prev, { productId, quantity: 1 }])
  }

  const handleProductSelect = (productId) => {
    setSelectedProducts((prev) => {
      const exists = prev.find((p) => p.productId === productId)
      if (exists) return prev.filter((p) => p.productId !== productId)
      return [...prev, { productId, quantity: 1 }]
    })
  }

  const changeQuantity = (productId, delta) => {
    setSelectedProducts((prev) => {
      const existing = prev.find((p) => p.productId === productId)
      if (!existing) {
        // Auto-select with qty 1 when incrementing an unselected row
        if (delta > 0) return [...prev, { productId, quantity: 1 }]
        return prev
      }
      const nextQty = existing.quantity + delta
      if (nextQty <= 0) {
        return prev.filter((p) => p.productId !== productId)
      }
      return prev.map((p) => (p.productId === productId ? { ...p, quantity: nextQty } : p))
    })
  }

  const selectedCount = selectedProducts.length
  const totalUnits = selectedProducts.reduce((a, b) => a + b.quantity, 0)

  const selectedTotal = useMemo(() => {
    return selectedProducts.reduce((acc, sel) => {
      const product = modalProducts.find((p) => p._id === sel.productId)
      if (!product) return acc
      const discount = product.discountPercentage || 0
      const unit = discount > 0 ? product.price * (1 - discount / 100) : product.price
      return acc + unit * sel.quantity
    }, 0)
  }, [selectedProducts, modalProducts])

  const handlePlaceOrder = async () => {
    setError(null)
    if (selectedProducts.length === 0) {
      setError(Language.pleaseSelectItems || 'Please select at least one item')
      return
    }
    setLoading(true)
    try {
      const products = selectedProducts.map((p) => ({
        product: p.productId,
        quantity: p.quantity,
      }))
      const payload = { products, orderType: 'dine-in' }
      if (enableOrderType) {
        payload.orderType = orderType
      } else if (tableId) {
        payload.tableId = tableId
      }
      await axios.post(`${BaseUrl}/order/manual`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      })
      onOrderPlaced(enableOrderType ? orderType : undefined)
      resetForm()
      onClose()
    } catch (err) {
      console.error('Error placing order', err)
      const msg = err.response?.data?.error || Language.errorPlacingOrder || 'Error placing order'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  return (
    <CModal
      visible={visible}
      onClose={handleClose}
      size="lg"
      backdrop="static"
      className="mom-modal"
    >
      {/* ---- Header ---- */}
      <div className="mom-header">
        <div>
          <h5 className="mom-header-title">
            <CIcon icon={cilCart} />
            {Language.selectProducts || 'Select Products'}
          </h5>
          <div className="mom-header-summary">
            <strong>{totalUnits}</strong> {totalUnits === 1 ? 'item' : 'items'} ·{' '}
            <strong>{selectedTotal.toFixed(2)} TND</strong>
          </div>
        </div>
        <button className="mom-close" onClick={handleClose} aria-label="Close" type="button">
          &times;
        </button>
      </div>

      {/* ---- Body ---- */}
      <div className="mom-body">
        {error && (
          <CAlert color="danger" className="mb-3">
            {error}
          </CAlert>
        )}

        {/* Order-type segmented control */}
        {enableOrderType && (
          <div className="mom-segments" role="tablist">
            <button
              type="button"
              className={`mom-segment ${orderType === 'to-go' ? 'is-active' : ''}`}
              onClick={() => setOrderType('to-go')}
            >
              {Language.togo || 'To-go'}
            </button>
            <button
              type="button"
              className={`mom-segment ${orderType === 'delivery' ? 'is-active' : ''}`}
              onClick={() => setOrderType('delivery')}
            >
              {Language.delivery || 'Delivery'}
            </button>
          </div>
        )}

        {/* Search */}
        <div className="mom-search">
          <CIcon icon={cilSearch} className="mom-search-icon" />
          <input
            type="text"
            placeholder={`${Language.search || 'Search'} ${Language.products || 'products'}`}
            value={productSearchQuery}
            onChange={(e) => {
              setProductSearchQuery(e.target.value)
              setCurrentPage(1)
            }}
            aria-label="Search products"
          />
        </div>

        {/* Product list */}
        <div className="mom-list">
          {currentProducts.length === 0 ? (
            <div className="mom-empty">
              <CIcon icon={cilWarning} size="xl" />
              <div>{Language.noProductsFound || 'No products found'}</div>
            </div>
          ) : (
            currentProducts.map((product) => {
              const selected = getSelected(product._id)
              const qty = selected?.quantity || 0
              const discount = product.discountPercentage || 0
              const unitPrice = discount > 0 ? product.price * (1 - discount / 100) : product.price

              return (
                <div
                  key={product._id}
                  className={`mom-row ${selected ? 'is-selected' : ''}`}
                  onClick={() => handleRowClick(product._id)}
                >
                  <div className="mom-row-main">
                    <p className="mom-row-name">{product.name}</p>
                    {product.description && (
                      <div className="mom-row-desc">{product.description}</div>
                    )}
                    <div className="mom-row-price">
                      {discount > 0 ? (
                        <>
                          <span className="mom-strike">{product.price.toFixed(2)} TND</span>
                          <span className="mom-final">{unitPrice.toFixed(2)} TND</span>
                          <span className="mom-badge">-{discount}%</span>
                        </>
                      ) : (
                        <span>{unitPrice.toFixed(2)} TND</span>
                      )}
                    </div>
                  </div>

                  <div className="mom-row-actions" onClick={(e) => e.stopPropagation()}>
                    {selected ? (
                      <div className="mom-stepper">
                        <button
                          type="button"
                          onClick={() => changeQuantity(product._id, -1)}
                          aria-label="Decrease"
                        >
                          <CIcon icon={cilMinus} size="sm" />
                        </button>
                        <span className="mom-stepper-value">{qty}</span>
                        <button
                          type="button"
                          onClick={() => changeQuantity(product._id, +1)}
                          aria-label="Increase"
                        >
                          <CIcon icon={cilPlus} size="sm" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="mom-add-btn"
                        onClick={() => handleProductSelect(product._id)}
                      >
                        + Add
                      </button>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mom-pagination">
            <button
              type="button"
              onClick={() => paginate(currentPage - 1)}
              disabled={currentPage === 1}
              aria-label="Previous page"
            >
              <CIcon icon={cilChevronLeft} size="sm" />
            </button>
            <span className="mom-page-info">
              {currentPage} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => paginate(currentPage + 1)}
              disabled={currentPage === totalPages}
              aria-label="Next page"
            >
              <CIcon icon={cilChevronRight} size="sm" />
            </button>
          </div>
        )}
      </div>

      {/* ---- Footer ---- */}
      <div className="mom-footer">
        <div className="mom-footer-summary">
          <span className="mom-footer-summary-label">
            {Language.total || 'Total'} ({totalUnits} {totalUnits === 1 ? 'item' : 'items'})
          </span>
          <span className="mom-footer-summary-value">{selectedTotal.toFixed(2)} TND</span>
        </div>

        <div className="mom-footer-actions">
          <CButton color="secondary" variant="outline" onClick={handleClose} disabled={loading}>
            <CIcon icon={cilX} className="me-2" />
            {Language.close || 'Close'}
          </CButton>
          <CButton
            color="primary"
            onClick={handlePlaceOrder}
            disabled={loading || selectedProducts.length === 0}
          >
            {loading ? (
              <>
                <CSpinner size="sm" className="me-2" />
                {Language.loading || 'Loading'}
              </>
            ) : (
              <>
                <CIcon icon={cilCheck} className="me-2" />
                {Language.place} {Language.order}
              </>
            )}
          </CButton>
        </div>
      </div>
    </CModal>
  )
}

export default ManualOrderModal
