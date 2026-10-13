import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CButton, CCard, CCardBody, CModal, CFormInput, CSpinner } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilSearch, cilPlus, cilPencil, cilTrash, cilList, cilWarning } from '@coreui/icons'
import axios from 'axios'
import { BaseUrl } from '../../../helpers/BaseUrl'
import { useSelector } from 'react-redux'
import translations from '../../../app/Language'
import './section.css'

/* deterministic color per section id */
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

const Menu = () => {
  const navigate = useNavigate()
  const t = useSelector((state) => state.language)
  const Language = translations[t]

  const [menu, setMenu] = useState(null)
  const [loadingMenu, setLoadingMenu] = useState(false)
  const [error, setError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  // add/edit modal
  const [modalMode, setModalMode] = useState(null) // 'add' | 'edit' | null
  const [editingSection, setEditingSection] = useState(null)
  const [formName, setFormName] = useState('')
  const [formError, setFormError] = useState('')
  // confirm modal
  const [confirmTarget, setConfirmTarget] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState(false)
  /* ---------- data ---------- */
  const fetchMenu = async () => {
    setLoadingMenu(true)
    setError('')
    try {
      const token = localStorage.getItem('token')
      const response = await axios.get(`${BaseUrl}/menu/admin`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setMenu(response.data)
    } catch (err) {
      setError(Language.fetchError || 'Error fetching menu')
      console.error(err)
    } finally {
      setLoadingMenu(false)
    }
  }

  useEffect(() => {
    fetchMenu()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* ---------- derived ---------- */
  const sections = menu?.sections || []

  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) return sections
    const q = searchQuery.trim().toLowerCase()
    return sections.filter((s) => (s.name || '').toLowerCase().includes(q))
  }, [sections, searchQuery])

  const totals = useMemo(() => {
    let categories = 0
    let products = 0
    sections.forEach((s) => {
      categories += s.categories?.length || 0
      ;(s.categories || []).forEach((c) => {
        products += c.products?.length || 0
      })
    })
    return { categories, products }
  }, [sections])

  /* ---------- modal ---------- */
  const openAdd = () => {
    setFormName('')
    setFormError('')
    setEditingSection(null)
    setModalMode('add')
  }

  const openEdit = (section, e) => {
    if (e) e.stopPropagation()
    setFormName(section.name || '')
    setFormError('')
    setEditingSection(section)
    setModalMode('edit')
  }

  const closeModal = () => {
    setModalMode(null)
    setEditingSection(null)
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
      if (modalMode === 'edit' && editingSection) {
        await axios.put(
          `${BaseUrl}/sections/${editingSection._id}`,
          { name: formName.trim() },
          { headers: { Authorization: `Bearer ${token}` } },
        )
      } else {
        await axios.post(
          `${BaseUrl}/sections`,
          { name: formName.trim() },
          { headers: { Authorization: `Bearer ${token}` } },
        )
      }
      closeModal()
      fetchMenu()
    } catch (err) {
      setFormError(err.response?.data?.error || Language.saveError || 'Error saving section')
    } finally {
      setSubmitting(false)
    }
  }

  /* ---------- delete ---------- */
  const askDelete = (section, e) => {
    if (e) e.stopPropagation()
    setConfirmTarget(section)
  }

  const confirmDelete = async () => {
    if (!confirmTarget) return
    setDeleting(true)
    try {
      const token = localStorage.getItem('token')
      await axios.delete(`${BaseUrl}/sections/${confirmTarget._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setConfirmTarget(null)
      fetchMenu()
    } catch (err) {
      console.error('Error deleting section', err)
      setConfirmTarget(null)
    } finally {
      setDeleting(false)
    }
  }

  /* ---------- navigation ---------- */
  const openSection = (sectionId) => {
    navigate(`/menu/sections/${sectionId}`)
  }

  /* ---------- render ---------- */
  if (loadingMenu && !menu) {
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
      <div className="ds-header">
        <div className="ds-header-inner">
          <div className="ds-header-left">
            <h5 className="ds-title">{Language.sections || 'Menu sections'}</h5>
            <div className="ds-subtitle">
              <strong>{sections.length}</strong> {sections.length === 1 ? 'section' : 'sections'}
              {' · '}
              <strong>{totals.categories}</strong> categories
              {' · '}
              <strong>{totals.products}</strong> products
            </div>
          </div>

          <div className="ds-header-right">
            <div className="ds-search">
              <CIcon icon={cilSearch} className="ds-search-icon" />
              <input
                type="text"
                placeholder={Language.searchSections || 'Search sections...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <CButton color="primary" onClick={openAdd}>
              <CIcon icon={cilPlus} className="me-2" />
              {Language.newSection || 'New section'}
            </CButton>
          </div>
        </div>
      </div>

      {/* ---- Grid ---- */}
      <CCardBody className="p-0">
        <div className="ds-grid">
          {sections.length === 0 ? (
            <div className="ds-empty">
              <CIcon icon={cilList} size="xl" />
              <div className="ds-empty-title">{Language.noSectionsYet || 'No sections yet'}</div>
              <div className="ds-empty-body">
                {Language.noSectionsHint ||
                  'Sections organize your menu — like Coffee, Cold Drinks, Desserts.'}
              </div>
              <CButton color="primary" onClick={openAdd}>
                <CIcon icon={cilPlus} className="me-2" />
                {Language.newSection || 'New section'}
              </CButton>
            </div>
          ) : filteredSections.length === 0 ? (
            <div className="ds-empty">
              <CIcon icon={cilWarning} size="xl" />
              <div className="ds-empty-title">
                {Language.noSectionsMatch || 'No sections match'}
              </div>
              <div className="ds-empty-body">
                {Language.noSectionsMatchHint || 'Try a different search term.'}
              </div>
            </div>
          ) : (
            filteredSections.map((section) => {
              const color = colorFor(section._id)
              const initial = (section.name || '?').charAt(0).toUpperCase()
              const catCount = section.categories?.length || 0
              const prodCount = (section.categories || []).reduce(
                (sum, c) => sum + (c.products?.length || 0),
                0,
              )

              return (
                <div
                  key={section._id}
                  className="ds-card"
                  onClick={() => openSection(section._id)}
                  role="button"
                  tabIndex={0}
                >
                  <div className="ds-card-band" style={{ background: color }}>
                    <span className="ds-card-band-initial">{initial}</span>
                  </div>

                  <div className="ds-card-body">
                    <p className="ds-card-title">{section.name}</p>
                    <div className="ds-card-meta">
                      <span>
                        <strong>{catCount}</strong> {catCount === 1 ? 'category' : 'categories'}
                      </span>
                      <span className="ds-badge">{prodCount} products</span>
                    </div>
                  </div>

                  <div className="ds-card-actions">
                    <CButton
                      color="secondary"
                      variant="outline"
                      size="sm"
                      onClick={(e) => openEdit(section, e)}
                      aria-label="Edit section"
                    >
                      <CIcon icon={cilPencil} />
                    </CButton>
                    <CButton
                      color="danger"
                      variant="outline"
                      size="sm"
                      onClick={(e) => askDelete(section, e)}
                      aria-label="Delete section"
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
      <CModal visible={!!modalMode} onClose={closeModal} backdrop="static" className="ds-modal">
        <div className="ds-modal-header">
          <h5 className="ds-modal-title">
            <CIcon icon={modalMode === 'edit' ? cilPencil : cilPlus} />
            {modalMode === 'edit'
              ? Language.editSection || 'Edit section'
              : Language.newSection || 'New section'}
          </h5>
          <button className="ds-modal-close" onClick={closeModal} aria-label="Close" type="button">
            &times;
          </button>
        </div>

        <div className="ds-modal-body">
          <div className="ds-field">
            <label htmlFor="ds-section-name">{Language.sectionName || 'Section name'}</label>
            <CFormInput
              id="ds-section-name"
              value={formName}
              autoFocus
              onChange={(e) => {
                setFormName(e.target.value)
                setFormError('')
              }}
              placeholder="e.g. Hot drinks"
              onKeyDown={(e) => {
                if (e.key === 'Enter') submitForm()
              }}
            />
            {formError && <div className="text-danger small mt-1">{formError}</div>}
          </div>
        </div>

        <div className="ds-modal-footer">
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
        className="ds-modal"
      >
        <div className="ds-confirm-body">
          <div className="ds-confirm-icon">
            <CIcon icon={cilTrash} />
          </div>
          <div className="ds-confirm-title">{Language.deleteSection || 'Delete section'}</div>
          <div className="ds-confirm-text">
            {Language.deleteSectionConfirm ||
              'Deleting this section will also delete all its categories and products. This cannot be undone.'}
          </div>
        </div>
        <div className="ds-modal-footer">
          <CButton color="secondary" variant="outline" onClick={() => setConfirmTarget(null)}>
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

export default Menu
