import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { CButton, CCard, CCardBody, CModal, CFormInput, CSpinner } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import {
  cilSearch,
  cilPlus,
  cilPencil,
  cilTrash,
  cilList,
  cilWarning,
  cilChevronLeft,
} from '@coreui/icons'
import axios from 'axios'
import { BaseUrl } from '../../../helpers/BaseUrl'
import { useSelector } from 'react-redux'
import translations from '../../../app/Language'
import './category.css'

/* deterministic color per category id */
const palette = [
  '#0d6efd',
  '#6610f2',
  '#d63384',
  '#fd7e14',
  '#198754',
  '#20c997',
  '#0dcaf0',
  '#e83e8c',
]
const colorFor = (id) => {
  let h = 0
  const s = String(id || '')
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return palette[Math.abs(h) % palette.length]
}

const SectionDetails = () => {
  const t = useSelector((state) => state.language)
  const Language = translations[t]

  const { sectionId } = useParams()
  const navigate = useNavigate()

  const [section, setSection] = useState(null)
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  const [modalMode, setModalMode] = useState(null) // 'add' | 'edit' | null
  const [editingCategory, setEditingCategory] = useState(null)
  const [formName, setFormName] = useState('')
  const [formError, setFormError] = useState('')

  const [confirmTarget, setConfirmTarget] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState(false)
  /* ---------- data ---------- */
  const fetchCategories = async () => {
    setLoading(true)
    setError('')
    try {
      const token = localStorage.getItem('token')
      const response = await axios.get(`${BaseUrl}/sections/${sectionId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setSection(response.data)
      setCategories(response.data.categories || [])
    } catch (err) {
      setError(Language.fetchError || 'Error fetching categories')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (sectionId) fetchCategories()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sectionId])

  /* ---------- derived ---------- */
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return categories
    const q = searchQuery.trim().toLowerCase()
    return categories.filter((c) => (c.name || '').toLowerCase().includes(q))
  }, [categories, searchQuery])

  const totalProducts = useMemo(
    () => categories.reduce((sum, c) => sum + (c.products?.length || 0), 0),
    [categories],
  )

  /* ---------- modal ---------- */
  const openAdd = () => {
    setFormName('')
    setFormError('')
    setEditingCategory(null)
    setModalMode('add')
  }

  const openEdit = (category, e) => {
    if (e) e.stopPropagation()
    setFormName(category.name || '')
    setFormError('')
    setEditingCategory(category)
    setModalMode('edit')
  }

  const closeModal = () => {
    setModalMode(null)
    setEditingCategory(null)
    setFormName('')
    setFormError('')
  }

  const submitForm = async () => {
    if (!formName.trim()) {
      setFormError(Language.nameRequired || 'Name is required')
      return
    }
    setSubmitting(true)
    try {
      const token = localStorage.getItem('token')
      if (modalMode === 'edit' && editingCategory) {
        await axios.put(
          `${BaseUrl}/categories/${editingCategory._id}`,
          { name: formName.trim() },
          { headers: { Authorization: `Bearer ${token}` } },
        )
      } else {
        await axios.post(
          `${BaseUrl}/categories`,
          { name: formName.trim(), sectionId },
          { headers: { Authorization: `Bearer ${token}` } },
        )
      }
      closeModal()
      fetchCategories()
    } catch (err) {
      setFormError(err.response?.data?.error || Language.saveError || 'Error saving category')
    } finally {
      setSubmitting(false)
    }
  }

  /* ---------- delete ---------- */
  const askDelete = (category, e) => {
    if (e) e.stopPropagation()
    setConfirmTarget(category)
  }

  const confirmDelete = async () => {
    if (!confirmTarget) return
    setDeleting(true)
    try {
      const token = localStorage.getItem('token')
      await axios.delete(`${BaseUrl}/categories/${confirmTarget._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setConfirmTarget(null)
      fetchCategories()
    } catch (err) {
      console.error('Error deleting category', err)
      setConfirmTarget(null)
    } finally {
      setDeleting(false)
    }
  }

  /* ---------- navigation ---------- */
  const openCategory = (id) => {
    navigate(`/menu/categories/${id}`)
  }

  const goBack = () => navigate('/menu/sections')

  /* ---------- render ---------- */
  if (loading && !section) {
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
      <div className="dc-header">
        <div className="dc-header-inner">
          <div className="dc-header-left">
            <div className="dc-breadcrumb">
              <CIcon
                icon={cilChevronLeft}
                onClick={goBack}
                style={{ cursor: 'pointer' }}
                aria-label="Back"
              />
              <span>{Language.menu || 'Menu'}</span>
              <span>·</span>
              <span>{section?.name || 'Section'}</span>
            </div>
            <h5 className="dc-title">{Language.categories || 'Categories'}</h5>
            <div className="dc-subtitle">
              <strong>{categories.length}</strong>{' '}
              {categories.length === 1 ? 'category' : 'categories'}
              {' · '}
              <strong>{totalProducts}</strong> products
            </div>
          </div>

          <div className="dc-header-right">
            <div className="dc-search">
              <CIcon icon={cilSearch} className="dc-search-icon" />
              <input
                type="text"
                placeholder={Language.searchCategories || 'Search categories...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <CButton color="primary" onClick={openAdd}>
              <CIcon icon={cilPlus} className="me-2" />
              {Language.addNewCategory || 'New category'}
            </CButton>
          </div>
        </div>
      </div>

      {/* ---- Grid ---- */}
      <CCardBody className="p-0">
        <div className="dc-grid">
          {categories.length === 0 ? (
            <div className="dc-empty">
              <CIcon icon={cilList} size="xl" />
              <div className="dc-empty-title">
                {Language.noCategoriesYet || 'No categories yet'}
              </div>
              <div className="dc-empty-body">
                {Language.noCategoriesHint ||
                  'Categories group products inside a section — like Espresso, Iced, Teas.'}
              </div>
              <CButton color="primary" onClick={openAdd}>
                <CIcon icon={cilPlus} className="me-2" />
                {Language.addNewCategory || 'New category'}
              </CButton>
            </div>
          ) : filteredCategories.length === 0 ? (
            <div className="dc-empty">
              <CIcon icon={cilWarning} size="xl" />
              <div className="dc-empty-title">
                {Language.noCategoriesMatch || 'No categories match'}
              </div>
              <div className="dc-empty-body">
                {Language.noCategoriesMatchHint || 'Try a different search term.'}
              </div>
            </div>
          ) : (
            filteredCategories.map((category) => {
              const color = colorFor(category._id)
              const initial = (category.name || '?').charAt(0).toUpperCase()
              const productCount = category.products?.length || 0

              return (
                <div
                  key={category._id}
                  className="dc-card"
                  onClick={() => openCategory(category._id)}
                  role="button"
                  tabIndex={0}
                >
                  <div className="dc-card-band" style={{ background: color }}>
                    {initial}
                  </div>

                  <div className="dc-card-body">
                    <p className="dc-card-title">{category.name}</p>
                    <div className="dc-card-meta">
                      <span>
                        <strong>{productCount}</strong>{' '}
                        {productCount === 1 ? 'product' : 'products'}
                      </span>
                    </div>
                    {category.description && (
                      <div className="dc-card-desc">{category.description}</div>
                    )}
                  </div>

                  <div className="dc-card-actions">
                    <CButton
                      color="secondary"
                      variant="outline"
                      size="sm"
                      onClick={(e) => openEdit(category, e)}
                      aria-label="Edit category"
                    >
                      <CIcon icon={cilPencil} />
                    </CButton>
                    <CButton
                      color="danger"
                      variant="outline"
                      size="sm"
                      onClick={(e) => askDelete(category, e)}
                      aria-label="Delete category"
                    >
                      <CIcon icon={cilTrash} />
                    </CButton>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </CCardBody>

      {/* ---- Add / Edit modal ---- */}
      <CModal visible={!!modalMode} onClose={closeModal} backdrop="static" className="dc-modal">
        <div className="dc-modal-header">
          <h5 className="dc-modal-title">
            <CIcon icon={modalMode === 'edit' ? cilPencil : cilPlus} />
            {modalMode === 'edit'
              ? Language.editCategory || 'Edit category'
              : Language.addNewCategory || 'New category'}
          </h5>
          <button className="dc-modal-close" onClick={closeModal} aria-label="Close" type="button">
            &times;
          </button>
        </div>

        <div className="dc-modal-body">
          <div className="dc-field">
            <label htmlFor="dc-category-name">{Language.categoryName || 'Category name'}</label>
            <CFormInput
              id="dc-category-name"
              value={formName}
              autoFocus
              onChange={(e) => {
                setFormName(e.target.value)
                setFormError('')
              }}
              placeholder="e.g. Espresso"
              onKeyDown={(e) => {
                if (e.key === 'Enter') submitForm()
              }}
            />
            {formError && <div className="text-danger small mt-1">{formError}</div>}
          </div>
        </div>

        <div className="dc-modal-footer">
          <CButton color="secondary" variant="outline" onClick={closeModal} disabled={submitting}>
            {Language.cancel || 'Cancel'}
          </CButton>
          <CButton color="primary" onClick={submitForm} disabled={submitting}>
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
        className="dc-modal"
      >
        <div className="dc-confirm-body">
          <div className="dc-confirm-icon">
            <CIcon icon={cilTrash} />
          </div>
          <div className="dc-confirm-title">{Language.deleteCategory || 'Delete category'}</div>
          <div className="dc-confirm-text">
            {Language.deleteCategoryConfirm ||
              'Deleting this category will also delete all its products. This cannot be undone.'}
          </div>
        </div>
        <div className="dc-modal-footer">
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

export default SectionDetails
