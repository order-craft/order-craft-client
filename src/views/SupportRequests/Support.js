import React, { useState, useEffect } from 'react'
import {
  CCard,
  CCardBody,
  CCardHeader,
  CButton,
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
  CBadge,
  CPagination,
  CPaginationItem,
  CFormSelect,
  CFormInput,
  CForm,
  CInputGroup,
  CInputGroupText,
} from '@coreui/react'
import axios from 'axios'
import { BaseUrl } from '../../helpers/BaseUrl'
import { GetToken } from '../../helpers/GetToken'
import CIcon from '@coreui/icons-react'
import { cilTrash, cilSearch, cilCheckCircle, cilWarning } from '@coreui/icons'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'

const SupportRequestsManager = () => {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [deleteModalVisible, setDeleteModalVisible] = useState(false)
  const [requestToDelete, setRequestToDelete] = useState(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [toast, setToast] = useState({ show: false, message: '', color: 'success' })
  const [filters, setFilters] = useState({
    answered: 'all',
    limit: 20,
  })
  const [requestTypes, setRequestTypes] = useState([])
  const [currentPage, setCurrentPage] = useState(1)
  const token = GetToken()

  const axiosConfig = {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  }

  const fetchSupportRequests = async () => {
    try {
      setLoading(true)
      let url = `${BaseUrl}/sup/support-requests?`

      // Add filters to URL
      if (filters.answered !== 'all') url += `answered=${filters.answered}&`
      if (filters.limit) url += `limit=${filters.limit}&`

      const response = await axios.get(url, axiosConfig)
      setRequests(response.data.data)
    } catch (error) {
      showToast('Failed to fetch support requests', 'danger')
      console.error('Error fetching support requests:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchRequestTypes = async () => {
    try {
      const response = await axios.get(`${BaseUrl}/sup/request-types`, axiosConfig)
      setRequestTypes(response.data.data)
    } catch (error) {
      console.error('Error fetching request types:', error)
    }
  }

  useEffect(() => {
    fetchSupportRequests()
    fetchRequestTypes()
  }, [filters])

  const handleDeleteClick = (request) => {
    setRequestToDelete(request)
    setDeleteModalVisible(true)
  }

  const confirmDelete = async () => {
    if (!requestToDelete) return

    setDeleteLoading(true)
    try {
      await axios.delete(`${BaseUrl}/sup/support-requests/${requestToDelete._id}`, axiosConfig)
      showToast('Support request deleted successfully', 'success')
      fetchSupportRequests()
    } catch (error) {
      showToast('Failed to delete support request', 'danger')
      console.error('Error deleting support request:', error)
    } finally {
      setDeleteLoading(false)
      setDeleteModalVisible(false)
    }
  }

  const markAsAnswered = async (id) => {
    try {
      await axios.put(`${BaseUrl}/sup/support-requests/${id}/answered`, {}, axiosConfig)
      showToast('Support request marked as answered', 'success')
      fetchSupportRequests()
    } catch (error) {
      showToast('Failed to update support request', 'danger')
      console.error('Error updating support request:', error)
    }
  }

  const showToast = (message, color) => {
    setToast({ show: true, message, color })
    setTimeout(() => setToast({ ...toast, show: false }), 5000)
  }

  const handleFilterChange = (name, value) => {
    setFilters({ ...filters, [name]: value })
    setCurrentPage(1)
  }

  const clearFilters = () => {
    setFilters({
      answered: 'all',
      limit: 20,
    })
  }

  const formatDate = (dateString) => {
    const options = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }
    return new Date(dateString).toLocaleDateString(undefined, options)
  }

  return (
    <>
      <CCard className="shadow-lg border-0 rounded-3">
        <CCardHeader className="d-flex justify-content-between align-items-center bg-gradient-primary text-white">
          <h5 className="mb-0">Support Requests Management</h5>
          <div className="d-flex gap-2">
            <CButton color="light" onClick={clearFilters} className="text-primary">
              Clear Filters
            </CButton>
          </div>
        </CCardHeader>

        <CCardBody>
          {/* Filter Section */}
          <div className="mb-4">
            <CForm>
              <div className="row g-3">
                <div className="col-md-4">
                  <CFormSelect
                    value={filters.answered}
                    onChange={(e) => handleFilterChange('answered', e.target.value)}
                  >
                    <option value="all">All Statuses</option>
                    <option value="true">Answered</option>
                    <option value="false">Pending</option>
                  </CFormSelect>
                </div>
                <div className="col-md-4">
                  <CFormSelect
                    value={filters.limit}
                    onChange={(e) => handleFilterChange('limit', e.target.value)}
                  >
                    <option value="20">Show 20 items</option>
                    <option value="50">Show 50 items</option>
                    <option value="100">Show 100 items</option>
                  </CFormSelect>
                </div>
                <div className="col-md-4">
                  <CInputGroup>
                    <CInputGroupText>
                      <CIcon icon={cilSearch} />
                    </CInputGroupText>
                    <CFormInput
                      placeholder="Search requests..."
                      onChange={(e) => handleFilterChange('search', e.target.value)}
                    />
                  </CInputGroup>
                </div>
              </div>
            </CForm>
          </div>

          {/* Requests Table */}
          {loading ? (
            <div className="text-center py-5">
              <CSpinner color="primary" />
              <p className="mt-3">Loading support requests...</p>
            </div>
          ) : requests.length === 0 ? (
            <CAlert color="info" className="text-center">
              No support requests found matching your criteria.
            </CAlert>
          ) : (
            <>
              <div className="table-responsive">
                <CTable hover striped responsive className="align-middle">
                  <CTableHead className="bg-light">
                    <CTableRow>
                      <CTableHeaderCell>Table</CTableHeaderCell>
                      <CTableHeaderCell>Request Type</CTableHeaderCell>
                      <CTableHeaderCell>Date</CTableHeaderCell>
                      <CTableHeaderCell>Status</CTableHeaderCell>
                      <CTableHeaderCell>Actions</CTableHeaderCell>
                    </CTableRow>
                  </CTableHead>
                  <CTableBody>
                    {requests.map((request) => (
                      <CTableRow key={request._id}>
                        <CTableDataCell>
                          <strong>Table {request.table?.number}</strong>
                        </CTableDataCell>
                        <CTableDataCell>
                          <div className="d-flex align-items-center">
                            {request.requestType?.name}
                          </div>
                        </CTableDataCell>
                        <CTableDataCell>{formatDate(request.createdAt)}</CTableDataCell>
                        <CTableDataCell>
                          <CBadge color={request.answered ? 'success' : 'warning'}>
                            {request.answered ? 'Answered' : 'Pending'}
                          </CBadge>
                        </CTableDataCell>
                        <CTableDataCell>
                          <div className="d-flex gap-2">
                            {!request.answered && (
                              <CButton
                                color="success"
                                size="sm"
                                onClick={() => markAsAnswered(request._id)}
                              >
                                <CIcon icon={cilCheckCircle} />
                              </CButton>
                            )}
                            <CButton
                              color="danger"
                              size="sm"
                              onClick={() => handleDeleteClick(request)}
                            >
                              <CIcon icon={cilTrash} />
                            </CButton>
                          </div>
                        </CTableDataCell>
                      </CTableRow>
                    ))}
                  </CTableBody>
                </CTable>
              </div>
            </>
          )}
        </CCardBody>
      </CCard>

      {/* Delete Confirmation Modal */}
      <CModal
        visible={deleteModalVisible}
        onClose={() => setDeleteModalVisible(false)}
        backdrop="static"
      >
        <CModalHeader closeButton>
          <CModalTitle>Confirm Deletion</CModalTitle>
        </CModalHeader>
        <CModalBody>
          Are you sure you want to delete this support request from Table{' '}
          {requestToDelete?.table?.number}?
          <div className="mt-3">
            <strong>Request Type:</strong> {requestToDelete?.requestType?.name}
            <br />
            <strong>Date:</strong> {requestToDelete && formatDate(requestToDelete.createdAt)}
          </div>
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={() => setDeleteModalVisible(false)}>
            Cancel
          </CButton>
          <CButton color="danger" onClick={confirmDelete} disabled={deleteLoading}>
            {deleteLoading ? <CSpinner size="sm" /> : 'Delete'}
          </CButton>
        </CModalFooter>
      </CModal>

      {/* Toast Notifications */}
      <CToaster placement="top-end">
        <CToast
          visible={toast.show}
          color={toast.color}
          onClose={() => setToast({ ...toast, show: false })}
        >
          <CToastHeader closeButton>{toast.color === 'success' ? 'Success' : 'Error'}</CToastHeader>
          <CToastBody>{toast.message}</CToastBody>
        </CToast>
      </CToaster>
    </>
  )
}

export default SupportRequestsManager
