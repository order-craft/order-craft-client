import React, { useEffect, useMemo, useState } from 'react'
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
import { cilPlus, cilPencil, cilTrash, cilCreditCard, cilWarning } from '@coreui/icons'
import axios from 'axios'
import { BaseUrl } from '../../helpers/BaseUrl'
import { GetToken } from '../../helpers/GetToken'
import { useSelector } from 'react-redux'
import translations from '../../app/Language'
import './PaymentMethodManager.css'

/* deterministic color per payment-method id */
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

const PaymentMethodManager = () => {
  const token = GetToken()
  const t = useSelector((state) => state.language)
  const Language = translations[t]

  const [methods, setMethods] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalVisible, setModalVisible] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [editId, setEditId] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  })
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
  const fetchMethods = async () => {
    try {
      setLoading(true)
      const res = await axios.get(`${BaseUrl}/payment-methods`, axiosConfig)
      setMethods(res.data)
    } catch (error) {
      showToast(Language.fetchError || 'Failed to fetch payment methods', 'danger')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMethods()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* ---------- modal ---------- */
  const openAdd = () => {
    setFormData({ name: '', description: '' })
    setEditMode(false)
    setEditId(null)
    setErrors({})
    setModalVisible(true)
  }

  const openEdit = (method) => {
    setFormData({
      name: method.name || '',
      description: method.description || '',
    })
    setEditMode(true)
    setEditId(method._id)
    setErrors({})
    setModalVisible(true)
  }

  const closeModal = () => {
    setModalVisible(false)
    setFormData({ name: '', description: '' })
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
        await axios.put(`${BaseUrl}/payment-methods/${editId}`, formData, axiosConfig)
        showToast(Language.methodUpdated || 'Payment method updated')
      } else {
        await axios.post(`${BaseUrl}/payment-methods`, formData, axiosConfig)
        showToast(Language.methodCreated || 'Payment method created')
      }
      closeModal()
      fetchMethods()
    } catch (error) {
      const msg =
        error.response?.data?.message || Language.saveError || 'Error saving payment method'
      setErrors({ submit: msg })
    } finally {
      setSubmitting(false)
    }
  }

  /* ---------- delete ---------- */
  const askDelete = (method) => {
    setConfirmTarget(method)
  }

  const confirmDelete = async () => {
    if (!confirmTarget) return
    setDeleting(true)
    try {
      await axios.delete(`${BaseUrl}/payment-methods/${confirmTarget._id}`, axiosConfig)
      showToast(Language.methodDeleted || 'Payment method deleted')
      setConfirmTarget(null)
      fetchMethods()
    } catch (error) {
      showToast(Language.deleteError || 'Error deleting payment method', 'danger')
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
        <div className="pm-header">
          <div className="pm-header-inner">
            <div className="pm-header-left">
              <h5 className="pm-title">{Language.paymentMethods || 'Payment methods'}</h5>
              <div className="pm-subtitle">
                <strong>{methods.length}</strong> {methods.length === 1 ? 'method' : 'methods'}
              </div>
            </div>

            <div className="pm-header-right">
              <CButton color="primary" onClick={openAdd}>
                <CIcon icon={cilPlus} className="me-2" />
                {Language.addMethod || 'New method'}
              </CButton>
            </div>
          </div>
        </div>

        <CCardBody className="p-0">
          {loading && methods.length === 0 ? (
            <div className="text-center py-5">
              <CSpinner color="primary" />
            </div>
          ) : methods.length === 0 ? (
            <div className="pm-empty">
              <CIcon icon={cilCreditCard} size="xl" />
              <div className="pm-empty-title">
                {Language.noMethodsYet || 'No payment methods yet'}
              </div>
              <div className="pm-empty-body">
                {Language.noMethodsHint ||
                  'Payment methods are used at checkout — like Cash, Card, or PayPal.'}
              </div>
              <CButton color="primary" onClick={openAdd}>
                <CIcon icon={cilPlus} className="me-2" />
                {Language.addMethod || 'New method'}
              </CButton>
            </div>
          ) : (
            <div className="pm-list">
              {methods.map((method) => {
                const color = colorFor(method._id)
                const initial = (method.name || '?').charAt(0).toUpperCase()
                return (
                  <div className="pm-row" key={method._id}>
                    <div className="pm-badge" style={{ background: color }}>
                      {initial}
                    </div>

                    <div className="pm-info">
                      <p className="pm-name">{method.name}</p>
                      {method.description && <div className="pm-desc">{method.description}</div>}
                    </div>

                    <div className="pm-actions">
                      <CButton
                        color="secondary"
                        variant="outline"
                        size="sm"
                        onClick={() => openEdit(method)}
                        aria-label="Edit method"
                      >
                        <CIcon icon={cilPencil} />
                      </CButton>
                      <CButton
                        color="danger"
                        variant="outline"
                        size="sm"
                        onClick={() => askDelete(method)}
                        aria-label="Delete method"
                      >
                        <CIcon icon={cilTrash} />
                      </CButton>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CCardBody>

        {/* ---- Add/Edit modal ---- */}
        <CModal visible={modalVisible} onClose={closeModal} backdrop="static" className="pm-modal">
          <div className="pm-modal-header">
            <h5 className="pm-modal-title">
              <CIcon icon={editMode ? cilPencil : cilPlus} />
              {editMode
                ? Language.editMethod || 'Edit payment method'
                : Language.addMethod || 'New payment method'}
            </h5>
            <button
              className="pm-modal-close"
              onClick={closeModal}
              aria-label="Close"
              type="button"
            >
              &times;
            </button>
          </div>

          <div className="pm-modal-body">
            <div className="pm-field">
              <label htmlFor="pm-name">{Language.name || 'Name'}</label>
              <CFormInput
                id="pm-name"
                autoFocus
                value={formData.name}
                onChange={(e) => {
                  setFormData({ ...formData, name: e.target.value })
                  setErrors({ ...errors, name: null, submit: null })
                }}
                placeholder="e.g. Cash, Card, PayPal"
                invalid={!!errors.name}
              />
              {errors.name && <div className="text-danger small mt-1">{errors.name}</div>}
            </div>

            <div className="pm-field">
              <label htmlFor="pm-desc">
                {Language.description || 'Description'}{' '}
                <span className="text-muted">({Language.optional || 'optional'})</span>
              </label>
              <CFormInput
                id="pm-desc"
                value={formData.description}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    description: e.target.value,
                  })
                }
                placeholder="Shown next to the method at checkout"
              />
            </div>

            {errors.submit && <div className="text-danger small mt-1">{errors.submit}</div>}
          </div>

          <div className="pm-modal-footer">
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

        {/* ---- Confirm delete ---- */}
        <CModal
          visible={!!confirmTarget}
          onClose={() => setConfirmTarget(null)}
          backdrop="static"
          className="pm-modal"
        >
          <div className="pm-confirm-body">
            <div className="pm-confirm-icon">
              <CIcon icon={cilTrash} />
            </div>
            <div className="pm-confirm-title">
              {Language.deleteMethod || 'Delete payment method'}
            </div>
            <div className="pm-confirm-text">
              {confirmTarget
                ? `Delete "${confirmTarget.name}"? Existing orders that used it will keep their record.`
                : Language.deleteMethodConfirm || 'Delete this payment method?'}
            </div>
          </div>
          <div className="pm-modal-footer">
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

export default PaymentMethodManager
