import React, { useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import { CButton, CFormInput, CModal, CModalBody, CModalFooter } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import {
  cilEnvelopeOpen,
  cilLockLocked,
  cilArrowLeft,
  cilX,
  cilCheck,
  cilWarning,
} from '@coreui/icons'
import './profile.css'

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
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (visible) {
      setSubmitting(false)
      setError('')
    }
  }, [visible])

  /* ---------- step 1: request a code ---------- */
  const handleSendCode = async () => {
    if (!oldPassword) {
      setError('Enter your current password first.')
      return
    }
    setError('')
    setSubmitting(true)
    try {
      await sendPwdVerificationCode(oldPassword)
    } finally {
      setSubmitting(false)
    }
  }

  /* ---------- step 2: submit new password ---------- */
  const handleChangePassword = async () => {
    if (!confirmationCode || confirmationCode.length < 6) {
      setError('Enter the 6-digit code from your email.')
      return
    }
    if (!newPassword || newPassword.length < 6) {
      setError('Your new password must be at least 6 characters.')
      return
    }
    if (newPassword !== confirmPassword) {
      setError("The two passwords don't match.")
      return
    }
    setError('')
    setSubmitting(true)
    try {
      await changePassword(confirmationCode, newPassword, confirmPassword)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <CModal
      visible={visible}
      onClose={onClose}
      alignment="center"
      backdrop="static"
      size="lg"
      className="pf-modal"
    >
      {/* ---------- Header ---------- */}
      <div className="pf-modal-header">
        <h5 className="pf-modal-title">
          <CIcon icon={cilLockLocked} />
          Account security
        </h5>
        <button type="button" className="pf-modal-close" onClick={onClose} aria-label="Close">
          &times;
        </button>
      </div>

      {/* ---------- Body ---------- */}
      <CModalBody className="pf-modal-body">
        {error && (
          <div className="pf-modal-error">
            <CIcon icon={cilWarning} />
            <span>{error}</span>
          </div>
        )}

        {!emailSent ? (
          /* ----- Step 1: current password ----- */
          <div className="pf-section">
            <div className="pf-section-title">Step 1 · Verify your identity</div>
            <p className="pf-modal-hint">
              For security, we'll send a 6-digit code to the email address on your account before
              you can change your password.
            </p>

            <label className="pf-field-label" htmlFor="pf-old-password">
              Current password
            </label>
            <CFormInput
              id="pf-old-password"
              type="password"
              placeholder="Enter your current password"
              value={oldPassword}
              autoFocus
              autoComplete="current-password"
              onChange={(e) => {
                setOldPassword(e.target.value)
                if (error) setError('')
              }}
            />
          </div>
        ) : (
          /* ----- Step 2: code + new password ----- */
          <div className="pf-section">
            <div className="pf-section-title">Step 2 · Set a new password</div>
            <p className="pf-modal-hint">
              We've emailed a code to you. Enter it below along with your new password.
            </p>

            <label className="pf-field-label" htmlFor="pf-code">
              Verification code
            </label>
            <CFormInput
              id="pf-code"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              placeholder="000000"
              value={confirmationCode}
              autoFocus
              onChange={(e) => {
                setConfirmationCode(e.target.value.replace(/\D/g, '').slice(0, 6))
                if (error) setError('')
              }}
              className="pf-code-input"
            />

            <label className="pf-field-label" htmlFor="pf-new-password" style={{ marginTop: 14 }}>
              New password
            </label>
            <CFormInput
              id="pf-new-password"
              type="password"
              placeholder="At least 6 characters"
              value={newPassword}
              autoComplete="new-password"
              onChange={(e) => {
                setNewPassword(e.target.value)
                if (error) setError('')
              }}
            />

            <label
              className="pf-field-label"
              htmlFor="pf-confirm-password"
              style={{ marginTop: 14 }}
            >
              Confirm new password
            </label>
            <CFormInput
              id="pf-confirm-password"
              type="password"
              placeholder="Repeat the new password"
              value={confirmPassword}
              autoComplete="new-password"
              onChange={(e) => {
                setConfirmPassword(e.target.value)
                if (error) setError('')
              }}
            />
          </div>
        )}
      </CModalBody>

      {/* ---------- Footer ---------- */}
      <CModalFooter className="pf-modal-footer">
        {!emailSent ? (
          <>
            <CButton color="secondary" variant="outline" onClick={onClose} disabled={submitting}>
              <CIcon icon={cilX} className="me-2" />
              Cancel
            </CButton>
            <CButton color="primary" onClick={handleSendCode} disabled={submitting || !oldPassword}>
              <CIcon icon={cilEnvelopeOpen} className="me-2" />
              {submitting ? 'Sending…' : 'Send verification code'}
            </CButton>
          </>
        ) : (
          <>
            <CButton
              color="secondary"
              variant="outline"
              onClick={() => {
                setEmailSent(false)
                setError('')
              }}
              disabled={submitting}
            >
              <CIcon icon={cilArrowLeft} className="me-2" />
              Back
            </CButton>
            <CButton
              color="success"
              onClick={handleChangePassword}
              disabled={
                submitting ||
                !confirmationCode ||
                confirmationCode.length < 6 ||
                !newPassword ||
                !confirmPassword
              }
            >
              <CIcon icon={cilCheck} className="me-2" />
              {submitting ? 'Updating…' : 'Update password'}
            </CButton>
          </>
        )}
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
