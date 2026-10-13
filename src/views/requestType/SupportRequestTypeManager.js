import React, { useEffect, useState } from 'react'
import {
  CButton,
  CCard,
  CCardBody,
  CModal,
  CFormInput,
  CSpinner,
  CToaster,
  CToast,
  CToastHeader,
  CToastBody,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilPlus, cilPencil, cilTrash, cilBell } from '@coreui/icons'
import axios from 'axios'
import { BaseUrl } from '../../helpers/BaseUrl'
import { GetToken } from '../../helpers/GetToken'
import { useSelector } from 'react-redux'
import translations from '../../app/Language'
import './requestType.css'
const avatarPalette = [
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
  return avatarPalette[Math.abs(h) % avatarPalette.length]
}
const SupportRequestTypeManager = () => {
  const token = GetToken()
  const t = useSelector((state) => state.language)
  const Language = translations[t]

  const [requestTypes, setRequestTypes] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalVisible, setModalVisible] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [editId, setEditId] = useState(null)
  const [formData, setFormData] = useState({ name: '', icon: '' })
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)

  const [confirmTarget, setConfirmTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const [toasts, setToasts] = useState([])
  const showToast = (msg, color = 'success') => {
    const id = Date.now() + Math.random()
    setToasts((prev) => [...prev, { id, msg, color }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((x) => x.id !== id))
    }, 5000)
  }
  const removeToast = (id) => setToasts((prev) => prev.filter((x) => x.id !== id))

  const axiosConfig = {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  }

  /* ---------- data ---------- */
  const fetchRequestTypes = async () => {
    try {
      setLoading(true)
      const response = await axios.get(`${BaseUrl}/sup/request-types`, axiosConfig)
      setRequestTypes(response.data.data)
    } catch (error) {
      showToast(Language.fetchError || 'Failed to fetch request types', 'danger')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRequestTypes()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* ---------- modal ---------- */
  const openAdd = () => {
    setFormData({ name: '', icon: '' })
    setEditMode(false)
    setEditId(null)
    setErrors({})
    setModalVisible(true)
  }

  const openEdit = (type) => {
    setFormData({ name: type.name || '', icon: type.icon || '' })
    setEditMode(true)
    setEditId(type._id)
    setErrors({})
    setModalVisible(true)
  }

  const closeModal = () => {
    setModalVisible(false)
    setFormData({ name: '', icon: '' })
    setEditMode(false)
    setEditId(null)
    setErrors({})
  }

  const validate = () => {
    const e = {}
    if (!formData.name.trim()) e.name = 'Name is required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSave = async () => {
    if (!validate()) return

    setSubmitting(true)
    try {
      if (editMode) {
        await axios.put(`${BaseUrl}/sup/request-types/${editId}`, formData, axiosConfig)
        showToast(Language.typeUpdated || 'Request type updated')
      } else {
        await axios.post(`${BaseUrl}/sup/request-types`, formData, axiosConfig)
        showToast(Language.typeCreated || 'Request type created')
      }
      closeModal()
      fetchRequestTypes()
    } catch (error) {
      const msg = error.response?.data?.message || Language.saveError || 'Error saving request type'
      setErrors({ submit: msg })
    } finally {
      setSubmitting(false)
    }
  }

  /* ---------- delete ---------- */
  const askDelete = (type) => setConfirmTarget(type)

  const confirmDelete = async () => {
    if (!confirmTarget) return
    setDeleting(true)
    try {
      await axios.delete(`${BaseUrl}/sup/request-types/${confirmTarget._id}`, axiosConfig)
      showToast(Language.typeDeleted || 'Request type deleted')
      setConfirmTarget(null)
      fetchRequestTypes()
    } catch (error) {
      showToast(Language.deleteError || 'Failed to delete request type', 'danger')
      setConfirmTarget(null)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <CToaster position="top-end">
        {toasts.map(({ id, msg, color }) => (
          <CToast
            key={id}
            autohide
            delay={5000}
            color={color}
            visible
            onClose={() => removeToast(id)}
          >
            <CToastHeader closeButton>{color === 'danger' ? 'Error' : 'Notification'}</CToastHeader>
            <CToastBody>{msg}</CToastBody>
          </CToast>
        ))}
      </CToaster>

      <CCard className="mb-4">
        <div className="rt-header">
          <div className="rt-header-inner">
            <div className="rt-header-left">
              <h5 className="rt-title">{Language.supportTypes || 'Support request types'}</h5>
              <div className="rt-subtitle">
                <strong>{requestTypes.length}</strong>{' '}
                {requestTypes.length === 1 ? 'type' : 'types'}
                {' · '}
                Shown to customers when they call a waiter
              </div>
            </div>

            <div className="rt-header-right">
              <CButton color="primary" onClick={openAdd}>
                <CIcon icon={cilPlus} className="me-2" />
                {Language.addRequestType || 'New type'}
              </CButton>
            </div>
          </div>
        </div>

        <CCardBody className="p-0">
          {loading && requestTypes.length === 0 ? (
            <div className="text-center py-5">
              <CSpinner color="primary" />
            </div>
          ) : requestTypes.length === 0 ? (
            <div className="rt-empty">
              <CIcon icon={cilBell} size="xl" />
              <div className="rt-empty-title">
                {Language.noRequestTypesYet || 'No request types yet'}
              </div>
              <div className="rt-empty-body">
                {Language.noRequestTypesHint ||
                  'Add the reasons customers can call a waiter — like Bill, Water, or Help.'}
              </div>
              <CButton color="primary" onClick={openAdd}>
                <CIcon icon={cilPlus} className="me-2" />
                {Language.addRequestType || 'New type'}
              </CButton>
            </div>
          ) : (
            <div className="rt-list">
              {requestTypes.map((type) => (
                <div className="rt-row" key={type._id}>
                  <div className="rt-avatar" style={{ background: colorFor(type._id) }}>
                    {(type.name || '?').charAt(0).toUpperCase()}
                  </div>
                  <div className="rt-info">
                    <p className="rt-name">{type.name}</p>
                  </div>
                  <div className="rt-actions">
                    <CButton
                      color="secondary"
                      variant="outline"
                      size="sm"
                      onClick={() => openEdit(type)}
                      aria-label="Edit type"
                    >
                      <CIcon icon={cilPencil} />
                    </CButton>
                    <CButton
                      color="danger"
                      variant="outline"
                      size="sm"
                      onClick={() => askDelete(type)}
                      aria-label="Delete type"
                    >
                      <CIcon icon={cilTrash} />
                    </CButton>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CCardBody>

        {/* Add/Edit modal */}
        <CModal visible={modalVisible} onClose={closeModal} backdrop="static" className="rt-modal">
          <div className="rt-modal-header">
            <h5 className="rt-modal-title">
              <CIcon icon={editMode ? cilPencil : cilPlus} />
              {editMode
                ? Language.editRequestType || 'Edit request type'
                : Language.addRequestType || 'New request type'}
            </h5>
            <button
              className="rt-modal-close"
              onClick={closeModal}
              aria-label="Close"
              type="button"
            >
              &times;
            </button>
          </div>

          <div className="rt-modal-body">
            <div className="rt-field">
              <label htmlFor="rt-name">{Language.name || 'Name'}</label>
              <CFormInput
                id="rt-name"
                autoFocus
                value={formData.name}
                onChange={(e) => {
                  setFormData({ ...formData, name: e.target.value })
                  setErrors({ ...errors, name: null, submit: null })
                }}
                placeholder="e.g. Bill, Water, Help"
                invalid={!!errors.name}
              />
              {errors.name && <div className="text-danger small mt-1">{errors.name}</div>}
            </div>

            <div className="rt-field">
              <label htmlFor="rt-icon">
                {Language.icon || 'Icon'}{' '}
                <span className="text-muted">({Language.optional || 'optional'})</span>
              </label>
              <CFormInput
                id="rt-icon"
                value={formData.icon}
                onChange={(e) => {
                  setFormData({ ...formData, icon: e.target.value })
                  setErrors({ ...errors, icon: null, submit: null })
                }}
                placeholder="e.g. file-text, droplet, bell"
                invalid={!!errors.icon}
              />
              {errors.icon && <div className="text-danger small mt-1">{errors.icon}</div>}
            </div>

            {errors.submit && <div className="text-danger small mt-1">{errors.submit}</div>}
          </div>

          <div className="rt-modal-footer">
            <CButton color="secondary" variant="outline" onClick={closeModal} disabled={submitting}>
              {Language.cancel || 'Cancel'}
            </CButton>
            <CButton color="primary" onClick={handleSave} disabled={submitting}>
              {submitting ? (
                <>
                  <CSpinner size="sm" className="me-2" />
                  {Language.saving || 'Saving…'}
                </>
              ) : editMode ? (
                Language.saveChanges || 'Save'
              ) : (
                Language.create || 'Create'
              )}
            </CButton>
          </div>
        </CModal>

        {/* Confirm delete */}
        <CModal
          visible={!!confirmTarget}
          onClose={() => setConfirmTarget(null)}
          backdrop="static"
          className="rt-modal"
        >
          <div className="rt-confirm-body">
            <div className="rt-confirm-icon">
              <CIcon icon={cilTrash} />
            </div>
            <div className="rt-confirm-title">
              {Language.deleteRequestType || 'Delete request type'}
            </div>
            <div className="rt-confirm-text">
              {confirmTarget
                ? `Delete "${confirmTarget.name}"? Customers will no longer see this option.`
                : 'Delete this request type?'}
            </div>
          </div>
          <div className="rt-modal-footer">
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
    </>
  )
}

export default SupportRequestTypeManager
