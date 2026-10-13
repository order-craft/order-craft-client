import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  CButton,
  CCard,
  CCardBody,
  CModal,
  CFormInput,
  CFormTextarea,
  CFormSwitch,
  CFormFeedback,
  CSpinner,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import {
  cilSearch,
  cilPlus,
  cilPencil,
  cilTrash,
  cilFastfood,
  cilWarning,
  cilChevronLeft,
  cilCloudUpload,
} from '@coreui/icons'
import axios from 'axios'
import { BaseUrl } from '../../helpers/BaseUrl'
import { useSelector } from 'react-redux'
import translations from '../../app/Language'
import './product.css'

const CategoryDetails = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const t = useSelector((state) => state.language)
  const Language = translations[t]

  const [category, setCategory] = useState(null)
  const [section, setSection] = useState(null)
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [busyIds, setBusyIds] = useState(new Set())

  const [modalMode, setModalMode] = useState(null) // 'add' | 'edit' | null
  const [editingProduct, setEditingProduct] = useState(null)
  const [formError, setFormError] = useState('')
  const [tempSrc, setTempSrc] = useState(null)

  const [form, setForm] = useState({
    name: '',
    description: '',
    price: '',
    discountPercentage: 0,
    img: '',
  })

  const [confirmTarget, setConfirmTarget] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState(false)
  /* ---------- data ---------- */
  const fetchCategoryDetails = async () => {
    setLoading(true)
    setError('')
    try {
      const token = localStorage.getItem('token')
      const response = await axios.get(`${BaseUrl}/categories/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setCategory(response.data.category || response.data)
      setProducts(response.data.products || [])
    } catch (err) {
      setError(Language.fetchError || 'Error fetching category details')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (id) fetchCategoryDetails()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  /* ---------- derived ---------- */
  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return products
    const q = searchQuery.trim().toLowerCase()
    return products.filter((p) => (p.name || '').toLowerCase().includes(q))
  }, [products, searchQuery])

  const totals = useMemo(() => {
    let available = 0
    let discounted = 0
    products.forEach((p) => {
      if (p.available !== false) available++
      if (Number(p.discountPercentage) > 0) discounted++
    })
    return { available, discounted }
  }, [products])

  /* ---------- modal ---------- */
  const resetForm = () => {
    setForm({
      name: '',
      description: '',
      price: '',
      discountPercentage: 0,
      img: '',
    })
    setTempSrc(null)
    setEditingProduct(null)
    setFormError('')
    setModalMode(null)
  }

  const openAdd = () => {
    resetForm()
    setModalMode('add')
  }

  const openEdit = (product) => {
    setForm({
      name: product.name || '',
      description: product.description || '',
      price: String(product.price ?? ''),
      discountPercentage: product.discountPercentage || 0,
      img: product.img || '',
    })
    setTempSrc(product.img || null)
    setEditingProduct(product)
    setFormError('')
    setModalMode('edit')
  }

  const closeModal = () => {
    resetForm()
  }

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onloadend = () => {
      setTempSrc(reader.result)
      setForm((prev) => ({ ...prev, img: reader.result }))
    }
  }

  const handleSave = async () => {
    if (!form.name.trim()) {
      setFormError(Language.nameRequired || 'Name is required')
      return
    }
    if (!form.price || isNaN(Number(form.price))) {
      setFormError(Language.priceRequired || 'Valid price is required')
      return
    }

    setSubmitting(true)
    try {
      const token = localStorage.getItem('token')
      const url =
        modalMode === 'add' ? `${BaseUrl}/products` : `${BaseUrl}/products/${editingProduct._id}`
      const method = modalMode === 'add' ? 'post' : 'put'

      await axios[method](
        url,
        {
          ...form,
          price: Number(form.price),
          discountPercentage: Number(form.discountPercentage) || 0,
          categoryId: id,
        },
        { headers: { Authorization: `Bearer ${token}` } },
      )

      closeModal()
      fetchCategoryDetails()
    } catch (err) {
      setFormError(err.response?.data?.error || Language.saveError || 'Operation failed')
      console.error('Error saving product', err)
    } finally {
      setSubmitting(false)
    }
  }

  /* ---------- delete ---------- */
  const askDelete = (product) => {
    setConfirmTarget(product)
  }

  const confirmDelete = async () => {
    if (!confirmTarget) return
    setDeleting(true)
    try {
      const token = localStorage.getItem('token')
      await axios.delete(`${BaseUrl}/products/${confirmTarget._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setConfirmTarget(null)
      fetchCategoryDetails()
    } catch (err) {
      console.error('Error deleting product', err)
      setConfirmTarget(null)
    } finally {
      setDeleting(false)
    }
  }

  /* ---------- availability toggle ---------- */
  const toggleAvailability = async (product) => {
    const current = product.available !== false
    const next = !current

    // Optimistic
    setProducts((prev) => prev.map((p) => (p._id === product._id ? { ...p, available: next } : p)))
    setBusyIds((prev) => new Set(prev).add(product._id))

    try {
      const token = localStorage.getItem('token')
      await axios.put(
        `${BaseUrl}/products/${product._id}/availability`,
        { available: next },
        { headers: { Authorization: `Bearer ${token}` } },
      )
    } catch (err) {
      // Revert
      setProducts((prev) =>
        prev.map((p) => (p._id === product._id ? { ...p, available: current } : p)),
      )
      console.error('Error toggling availability', err)
    } finally {
      setBusyIds((prev) => {
        const next = new Set(prev)
        next.delete(product._id)
        return next
      })
    }
  }

  /* ---------- navigation ---------- */
  const goBack = () => navigate(-1)

  /* ---------- render ---------- */
  if (loading && !category) {
    return (
      <div className="text-center py-5">
        <CSpinner color="primary" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="alert alert-danger">{error}</div>
      </div>
    )
  }

  return (
    <CCard className="mb-4">
      {/* ---- Top strip ---- */}
      <div className="pd-header">
        <div className="pd-header-inner">
          <div className="pd-header-left">
            <div className="pd-breadcrumb">
              <CIcon
                icon={cilChevronLeft}
                onClick={goBack}
                style={{ cursor: 'pointer' }}
                aria-label="Back"
              />
              <span>{Language.menu || 'Menu'}</span>
              <span>·</span>
              <span>{category?.name || 'Category'}</span>
            </div>
            <h5 className="pd-title">{category?.name || Language.products || 'Products'}</h5>
            <div className="pd-subtitle">
              <strong>{products.length}</strong> {products.length === 1 ? 'product' : 'products'}
              {' · '}
              <strong>{totals.available}</strong> available
              {totals.discounted > 0 && (
                <>
                  {' · '}
                  <strong>{totals.discounted}</strong> on discount
                </>
              )}
            </div>
          </div>

          <div className="pd-header-right">
            <div className="pd-search">
              <CIcon icon={cilSearch} className="pd-search-icon" />
              <input
                type="text"
                placeholder={Language.searchProducts || 'Search products...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <CButton color="primary" onClick={openAdd}>
              <CIcon icon={cilPlus} className="me-2" />
              {Language.addNewProduct || 'New product'}
            </CButton>
          </div>
        </div>
      </div>

      {/* ---- Grid ---- */}
      <CCardBody className="p-0">
        <div className="pd-grid">
          {products.length === 0 ? (
            <div className="pd-empty">
              <CIcon icon={cilFastfood} size="xl" />
              <div className="pd-empty-title">{Language.noProductsYet || 'No products yet'}</div>
              <div className="pd-empty-body">
                {Language.noProductsHint || 'Add the items customers can order from this category.'}
              </div>
              <CButton color="primary" onClick={openAdd}>
                <CIcon icon={cilPlus} className="me-2" />
                {Language.addNewProduct || 'New product'}
              </CButton>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="pd-empty">
              <CIcon icon={cilWarning} size="xl" />
              <div className="pd-empty-title">
                {Language.noProductsMatch || 'No products match'}
              </div>
              <div className="pd-empty-body">
                {Language.noProductsMatchHint || 'Try a different search term.'}
              </div>
            </div>
          ) : (
            filteredProducts.map((product) => {
              const discount = Number(product.discountPercentage) || 0
              const raw = Number(product.price) || 0
              const finalPrice = discount > 0 ? raw * (1 - discount / 100) : raw
              const available = product.available !== false
              const busy = busyIds.has(product._id)

              return (
                <div key={product._id} className={`pd-card ${available ? '' : 'is-unavailable'}`}>
                  <div className="pd-image-wrap">
                    {product.img ? (
                      <img src={product.img} alt={product.name} className="pd-image" />
                    ) : (
                      <div className="pd-image-placeholder">
                        {(product.name || '?').charAt(0).toUpperCase()}
                      </div>
                    )}

                    {discount > 0 && available && <div className="pd-discount">-{discount}%</div>}

                    {!available && (
                      <div className="pd-unavailable-veil">
                        {Language.unavailable || 'Unavailable'}
                      </div>
                    )}
                  </div>

                  <div className="pd-body">
                    <p className="pd-name">{product.name}</p>
                    {product.description && <div className="pd-desc">{product.description}</div>}
                    <div className="pd-price-row">
                      <span className="pd-price-final">{finalPrice.toFixed(2)} TND</span>
                      {discount > 0 && <span className="pd-price-original">{raw.toFixed(2)}</span>}
                    </div>
                  </div>

                  <div className="pd-actions">
                    <div className="pd-actions-left">
                      {busy ? (
                        <CSpinner size="sm" />
                      ) : (
                        <CFormSwitch
                          checked={available}
                          onChange={() => toggleAvailability(product)}
                          aria-label="Toggle availability"
                        />
                      )}
                      <span>
                        {available
                          ? Language.available || 'Available'
                          : Language.unavailable || 'Unavailable'}
                      </span>
                    </div>
                    <div className="pd-actions-right">
                      <CButton
                        color="secondary"
                        variant="outline"
                        size="sm"
                        onClick={() => openEdit(product)}
                        aria-label="Edit product"
                      >
                        <CIcon icon={cilPencil} />
                      </CButton>
                      <CButton
                        color="danger"
                        variant="outline"
                        size="sm"
                        onClick={() => askDelete(product)}
                        aria-label="Delete product"
                      >
                        <CIcon icon={cilTrash} />
                      </CButton>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </CCardBody>

      {/* ---- Add / Edit modal ---- */}
      <CModal
        visible={!!modalMode}
        onClose={closeModal}
        size="lg"
        backdrop="static"
        className="pd-modal"
      >
        <div className="pd-modal-header">
          <h5 className="pd-modal-title">
            <CIcon icon={modalMode === 'edit' ? cilPencil : cilPlus} />
            {modalMode === 'edit'
              ? Language.editProduct || 'Edit product'
              : Language.addNewProduct || 'New product'}
          </h5>
          <button className="pd-modal-close" onClick={closeModal} aria-label="Close" type="button">
            &times;
          </button>
        </div>

        <div className="pd-modal-body">
          {/* Basic info */}
          <div className="pd-form-section">
            <div className="pd-form-section-title">{Language.basicInfo || 'Basic info'}</div>

            <div className="pd-field">
              <label htmlFor="pd-name">{Language.name || 'Name'}</label>
              <CFormInput
                id="pd-name"
                value={form.name}
                autoFocus
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Cappuccino"
              />
            </div>

            <div className="pd-field">
              <label htmlFor="pd-desc">{Language.description || 'Description'}</label>
              <CFormTextarea
                id="pd-desc"
                rows={3}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Short description"
              />
            </div>
          </div>

          {/* Pricing */}
          <div className="pd-form-section">
            <div className="pd-form-section-title">{Language.pricing || 'Pricing'}</div>

            <div className="pd-row-2">
              <div className="pd-field">
                <label htmlFor="pd-price">{Language.price || 'Price'} (TND)</label>
                <CFormInput
                  id="pd-price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  placeholder="0.00"
                />
              </div>
              <div className="pd-field">
                <label htmlFor="pd-discount">{Language.discountPercentage || 'Discount'} (%)</label>
                <CFormInput
                  id="pd-discount"
                  type="number"
                  step="1"
                  min="0"
                  max="100"
                  value={form.discountPercentage}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      discountPercentage: e.target.value,
                    })
                  }
                  placeholder="0"
                />
              </div>
            </div>
          </div>

          {/* Image */}
          <div className="pd-form-section">
            <div className="pd-form-section-title">{Language.image || 'Image'}</div>

            <label className="pd-upload" htmlFor="pd-upload">
              {tempSrc ? (
                <img src={tempSrc} alt="Preview" className="pd-upload-preview" />
              ) : (
                <>
                  <CIcon icon={cilCloudUpload} size="xl" className="mb-2 text-muted" />
                  <div className="pd-upload-hint">
                    {Language.clickToUpload || 'Click to upload product image'}
                  </div>
                </>
              )}
              <input
                id="pd-upload"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
            </label>
          </div>

          {formError && (
            <CFormFeedback invalid className="d-block mt-3">
              {formError}
            </CFormFeedback>
          )}
        </div>

        <div className="pd-modal-footer">
          <CButton color="secondary" variant="outline" onClick={closeModal} disabled={submitting}>
            {Language.cancel || 'Cancel'}
          </CButton>
          <CButton color="primary" onClick={handleSave} disabled={submitting}>
            {submitting ? (
              <>
                <CSpinner size="sm" className="me-2" />
                {Language.saving || 'Saving…'}
              </>
            ) : modalMode === 'edit' ? (
              Language.saveChanges || 'Save'
            ) : (
              Language.create || 'Create'
            )}
          </CButton>
        </div>
      </CModal>

      {/* ---- Confirm delete ---- */}
      <CModal
        visible={!!confirmTarget}
        onClose={() => setConfirmTarget(null)}
        backdrop="static"
        className="pd-modal"
      >
        <div className="pd-confirm-body">
          <div className="pd-confirm-icon">
            <CIcon icon={cilTrash} />
          </div>
          <div className="pd-confirm-title">{Language.deleteProduct || 'Delete product'}</div>
          <div className="pd-confirm-text">
            {Language.deleteProductConfirm ||
              'This will permanently remove the product from the menu. This cannot be undone.'}
          </div>
        </div>
        <div className="pd-modal-footer">
          <CButton
            color="secondary"
            variant="outline"
            onClick={() => setConfirmTarget(null)}
            disabled={deleting}
          >
            {Language.cancel || 'Cancel'}
          </CButton>
          <CButton color="danger" onClick={confirmDelete} disabled={deleting}>
            {deleting ? (
              <>
                <CSpinner size="sm" className="me-2" />
                {Language.deleting || 'Deleting…'}
              </>
            ) : (
              <>
                <CIcon icon={cilTrash} className="me-2" />
                {Language.delete || 'Delete'}
              </>
            )}
          </CButton>
        </div>
      </CModal>
    </CCard>
  )
}

export default CategoryDetails
