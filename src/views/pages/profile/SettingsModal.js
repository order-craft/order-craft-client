import React from 'react'
import PropTypes from 'prop-types'
import {
  CModal,
  CModalHeader,
  CModalBody,
  CModalFooter,
  CForm,
  CFormInput,
  CButton,
  CCard,
  CCardBody,
  CFormLabel,
  CAlert,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilEnvelopeOpen, cilLockLocked, cilArrowLeft, cilX, cilSettings } from '@coreui/icons'

const SettingsModal = ({
  visible,
  onClose,
  emailSent,
  oldPassword,
  newPassword,
  confirmPassword,
  confirmationCode,
  setOldPassword,
  setNewPassword,
  setConfirmPassword,
  setConfirmationCode,
  setEmailSent,
  sendPwdVerificationCode,
  changePassword,
}) => {
  return (
    <CModal
      visible={visible}
      onClose={onClose}
      alignment="center"
      backdrop="static"
      className="modal-styled"
    >
      <CModalHeader className="bg-gradient-dark text-white">
        <CIcon icon={cilSettings} className="me-2" />
        Account Security Settings
      </CModalHeader>
      <CModalBody className="p-4">
        <CCard className="shadow-sm">
          <CCardBody>
            <h5 className="mb-4 text-dark">
              <CIcon icon={cilLockLocked} className="me-2" />
              Change Password
            </h5>

            {!emailSent ? (
              <>
                <CAlert color="info" className="mb-4">
                  For security reasons, we need to verify your identity before changing your
                  password.
                </CAlert>

                <div className="mb-4">
                  <CFormLabel className="fw-bold">Current Password</CFormLabel>
                  <CFormInput
                    onChange={(e) => setOldPassword(e.target.value)}
                    type="password"
                    placeholder="Enter your current password"
                    className="mb-3"
                    value={oldPassword}
                  />
                </div>

                <div className="d-grid">
                  <CButton
                    color="warning"
                    onClick={() => sendPwdVerificationCode(oldPassword)}
                    className="text-white"
                  >
                    <CIcon icon={cilEnvelopeOpen} className="me-2" />
                    Send Verification Email
                  </CButton>
                </div>
              </>
            ) : (
              <>
                <CAlert color="success" className="mb-4">
                  We have sent a verification code to your email. Please enter it below along with
                  your new password.
                </CAlert>

                <div className="mb-3">
                  <CFormLabel className="fw-bold">Verification Code</CFormLabel>
                  <CFormInput
                    type="text"
                    placeholder="Enter 6-digit code"
                    value={confirmationCode}
                    onChange={(e) => setConfirmationCode(e.target.value)}
                    className="mb-3"
                  />
                </div>

                <div className="mb-3">
                  <CFormLabel className="fw-bold">New Password</CFormLabel>
                  <CFormInput
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    type="password"
                    placeholder="Enter new password"
                    className="mb-3"
                  />
                </div>

                <div className="mb-4">
                  <CFormLabel className="fw-bold">Confirm New Password</CFormLabel>
                  <CFormInput
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    type="password"
                    placeholder="Confirm new password"
                  />
                </div>

                <div className="d-flex justify-content-between">
                  <CButton color="secondary" onClick={() => setEmailSent(false)} variant="outline">
                    <CIcon icon={cilArrowLeft} className="me-2" />
                    Back
                  </CButton>
                  <CButton
                    color="success"
                    onClick={() => changePassword(confirmationCode, newPassword, confirmPassword)}
                  >
                    <CIcon icon={cilLockLocked} className="me-2" />
                    Update Password
                  </CButton>
                </div>
              </>
            )}
          </CCardBody>
        </CCard>
      </CModalBody>
      <CModalFooter className="border-top-0">
        <CButton color="secondary" onClick={onClose} variant="outline">
          <CIcon icon={cilX} className="me-2" />
          Close
        </CButton>
      </CModalFooter>
    </CModal>
  )
}

SettingsModal.propTypes = {
  visible: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  emailSent: PropTypes.bool.isRequired,
  oldPassword: PropTypes.string,
  newPassword: PropTypes.string.isRequired,
  confirmPassword: PropTypes.string.isRequired,
  confirmationCode: PropTypes.string.isRequired,
  setOldPassword: PropTypes.func.isRequired,
  setNewPassword: PropTypes.func.isRequired,
  setConfirmPassword: PropTypes.func.isRequired,
  setConfirmationCode: PropTypes.func.isRequired,
  setEmailSent: PropTypes.func.isRequired,
  sendPwdVerificationCode: PropTypes.func.isRequired,
  changePassword: PropTypes.func.isRequired,
}

export default SettingsModal
