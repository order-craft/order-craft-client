import React from 'react'
import PropTypes from 'prop-types'
import {
  CModal,
  CModalHeader,
  CModalBody,
  CModalFooter,
  CForm,
  CFormLabel,
  CFormInput,
  CButton,
  CImage,
  CRow,
  CCol,
  CCard,
  CCardBody,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilEnvelopeOpen, cilUser, cilPhone, cilCamera } from '@coreui/icons'

const PersonalDetailsModal = ({
  visible,
  onClose,
  email,
  setEmail,
  personalPhoneNumber,
  setPersonalPhoneNumber,
  sendEmailPDVerif,
  changeProfilePic,
  tempSrcProfile,
  profileChange,
  data,
}) => {
  return (
    <CModal
      visible={visible}
      onClose={onClose}
      alignment="center"
      backdrop="static"
      className="modal-styled"
    >
      <CModalHeader className="bg-gradient-primary text-white">
        <CIcon icon={cilUser} className="me-2" />
        <i style={{ color: 'black' }}>Personal Details</i>
      </CModalHeader>
      <CModalBody className="p-4">
        <CCard className="shadow-sm">
          <CCardBody>
            <h5 className="mb-4 text-primary">Profile Picture</h5>

            <CRow className="align-items-center">
              <CCol md={4} className="text-center">
                <div className="profile-pic-container mb-3">
                  <CImage
                    src={tempSrcProfile !== '' ? tempSrcProfile : data?.profilePicture}
                    alt="Profile"
                    height={120}
                    width={120}
                    className="rounded-circle shadow-lg border border-3 border-primary"
                  />
                </div>
              </CCol>

              <CCol md={8}>
                <CFormLabel className="fw-bold">Upload New Photo</CFormLabel>
                <div className="d-flex align-items-center">
                  <CFormInput
                    onChange={(e) => changeProfilePic(e, 'profile')}
                    type="file"
                    className="me-2"
                    id="profile-upload"
                  />
                  <CButton
                    color="primary"
                    onClick={profileChange}
                    shape="rounded-pill"
                    variant="outline"
                  >
                    <CIcon icon={cilCamera} className="me-2" />
                    Apply
                  </CButton>
                </div>
                <small className="text-muted">JPG, GIF or PNG. Max size 2MB</small>
              </CCol>
            </CRow>
          </CCardBody>
        </CCard>
        <CCard className="shadow-sm mt-4">
          <CCardBody>
            <h5 className="mb-4 text-primary">Contact Information</h5>

            <CRow className="mb-3">
              <CCol md={12}>
                <CFormLabel className="fw-bold">Email Address</CFormLabel>
                <CFormInput
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                  placeholder="your.email@example.com"
                  className="mb-3"
                />
              </CCol>
            </CRow>

            <CRow className="mb-3">
              <CCol md={12}>
                <CFormLabel className="fw-bold">Phone Number</CFormLabel>
                <CFormInput
                  value={personalPhoneNumber}
                  onChange={(e) => setPersonalPhoneNumber(e.target.value)}
                  type="tel"
                  placeholder="+1 (123) 456-7890"
                />
              </CCol>
            </CRow>

            <CRow>
              <CCol md={12} className="text-end">
                <CButton
                  color="primary"
                  onClick={sendEmailPDVerif}
                  className="mt-2"
                  shape="rounded-pill"
                >
                  <CIcon icon={cilEnvelopeOpen} className="me-2" />
                  Update Credentials
                </CButton>
              </CCol>
            </CRow>
          </CCardBody>
        </CCard>
      </CModalBody>
      <CModalFooter className="border-top-0">
        <CButton color="secondary" onClick={onClose} shape="rounded-pill">
          Close
        </CButton>
      </CModalFooter>
    </CModal>
  )
}

PersonalDetailsModal.propTypes = {
  visible: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  email: PropTypes.string.isRequired,
  setEmail: PropTypes.func.isRequired,
  personalPhoneNumber: PropTypes.string.isRequired,
  setPersonalPhoneNumber: PropTypes.func.isRequired,
  sendEmailPDVerif: PropTypes.func.isRequired,
  changeProfilePic: PropTypes.func.isRequired,
  profileChange: PropTypes.func.isRequired,
  tempSrcProfile: PropTypes.string,
  data: PropTypes.object,
}

export default PersonalDetailsModal
