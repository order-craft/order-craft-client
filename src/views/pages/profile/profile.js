import React, { useEffect, useState } from 'react'
import { CButton, CCard, CCardBody, CCol, CRow, CSpinner, CAlert } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import {
  cilUser,
  cilCamera,
  cilBuilding,
  cilEnvelopeOpen,
  cilLocationPin,
  cilLockLocked,
  cilHome,
  cilWarning,
} from '@coreui/icons'
import axios from 'axios'
import { GetToken } from '../../../helpers/GetToken'
import { BaseUrl } from '../../../helpers/BaseUrl'
import PersonalDetailsModal from './personalDetailsModal'
import PlaceDetailsModal from './PlaceDetailsModal'
import SettingsModal from './SettingsModal'
import PDVerificationModal from './PDVerificationModal'
import AlertToast from '../../../components/toast/AlertToast'
import './profile.css'
import { useSelector } from 'react-redux'
import translations from '../../../app/Language'
const Profile = () => {
  const token = GetToken()

  // modal visibility
  const [visible, setVisible] = useState(false)
  const [detailsVisible, setDetailsVisible] = useState(false)
  const [visiblePDModal, setVisiblePDModal] = useState(false)
  const [pDVerifModal, setPDVerifModal] = useState(false)

  // loading / errors
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  // user data
  const [data, setUserData] = useState(null)
  const [email, setEmail] = useState('')
  const [personalPhoneNumber, setPersonalPhoneNumber] = useState('')
  const [placeData, setPlaceData] = useState({})
  const [tempSrcProfile, setTempSrcProfile] = useState('')

  // password flow
  const [emailSent, setEmailSent] = useState(false)
  const [confirmationCode, setConfirmationCode] = useState('')
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  // personal details flow
  const [PDVerifCode, setPDVerifCode] = useState('')
  const t = useSelector((state) => state.language)
  const Language = translations[t]
  /* ---------- fetch ---------- */
  const fetchUserData = async () => {
    setLoading(true)
    try {
      const response = await axios.get(`${BaseUrl}/auth/get-user`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const user = response.data
      setUserData(user)
      setEmail(user.email || '')
      setPersonalPhoneNumber(user.personalPhoneNumber || '')
      setPlaceData({
        placeName: user.placeName,
        PlaceAddress: user.PlaceAddress,
        phoneNumber: user.phoneNumber,
        distance: user.distance,
        logoPreview: user.placeLogo,
        picturePreview: user.placePicture,
        long: user.placeLocation?.long,
        lat: user.placeLocation?.lat,
        statusFlowEnabled: user.statusFlowEnabled === undefined ? true : user.statusFlowEnabled,
        brandColor: user.brandColor || '#8B5A2B',
      })
    } catch (err) {
      console.error('Error fetching user data:', err.response?.data || err.message)
      setError(err.response?.data?.error || "Couldn't load your profile. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUserData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* ---------- password ---------- */
  const sendPwdVerificationCode = async (oldPasswordValue) => {
    setLoading(true)
    try {
      const response = await axios.post(
        `${BaseUrl}/auth/client/pwd-verification-code`,
        { oldPassword: oldPasswordValue },
        { headers: { Authorization: `Bearer ${token}` } },
      )
      setMessage(response.data.message || 'Verification code sent.')
      setEmailSent(true)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send verification code')
    } finally {
      setLoading(false)
    }
  }

  const changePassword = async (verificationCode, newPasswordValue, confirmPasswordValue) => {
    setLoading(true)
    try {
      const response = await axios.post(
        `${BaseUrl}/auth/client/change-password`,
        {
          verificationCode,
          newPassword: newPasswordValue,
          confirmPassword: confirmPasswordValue,
        },
        { headers: { Authorization: `Bearer ${token}` } },
      )
      setMessage(response.data.message || 'Password updated.')
      setEmailSent(false)
      setNewPassword('')
      setOldPassword('')
      setConfirmPassword('')
      setConfirmationCode('')
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to change password')
    } finally {
      setLoading(false)
    }
  }

  /* ---------- profile picture ---------- */
  const changeProfilePic = (e, picType) => {
    const file = e.target.files?.[0]
    if (file) previewFile(file, picType)
  }

  const previewFile = (file, picType) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onloadend = () => {
      if (picType === 'profile') setTempSrcProfile(reader.result)
      if (picType === 'logo') setPlaceData((prev) => ({ ...prev, logoPreview: reader.result }))
      if (picType === 'place') setPlaceData((prev) => ({ ...prev, picturePreview: reader.result }))
    }
  }

  const profileChange = async () => {
    setLoading(true)
    try {
      const response = await axios.post(
        `${BaseUrl}/auth/superClient/change-profile`,
        { image: tempSrcProfile },
        { headers: { Authorization: `Bearer ${token}` } },
      )
      setMessage(response.data.message || 'Profile picture updated.')
      setTempSrcProfile('')
      fetchUserData()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to change profile')
    } finally {
      setLoading(false)
    }
  }

  /* ---------- business details ---------- */
  const updateBusinessDetails = async () => {
    setLoading(true)
    try {
      const response = await axios.post(
        `${BaseUrl}/auth/superClient/update-business-details`,
        { placeData },
        { headers: { Authorization: `Bearer ${token}` } },
      )
      setMessage(response.data.message || 'Business details updated.')
      setDetailsVisible(false)
      fetchUserData()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to change business details')
    } finally {
      setLoading(false)
    }
  }

  /* ---------- personal details ---------- */
  const sendEmailPDVerif = async () => {
    setLoading(true)
    try {
      const response = await axios.post(
        `${BaseUrl}/auth/client/personal-details-change`,
        {
          newemail: email,
          newpersonalPhoneNumber: personalPhoneNumber,
        },
        { headers: { Authorization: `Bearer ${token}` } },
      )
      setVisiblePDModal(false)
      setPDVerifModal(true)
      setMessage(response.data.message || 'Verification email sent.')
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send verification code')
    } finally {
      setLoading(false)
    }
  }

  const confirmChangePDCode = async () => {
    setLoading(true)
    try {
      const response = await axios.post(
        `${BaseUrl}/auth/client/verify-pd-change-code`,
        { PDVerifCode },
        { headers: { Authorization: `Bearer ${token}` } },
      )
      setPDVerifModal(false)
      setPDVerifCode('')
      fetchUserData()
      setMessage(response.data.message || 'Personal details updated.')
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to verify the code')
    } finally {
      setLoading(false)
    }
  }

  /* ---------- place handlers ---------- */
  const handleChange = (e) => {
    const { name, value } = e.target
    setPlaceData((prev) => ({ ...prev, [name]: value }))
  }

  const handleFileChange = (e, type) => {
    const file = e.target.files?.[0]
    const previewUrl = file ? URL.createObjectURL(file) : ''
    if (type === 'logo') setPlaceData((prev) => ({ ...prev, logoPreview: previewUrl }))
    else if (type === 'picture') setPlaceData((prev) => ({ ...prev, picturePreview: previewUrl }))
  }

  /* ---------- render ---------- */
  if (loading && !data) {
    return (
      <div className="pf-loading">
        <CSpinner color="primary" />
      </div>
    )
  }

  if (error && !data) {
    return (
      <div className="pf-error-page">
        <CAlert color="danger" className="d-flex align-items-center gap-2">
          <CIcon icon={cilWarning} />
          <div style={{ flex: 1 }}>{error}</div>
          <CButton size="sm" color="danger" onClick={fetchUserData}>
            {Language.retry}
          </CButton>
        </CAlert>
      </div>
    )
  }

  const initial = (data?.fullName || 'U').charAt(0).toUpperCase()
  const placeInitial = (data?.placeName || 'B').charAt(0).toUpperCase()

  return (
    <div className="pf-page">
      <CRow className="g-4">
        {/* ---------- Left column: identity card ---------- */}
        <CCol xs={12} lg={5}>
          <div className="pf-card pf-identity">
            {/* Header band */}
            <div className="pf-band">
              <div className="pf-avatar">
                {data?.profilePicture ? (
                  <img
                    src={data.profilePicture}
                    alt={data.fullName || 'Profile'}
                    className="pf-avatar-img"
                  />
                ) : (
                  <div className="pf-avatar-fallback">{initial}</div>
                )}
              </div>
            </div>

            <div className="pf-identity-body">
              <div className="pf-name">{data?.fullName || Language.FullName}</div>
              <div className="pf-role">
                <CIcon icon={cilBuilding} />
                {data?.placeName || Language.placeName}
              </div>

              <div className="pf-info-list">
                <div className="pf-info-row">
                  <div className="pf-info-icon">
                    <CIcon icon={cilEnvelopeOpen} />
                  </div>
                  <div className="pf-info-text">
                    <div className="pf-info-label">{Language.emailAddress}</div>{' '}
                    <div className="pf-info-value">{data?.email || '—'}</div>
                  </div>
                </div>
                <div className="pf-info-row">
                  <div className="pf-info-icon">
                    <CIcon icon={cilLocationPin} />
                  </div>
                  <div className="pf-info-text">
                    <div className="pf-info-label">{Language.location}</div>{' '}
                    <div className="pf-info-value">{data?.PlaceAddress || '—'}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CCol>

        {/* ---------- Right column: actions ---------- */}
        <CCol xs={12} lg={7}>
          {/* Account security */}
          <div className="pf-card">
            <div className="pf-card-header">
              <CIcon icon={cilLockLocked} />
              <span>{Language.accountSecurity}</span>
            </div>
            <div className="pf-card-body">
              <p className="pf-card-hint">{Language.passwordHint}</p>
              <CButton color="primary" onClick={() => setVisible(true)} className="pf-btn">
                <CIcon icon={cilLockLocked} className="me-2" />
                {Language.changePassword}
              </CButton>
            </div>
          </div>

          {/* Business */}
          <div className="pf-card">
            <div className="pf-card-header">
              <CIcon icon={cilHome} />
              <span>{Language.businessDetails}</span>
            </div>
            <div className="pf-card-body">
              <div className="pf-preview-row">
                <div className="pf-preview-badge">
                  {data?.placeLogo ? (
                    <img src={data.placeLogo} alt="Place logo" className="pf-preview-img" />
                  ) : (
                    <div className="pf-preview-fallback">{placeInitial}</div>
                  )}
                </div>
                <div className="pf-preview-text">
                  <div className="pf-info-value">{data?.placeName || Language.placeName}</div>
                  <div className="pf-info-label">{data?.PlaceAddress || Language.location}</div>
                </div>
              </div>
              <p className="pf-card-hint">{Language.businessDetailsHint}</p>
              <CButton
                color="secondary"
                variant="outline"
                onClick={() => setDetailsVisible(true)}
                className="pf-btn"
              >
                <CIcon icon={cilHome} className="me-2" />
                {Language.editBusinessDetails}
              </CButton>
            </div>
          </div>

          {/* Personal */}
          <div className="pf-card">
            <div className="pf-card-header">
              <CIcon icon={cilUser} />
              <span>{Language.personalInformation}</span>
            </div>
            <div className="pf-card-body">
              <p className="pf-card-hint">{Language.personalInfoHint}</p>
              <CButton
                color="secondary"
                variant="outline"
                onClick={() => setVisiblePDModal(true)}
                className="pf-btn"
              >
                <CIcon icon={cilUser} className="me-2" />
                {Language.editPersonalInformation}
              </CButton>
            </div>
          </div>
        </CCol>
      </CRow>

      {/* ---------- Modals ---------- */}
      <SettingsModal
        visible={visible}
        onClose={() => setVisible(false)}
        emailSent={emailSent}
        oldPassword={oldPassword}
        newPassword={newPassword}
        confirmPassword={confirmPassword}
        confirmationCode={confirmationCode}
        setOldPassword={setOldPassword}
        setNewPassword={setNewPassword}
        setConfirmPassword={setConfirmPassword}
        setConfirmationCode={setConfirmationCode}
        setEmailSent={setEmailSent}
        sendPwdVerificationCode={sendPwdVerificationCode}
        changePassword={changePassword}
      />

      <PlaceDetailsModal
        visible={detailsVisible}
        onClose={() => setDetailsVisible(false)}
        data={placeData}
        onChange={handleChange}
        onFileChange={changeProfilePic}
        onSave={updateBusinessDetails}
      />

      <PersonalDetailsModal
        visible={visiblePDModal}
        onClose={() => setVisiblePDModal(false)}
        email={email}
        setEmail={setEmail}
        personalPhoneNumber={personalPhoneNumber}
        setPersonalPhoneNumber={setPersonalPhoneNumber}
        sendEmailPDVerif={sendEmailPDVerif}
        changeProfilePic={changeProfilePic}
        tempSrcProfile={tempSrcProfile}
        profileChange={profileChange}
        data={data}
      />

      <PDVerificationModal
        visible={pDVerifModal}
        onClose={() => setPDVerifModal(false)}
        PDVerifCode={PDVerifCode}
        setPDVerifCode={setPDVerifCode}
        onConfirm={confirmChangePDCode}
      />

      <AlertToast message={message} setMessage={setMessage} type="success" />
      <AlertToast message={error} setMessage={setError} type="danger" />
    </div>
  )
}

export default Profile
