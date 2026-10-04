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
import axios from 'axios'
import { BaseUrl } from '../../helpers/BaseUrl'
import { GetToken } from '../../helpers/GetToken'
import CIcon from '@coreui/icons-react'
import { cilPencil, cilTrash, cilPlus, cilCheckCircle, cilWarning } from '@coreui/icons'

const SupportRequestTypeManager = () => {
  const [requestTypes, setRequestTypes] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalVisible, setModalVisible] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [formData, setFormData] = useState({ name: '', icon: '' })
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

  const fetchRequestTypes = async () => {
    try {
      setLoading(true)
      const response = await axios.get(`${BaseUrl}/sup/request-types`, axiosConfig)
      setRequestTypes(response.data.data)
    } catch (error) {
      showToast('Failed to fetch request types', 'danger')
      console.error('Failed to fetch request types', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRequestTypes()
  }, [])

  const validateForm = () => {
    const newErrors = {}
    if (!formData.name.trim()) newErrors.name = 'Name is required'
    if (!formData.icon.trim()) newErrors.icon = 'Icon is required'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData({ ...formData, [name]: value })
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors({ ...errors, [name]: null })
    }
  }

  const handleSave = async () => {
    if (!validateForm()) return

    setSaveLoading(true)
    try {
      if (editMode) {
        await axios.put(`${BaseUrl}/sup/request-types/${editId}`, formData, axiosConfig)
        showToast('Request type updated successfully', 'success')
      } else {
        await axios.post(`${BaseUrl}/sup/request-types`, formData, axiosConfig)
        showToast('Request type created successfully', 'success')
      }
      setFormData({ name: '', icon: '' })
      setModalVisible(false)
      fetchRequestTypes()
    } catch (error) {
      const message = error.response?.data?.message || 'Error saving request type'
      showToast(message, 'danger')
      console.error('Error saving request type', error)
    } finally {
      setSaveLoading(false)
    }
  }

  const handleEdit = (type) => {
    setEditMode(true)
    setEditId(type._id)
    setFormData({ name: type.name, icon: type.icon })
    setModalVisible(true)
    setErrors({})
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this request type?')) return

    setDeleteLoading(id)
    try {
      await axios.delete(`${BaseUrl}/sup/request-types/${id}`, axiosConfig)
      showToast('Request type deleted successfully', 'success')
      fetchRequestTypes()
    } catch (error) {
      showToast('Failed to delete request type', 'danger')
      console.error('Error deleting request type', error)
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
        <CCardHeader className="d-flex justify-content-between align-items-center bg-primary text-white">
          <h5 className="mb-0">Support Request Types</h5>
          <CButton
            color="light"
            onClick={() => {
              setEditMode(false)
              setFormData({ name: '', icon: '' })
              setModalVisible(true)
              setErrors({})
            }}
            className="text-primary"
          >
            <CIcon icon={cilPlus} className="me-2" />
            Add New
          </CButton>
        </CCardHeader>
        <CCardBody>
          {loading ? (
            <div className="text-center py-5">
              <CSpinner color="primary" />
              <p className="mt-3">Loading request types...</p>
            </div>
          ) : requestTypes.length === 0 ? (
            <CAlert color="info" className="text-center">
              No request types found. Create one to get started!
            </CAlert>
          ) : (
            <div className="table-responsive">
              <CTable hover striped responsive>
                <CTableHead>
                  <CTableRow>
                    <CTableHeaderCell className="bg-light">Name</CTableHeaderCell>
                    <CTableHeaderCell className="bg-light">Icon</CTableHeaderCell>
                    <CTableHeaderCell className="bg-light" width="200px">
                      Actions
                    </CTableHeaderCell>
                  </CTableRow>
                </CTableHead>
                <CTableBody>
                  {requestTypes.map((type) => (
                    <CTableRow key={type._id}>
                      <CTableDataCell>{type.name}</CTableDataCell>
                      <CTableDataCell>{type.icon}</CTableDataCell>
                      <CTableDataCell>
                        <div className="d-flex gap-2">
                          <CButton
                            color="info"
                            size="sm"
                            onClick={() => handleEdit(type)}
                            disabled={deleteLoading === type._id}
                          >
                            <CIcon icon={cilPencil} />
                          </CButton>
                          <CButton
                            color="danger"
                            size="sm"
                            onClick={() => handleDelete(type._id)}
                            disabled={deleteLoading === type._id}
                          >
                            {deleteLoading === type._id ? (
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

      <CModal visible={modalVisible} onClose={() => setModalVisible(false)} backdrop="static">
        <CModalHeader closeButton>
          <CModalTitle>{editMode ? 'Edit Request Type' : 'Add New Request Type'}</CModalTitle>
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
                placeholder="Enter request type name"
              />
              {errors.name && <div className="invalid-feedback d-block">{errors.name}</div>}
            </div>
            <div className="mb-3">
              <CFormInput
                label="Icon"
                name="icon"
                value={formData.icon}
                onChange={handleInputChange}
                invalid={!!errors.icon}
                placeholder="Enter icon (emoji or class name)"
              />
              {errors.icon && <div className="invalid-feedback d-block">{errors.icon}</div>}
              <small className="text-muted">
                You can get the name of the icon from the list of icons in the link <br />
                <a href="https://feathericons.com/">feather-icons</a>
              </small>
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

      <CToaster placement="top-end">
        <CToast
          visible={toast.show}
          color={toast.color}
          onClose={() => setToast({ ...toast, show: false })}
        >
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

export default SupportRequestTypeManager
