import React, { useState, useEffect } from 'react'
import {
  CCard,
  CCardBody,
  CCardHeader,
  CButton,
  CForm,
  CFormInput,
  CTable,
  CTableHead,
  CTableRow,
  CTableHeaderCell,
  CTableBody,
  CTableDataCell,
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CSpinner,
  CAlert,
  CToaster,
  CToast,
  CToastHeader,
  CToastBody,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilPlus, cilPencil, cilTrash, cilCheckCircle, cilWarning } from '@coreui/icons'
import axios from 'axios'
import { BaseUrl } from '../../helpers/BaseUrl'
import { GetToken } from '../../helpers/GetToken'

const PaymentMethodManager = () => {
  const [methods, setMethods] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalVisible, setModalVisible] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [formData, setFormData] = useState({ name: '', description: '' })
  const [editId, setEditId] = useState(null)
  const [errors, setErrors] = useState({})
  const [toast, setToast] = useState({ show: false, message: '', color: 'success' })
  const [deleteLoading, setDeleteLoading] = useState(null)
  const [saveLoading, setSaveLoading] = useState(false)
  const token = GetToken()

  const axiosConfig = {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  }

  const fetchMethods = async () => {
    try {
      setLoading(true)
      const res = await axios.get(`${BaseUrl}/payment-methods`, axiosConfig)
      setMethods(res.data)
    } catch (error) {
      showToast('Failed to fetch payment methods', 'danger')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMethods()
  }, [])

  const validateForm = () => {
    const newErrors = {}
    if (!formData.name.trim()) newErrors.name = 'Name is required'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData({ ...formData, [name]: value })
    if (errors[name]) setErrors({ ...errors, [name]: null })
  }

  const handleSave = async () => {
    if (!validateForm()) return
    setSaveLoading(true)
    try {
      if (editMode) {
        await axios.put(`${BaseUrl}/payment-methods/${editId}`, formData, axiosConfig)
        showToast('Payment method updated', 'success')
      } else {
        await axios.post(`${BaseUrl}/payment-methods`, formData, axiosConfig)
        showToast('Payment method created', 'success')
      }
      setModalVisible(false)
      setFormData({ name: '', description: '' })
      fetchMethods()
    } catch (error) {
      const msg = error.response?.data?.message || 'Error saving payment method'
      showToast(msg, 'danger')
    } finally {
      setSaveLoading(false)
    }
  }

  const handleEdit = (method) => {
    setEditMode(true)
    setEditId(method._id)
    setFormData({ name: method.name, description: method.description || '' })
    setModalVisible(true)
    setErrors({})
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this payment method?')) return
    setDeleteLoading(id)
    try {
      await axios.delete(`${BaseUrl}/payment-methods/${id}`, axiosConfig)
      showToast('Payment method deleted', 'success')
      fetchMethods()
    } catch (error) {
      showToast('Error deleting payment method', 'danger')
    } finally {
      setDeleteLoading(null)
    }
  }

  const showToast = (message, color) => {
    setToast({ show: true, message, color })
    setTimeout(() => setToast({ ...toast, show: false }), 5000)
  }

  return (
    <>
      <CCard className="shadow-lg border-0 rounded-3">
        <CCardHeader className="d-flex justify-content-between align-items-center bg-dark text-white">
          <h5 className="mb-0">Payment Methods</h5>
          <CButton
            color="light"
            className="text-dark"
            onClick={() => {
              setEditMode(false)
              setFormData({ name: '', description: '' })
              setModalVisible(true)
              setErrors({})
            }}
          >
            <CIcon icon={cilPlus} className="me-2" />
            Add New
          </CButton>
        </CCardHeader>
        <CCardBody>
          {loading ? (
            <div className="text-center py-5">
              <CSpinner color="dark" />
              <p className="mt-3">Loading payment methods...</p>
            </div>
          ) : methods.length === 0 ? (
            <CAlert color="info" className="text-center">
              No payment methods found. Start by adding one.
            </CAlert>
          ) : (
            <div className="table-responsive">
              <CTable hover striped responsive>
                <CTableHead>
                  <CTableRow>
                    <CTableHeaderCell>Name</CTableHeaderCell>
                    <CTableHeaderCell>Description</CTableHeaderCell>
                    <CTableHeaderCell width="150px">Actions</CTableHeaderCell>
                  </CTableRow>
                </CTableHead>
                <CTableBody>
                  {methods.map((method) => (
                    <CTableRow key={method._id}>
                      <CTableDataCell>{method.name}</CTableDataCell>
                      <CTableDataCell>{method.description}</CTableDataCell>
                      <CTableDataCell>
                        <div className="d-flex gap-2">
                          <CButton color="info" size="sm" onClick={() => handleEdit(method)}>
                            <CIcon icon={cilPencil} />
                          </CButton>
                          <CButton
                            color="danger"
                            size="sm"
                            onClick={() => handleDelete(method._id)}
                            disabled={deleteLoading === method._id}
                          >
                            {deleteLoading === method._id ? (
                              <CSpinner size="sm" />
                            ) : (
                              <CIcon icon={cilTrash} />
                            )}
                          </CButton>
                        </div>
                      </CTableDataCell>
                    </CTableRow>
                  ))}
                </CTableBody>
              </CTable>
            </div>
          )}
        </CCardBody>
      </CCard>

      {/* Modal */}
      <CModal visible={modalVisible} onClose={() => setModalVisible(false)} backdrop="static">
        <CModalHeader closeButton>
          <CModalTitle>{editMode ? 'Edit Payment Method' : 'Add New Payment Method'}</CModalTitle>
        </CModalHeader>
        <CModalBody>
          <CForm>
            <div className="mb-3">
              <CFormInput
                label="Name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                invalid={!!errors.name}
                placeholder="e.g. Bank Card, PayPal, Cash"
              />
              {errors.name && <div className="invalid-feedback d-block">{errors.name}</div>}
            </div>
            <div className="mb-3">
              <CFormInput
                label="Description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Optional description"
              />
            </div>
          </CForm>
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={() => setModalVisible(false)} disabled={saveLoading}>
            Cancel
          </CButton>
          <CButton color="primary" onClick={handleSave} disabled={saveLoading}>
            {saveLoading ? <CSpinner size="sm" /> : editMode ? 'Update' : 'Create'}
          </CButton>
        </CModalFooter>
      </CModal>

      {/* Toast */}
      <CToaster placement="top-end">
        <CToast visible={toast.show} color={toast.color}>
          <CToastHeader closeButton>
            <CIcon
              icon={toast.color === 'success' ? cilCheckCircle : cilWarning}
              className="me-2"
            />
            {toast.color === 'success' ? 'Success' : 'Error'}
          </CToastHeader>
          <CToastBody>{toast.message}</CToastBody>
        </CToast>
      </CToaster>
    </>
  )
}

export default PaymentMethodManager
