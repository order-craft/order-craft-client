import React, { useState } from 'react'
import {
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CForm,
  CFormInput,
  CFormFeedback,
  CFormLabel,
  CRow,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
} from '@coreui/react'
import axios from 'axios'
import { BaseUrl } from '../../helpers/BaseUrl'
import { useNavigate } from 'react-router-dom'
import Loading from '../../helpers/Loading'

const CreateUser = () => {
  const [validated, setValidated] = useState(false)
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    role: 'client',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [modalMessage, setModalMessage] = useState('')
  const [modalError, setModalError] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (event) => {
    event.preventDefault()
    const form = event.currentTarget
    if (form.checkValidity() === false) {
      event.stopPropagation()
    } else {
      setLoading(true)
      try {
        const token = localStorage.getItem('token')
        await axios.post(`${BaseUrl}/auth/superClient/create-user`, formData, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
        setLoading(false)
        setModalMessage('Client created successfully')
        setModalError(false)
        setShowModal(true)
        // Reset form on successful creation
        setFormData({
          fullName: '',
          email: '',
          password: '',
          role: 'client',
        })
        setError('')
      } catch (err) {
        setLoading(false)
        setModalMessage('Error creating client')
        setModalError(true)
        setShowModal(true)
        console.error(err)
      }
    }
    setValidated(true)
  }

  const handleChange = (e) => {
    const { id, value } = e.target
    setFormData((prevState) => ({
      ...prevState,
      [id]: value,
    }))
  }

  const handleCloseModal = () => {
    setShowModal(false)
    if (!modalError) {
      navigate('/users/usersList') // Navigate to the users list page if no error
    }
  }

  return (
    <CRow>
      <CCol xs={12}>
        <CCard className="mb-4">
          <CCardHeader>
            <strong>Create Client</strong>
          </CCardHeader>
          <CCardBody>
            {!loading && (
              <CForm
                className="row g-3 needs-validation"
                noValidate
                validated={validated}
                onSubmit={handleSubmit}
              >
                <CCol md={6}>
                  <CFormLabel htmlFor="fullName">Full Name</CFormLabel>
                  <CFormInput
                    type="text"
                    id="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
                    required
                  />
                  <CFormFeedback invalid>Please provide a valid name.</CFormFeedback>
                </CCol>
                <CCol md={6}>
                  <CFormLabel htmlFor="email">Email</CFormLabel>
                  <CFormInput
                    type="email"
                    id="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                  />
                  <CFormFeedback invalid>Please provide a valid email.</CFormFeedback>
                </CCol>
                <CCol md={6}>
                  <CFormLabel htmlFor="password">Password</CFormLabel>
                  <CFormInput
                    type="password"
                    id="password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                  />
                  <CFormFeedback invalid>Please provide a valid password.</CFormFeedback>
                </CCol>
                <CCol xs={12}>
                  <CButton disabled={loading} color="primary" type="submit">
                    {loading ? (
                      <>
                        {' '}
                        <CSpinner />
                        "Loading"
                      </>
                    ) : (
                      'Create Client'
                    )}
                  </CButton>
                </CCol>
              </CForm>
            )}
          </CCardBody>
        </CCard>
        <CModal visible={showModal} onClose={handleCloseModal}>
          <CModalHeader>
            <CModalTitle>{modalError ? 'Error' : 'Success'}</CModalTitle>
          </CModalHeader>
          <CModalBody>{modalMessage}</CModalBody>
          <CModalFooter>
            <CButton color="primary" onClick={handleCloseModal}>
              Close
            </CButton>
          </CModalFooter>
        </CModal>
      </CCol>
    </CRow>
  )
}

export default CreateUser
