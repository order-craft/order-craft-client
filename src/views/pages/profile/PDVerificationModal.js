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
  CCard,
  CCardBody,
  CAlert,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilCheckCircle, cilEnvelopeOpen, cilX } from '@coreui/icons'

const PDVerificationModal = ({ visible, onClose, PDVerifCode, setPDVerifCode, onConfirm }) => {
  return (
    <CModal
      visible={visible}
      onClose={onClose}
      alignment="center"
      backdrop="static"
      className="modal-styled"
      size="sm"
    >
      <CModalHeader className="bg-gradient-success text-white">
        <CIcon icon={cilEnvelopeOpen} className="me-2" />
        Email Verification
      </CModalHeader>
      <CModalBody className="p-4">
        <CCard className="shadow-sm border-0">
          <CCardBody>
            <CAlert color="info" className="text-center mb-4">
              We have sent a verification code to your email address. Please enter it below.
            </CAlert>

            <div className="mb-4">
              <CFormLabel className="fw-bold">Verification Code</CFormLabel>
              <CFormInput
                value={PDVerifCode}
                onChange={(e) => setPDVerifCode(e.target.value)}
                type="text"
                placeholder="Enter 6-digit code"
                className="text-center fw-bold fs-4 py-3"
                maxLength="6"
              />
              <small className="text-muted d-block mt-1 text-center">
                Check your email inbox for the code
              </small>
            </div>

            <div className="d-grid gap-2">
              <CButton
                color="success"
                onClick={onConfirm}
                disabled={!PDVerifCode || PDVerifCode.length < 6}
              >
                <CIcon icon={cilCheckCircle} className="me-2" />
                Verify & Continue
              </CButton>
            </div>
          </CCardBody>
        </CCard>
      </CModalBody>
      <CModalFooter className="border-top-0 justify-content-center">
        <CButton color="secondary" onClick={onClose} variant="outline">
          <CIcon icon={cilX} className="me-2" />
          Cancel Verification
        </CButton>
      </CModalFooter>
    </CModal>
  )
}

PDVerificationModal.propTypes = {
  visible: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  PDVerifCode: PropTypes.string.isRequired,
  setPDVerifCode: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
}

export default PDVerificationModal
