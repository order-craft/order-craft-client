import React, { useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import { CButton, CFormInput, CModal, CModalBody, CModalFooter } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilEnvelopeOpen, cilUser, cilCamera, cilX } from '@coreui/icons'
import './profile.css'
import { useSelector } from 'react-redux'
import translations from '../../../app/Language'
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
  const [savingPhoto, setSavingPhoto] = useState(false)
  const t = useSelector((state) => state.language)
  const Language = translations[t]
  // reset the saving flag whenever the modal opens
  useEffect(() => {
    if (visible) setSavingPhoto(false)
  }, [visible])

  const initials = (data?.fullName || 'U').charAt(0).toUpperCase()
  const previewSrc = tempSrcProfile || data?.profilePicture

  const handleApplyPhoto = async () => {
    setSavingPhoto(true)
    try {
      await profileChange()
    } finally {
      setSavingPhoto(false)
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
          <CIcon icon={cilUser} />
          {Language.personalDetails}
        </h5>
        <button type="button" className="pf-modal-close" onClick={onClose} aria-label="Close">
          &times;
        </button>
      </div>

      {/* ---------- Body ---------- */}
      <CModalBody className="pf-modal-body">
        {/* Profile picture */}
        <div className="pf-section">
          <div className="pf-section-title">{Language.profilePicture}</div>
          <div className="pf-photo-row">
            <div className="pf-photo-wrap">
              {previewSrc ? (
                <img src={previewSrc} alt="Profile" className="pf-photo" />
              ) : (
                <div className="pf-photo-fallback">{initials}</div>
              )}
            </div>
            <div className="pf-photo-controls">
              <input
                id="pf-photo-upload"
                type="file"
                accept="image/*"
                onChange={(e) => changeProfilePic(e, 'profile')}
                style={{ display: 'none' }}
              />
              <label htmlFor="pf-photo-upload" className="pf-photo-btn">
                {Language.choosePhoto}
              </label>
              <CButton
                color="primary"
                onClick={handleApplyPhoto}
                disabled={!tempSrcProfile || savingPhoto}
              >
                <CIcon icon={cilCamera} className="me-2" />
                {savingPhoto ? Language.saving : Language.applyBtn}
              </CButton>
              <div className="pf-photo-hint">{Language.photoUploadHint}</div>
            </div>
          </div>
        </div>

        {/* Contact info */}
        <div className="pf-section">
          <div className="pf-section-title">{Language.contactInformation}</div>

          <label className="pf-field-label" htmlFor="pf-pd-email">
            {Language.emailAddress}
          </label>
          <CFormInput
            id="pf-pd-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />

          <label className="pf-field-label" htmlFor="pf-pd-phone" style={{ marginTop: 14 }}>
            {Language.personalPhone}
          </label>
          <CFormInput
            id="pf-pd-phone"
            type="tel"
            value={personalPhoneNumber}
            onChange={(e) => setPersonalPhoneNumber(e.target.value)}
            placeholder="Your personal phone number"
          />

          <p className="pf-modal-note" style={{ textAlign: 'left' }}>
            {Language.personalInfoHint}
          </p>
        </div>
      </CModalBody>

      {/* ---------- Footer ---------- */}
      <CModalFooter className="pf-modal-footer">
        <CButton color="secondary" variant="outline" onClick={onClose}>
          <CIcon icon={cilX} className="me-2" />
          {Language.close}
        </CButton>
        <CButton color="primary" onClick={sendEmailPDVerif}>
          <CIcon icon={cilEnvelopeOpen} className="me-2" />
          {Language.sendVerificationCode}
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
