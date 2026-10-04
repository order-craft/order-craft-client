import React, { useEffect, useState } from 'react'
import {
  CAvatar,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CRow,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
  CForm,
  CFormInput,
  CFormLabel,
  CFormFeedback,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilPeople, cilPencil, cilTrash } from '@coreui/icons'
import axios from 'axios'
import { BaseUrl } from '../../helpers/BaseUrl'
import Loading from '../../helpers/Loading'
import { useSelector } from 'react-redux'
import translations from '../../app/Language'

const Dashboard = () => {
  const [clients, setClients] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editUser, setEditUser] = useState(null)
  const [validated, setValidated] = useState(false)
  const [modalMessage, setModalMessage] = useState('')
  const [modalError, setModalError] = useState(false)
  // Language
  const t = useSelector((state) => state.language)
  const Language = translations[t]
  useEffect(() => {
    const fetchClients = async () => {
      setLoading(true)
      try {
        const token = localStorage.getItem('token') // Assuming token is stored in local storage
        const response = await axios.get(`${BaseUrl}/auth/superClient/getUsers`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
        console.log(response.data)
        setClients(response.data)
      } catch (err) {
        setError('Error fetching clients')
        console.error(err)
      }
      setLoading(false)
    }
    fetchClients()
  }, [])

  const handleEdit = (client) => {
    setEditUser(client)
    setShowEditModal(true)
  }

  const handleDelete = async (clientId) => {
    const conf = confirm('Are you sure you want to delete this user?')
    if (conf) {
      setLoading(true)
      try {
        const token = localStorage.getItem('token')
        await axios.delete(`${BaseUrl}/auth/superClient/${clientId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
        setClients(clients.filter((client) => client._id !== clientId))
        console.log(`Deleted client with ID: ${clientId}`)
      } catch (err) {
        setError('Error deleting client')
        console.error(err)
      }
      setLoading(false)
    }
  }

  const handleToggleActive = async (clientId, currentStatus) => {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const newStatus = !currentStatus
      console.log(currentStatus)
      await axios.patch(
        `${BaseUrl}/auth/superClient/${clientId}/verify`,
        {
          verified: newStatus,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      )
      setClients(
        clients.map((client) =>
          client._id === clientId ? { ...client, verified: newStatus } : client,
        ),
      )
      console.log(`Toggled client with ID: ${clientId} to ${newStatus ? 'active' : 'inactive'}`)
    } catch (err) {
      setError('Error toggling active status')
      console.error(err)
    }
    setLoading(false)
  }

  const handleUpdate = async (event) => {
    event.preventDefault()
    const form = event.currentTarget
    if (form.checkValidity() === false) {
      event.stopPropagation()
    } else {
      setLoading(true)
      try {
        const token = localStorage.getItem('token')
        await axios.put(`${BaseUrl}/auth/superClient/update-user/${editUser._id}`, editUser, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
        setClients(
          clients.map((client) =>
            client._id === editUser._id ? { ...client, ...editUser } : client,
          ),
        )
        setLoading(false)
        setModalMessage('User updated successfully')
        setModalError(false)
        setShowEditModal(false)
      } catch (err) {
        setLoading(false)
        setModalMessage('Error updating user')
        setModalError(true)
        console.error(err)
      }
    }
    setValidated(true)
  }

  const handleEditChange = (e) => {
    const { id, value } = e.target
    setEditUser((prevState) => ({
      ...prevState,
      [id]: value,
    }))
  }

  return (
    <>
      <CRow>
        <CCol xs>
          <CCard className="mb-4">
            <CCardHeader>{Language.users}</CCardHeader>
            <CCardBody>
              {loading && <Loading />}
              {error && <p>{error}</p>}
              <CTable align="middle" className="mb-0 border" hover responsive>
                <CTableHead className="text-nowrap">
                  <CTableRow>
                    <CTableHeaderCell className="bg-body-tertiary">
                      {Language.user}
                    </CTableHeaderCell>
                    <CTableHeaderCell className="bg-body-tertiary text-center">
                      {Language.email}
                    </CTableHeaderCell>
                    <CTableHeaderCell className="bg-body-tertiary text-center">
                      {Language.role}
                    </CTableHeaderCell>
                    <CTableHeaderCell className="bg-body-tertiary text-center">
                      {Language.active}
                    </CTableHeaderCell>
                    <CTableHeaderCell className="bg-body-tertiary text-center">
                      {Language.actions}
                    </CTableHeaderCell>
                  </CTableRow>
                </CTableHead>
                <CTableBody>
                  {clients.map((client) => (
                    <CTableRow key={client._id}>
                      <CTableDataCell>
                        <div>{client.fullName}</div>
                      </CTableDataCell>
                      <CTableDataCell className="text-center">{client.email}</CTableDataCell>
                      <CTableDataCell className="text-center">{client.role}</CTableDataCell>
                      <CTableDataCell className="text-center">
                        <input
                          type="checkbox"
                          checked={client.verified}
                          onChange={() => handleToggleActive(client._id, client.verified)}
                        />
                      </CTableDataCell>
                      <CTableDataCell className="text-center">
                        <CButton
                          color="primary"
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(client)}
                        >
                          <CIcon icon={cilPencil} />
                        </CButton>{' '}
                        <CButton
                          color="danger"
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(client._id)}
                        >
                          <CIcon icon={cilTrash} />
                        </CButton>
                      </CTableDataCell>
                    </CTableRow>
                  ))}
                </CTableBody>
              </CTable>
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>

      <CModal visible={showEditModal} onClose={() => setShowEditModal(false)}>
        <CModalHeader>
          <CModalTitle>{Language.edit + ' ' + Language.user}</CModalTitle>
        </CModalHeader>
        <CModalBody>
          <CForm
            className="row g-3 needs-validation"
            noValidate
            validated={validated}
            onSubmit={handleUpdate}
          >
            <CCol md={6}>
              <CFormLabel htmlFor="editFullName">{Language.FullName}</CFormLabel>
              <CFormInput
                type="text"
                id="fullName"
                value={editUser?.fullName || ''}
                onChange={handleEditChange}
                required
              />
              <CFormFeedback invalid>Please provide a valid name.</CFormFeedback>
            </CCol>
            <CCol md={6}>
              <CFormLabel htmlFor="editEmail">{Language.email}</CFormLabel>
              <CFormInput
                type="email"
                id="email"
                value={editUser?.email || ''}
                onChange={handleEditChange}
                required
              />
              <CFormFeedback invalid>Please provide a valid email.</CFormFeedback>
            </CCol>

            <CCol xs={12}>
              <CButton color="primary" type="submit">
                {Language.update + ' ' + Language.user}
              </CButton>
            </CCol>
          </CForm>
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={() => setShowEditModal(false)}>
            {Language.cancel}
          </CButton>
        </CModalFooter>
      </CModal>

      <CModal visible={!!modalMessage} onClose={() => setModalMessage('')}>
        <CModalHeader>
          <CModalTitle>{modalError ? 'Error' : 'Success'}</CModalTitle>
        </CModalHeader>
        <CModalBody>{modalMessage}</CModalBody>
        <CModalFooter>
          <CButton color="primary" onClick={() => setModalMessage('')}>
            Close
          </CButton>
        </CModalFooter>
      </CModal>
    </>
  )
}

export default Dashboard
