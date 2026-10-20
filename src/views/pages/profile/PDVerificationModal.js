import React from 'react'
import PropTypes from 'prop-types'
import { CButton, CFormInput, CModal, CModalBody, CModalFooter } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilCheckCircle, cilEnvelopeOpen, cilX, cilWarning } from '@coreui/icons'
import './profile.css'
import { useSelector } from 'react-redux'
import translations from '../../../app/Language'
const PDVerificationModal = ({
  visible,
  onClose,
  PDVerifCode,
  setPDVerifCode,
  onConfirm,
  loading = false,
  error = '',
}) => {
  const code = String(PDVerifCode || '')
  const canSubmit = code.length === 6 && !loading
  const t = useSelector((state) => state.language)
  const Language = translations[t]
  return (
    <CModal
      visible={visible}
      onClose={onClose}
      alignment="center"
      backdrop="static"
      size="sm"
      className="pf-modal"
    >
      {/* ---------- Header ---------- */}
      <div className="pf-modal-header">
        <h5 className="pf-modal-title">
          <CIcon icon={cilEnvelopeOpen} />
          {Language.emailVerification || 'Email verification'}
        </h5>
        <button
          type="button"
          className="pf-modal-close"
          onClick={onClose}
          aria-label={Language.close || 'Close'}
        >
          &times;
        </button>
      </div>

      {/* ---------- Body ---------- */}
      <CModalBody className="pf-modal-body">
        <p className="pf-modal-hint">
          {Language.verifyCodeHint ||
            "We've sent a 6-digit code to your email. Enter it below to confirm your new details."}
        </p>

        {error && (
          <div className="pf-modal-error">
            <CIcon icon={cilWarning} />
            <span>{error}</span>
          </div>
        )}

        <label className="pf-field-label" htmlFor="pf-code">
          {Language.verificationCode || 'Verification code'}
        </label>
        <CFormInput
          id="pf-code"
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={code}
          onChange={(e) => setPDVerifCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          placeholder="000000"
          maxLength={6}
          autoFocus
          className="pf-code-input"
        />
        <p className="pf-modal-note">
          {Language.checkInbox || 'Check your email inbox. The code expires in a few minutes.'}
        </p>
      </CModalBody>

      {/* ---------- Footer ---------- */}
      <CModalFooter className="pf-modal-footer">
        <CButton color="secondary" variant="outline" onClick={onClose} disabled={loading}>
          <CIcon icon={cilX} className="me-2" />
          {Language.cancel || 'Cancel'}
        </CButton>
        <CButton color="success" onClick={onConfirm} disabled={!canSubmit}>
          <CIcon icon={cilCheckCircle} className="me-2" />
          {loading ? Language.verifying || 'Verifying…' : Language.verify || 'Verify'}
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
  loading: PropTypes.bool,
  error: PropTypes.string,
}

export default PDVerificationModal
