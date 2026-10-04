import React, { useEffect, useState } from 'react'
import {
  CCard,
  CCardBody,
  CCardHeader,
  CCardImage,
  CCardText,
  CCardTitle,
  CButton,
  CRow,
  CCol,
  CSpinner,
} from '@coreui/react'
import { CIcon } from '@coreui/icons-react'
import {
  cilUser,
  cilCamera,
  cilBuilding,
  cilEnvelopeOpen,
  cilLocationPin,
  cilLockLocked,
  cilHome,
} from '@coreui/icons'
import { GetToken } from '../../../helpers/GetToken'
import { BaseUrl } from '../../../helpers/BaseUrl'
import PersonalDetailsModal from './personalDetailsModal'
import PlaceDetailsModal from './PlaceDetailsModal'
import SettingsModal from './SettingsModal'
import PDVerificationModal from './PDVerificationModal'

import axios from 'axios'
import AlertToast from './AlertToast'

const Profile = () => {
  const [visible, setVisible] = useState(false)
  const [DetailsVisible, setDetailsVisible] = useState(false)

  const [emailSent, setEmailSent] = useState(false)
  const [confirmationCode, setConfirmationCode] = useState('')

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [data, setUserDate] = useState()
  const token = GetToken()
  const [tempSrcProfile, setTempSrcProfile] = useState('')

  const fetchUserData = async () => {
    setLoading(true)
    try {
      const response = await axios.get(`${BaseUrl}/auth/get-user`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      const userData = response.data
      console.log(response.data)
      setPlaceData({
        placeName: response.data.placeName,
        PlaceAddress: response.data.PlaceAddress,
        phoneNumber: response.data.phoneNumber,
        distance: response.data.distance,
        logoPreview: response.data.placeLogo,
        picturePreview: response.data.placePicture,
        long: response.data.placeLocation.long,
        lat: response.data.placeLocation.lat,
      })
      setUserDate(userData)
      setEmail(response.data.email)
      setPersonalPhoneNumber(response.data.personalPhoneNumber)
    } catch (error) {
      console.error('Error fetching user data:', error.response?.data || error.message)
    } finally {
      setLoading(false)
    }
  }
  //send verification code to change pwd
  const [oldPassword, setOldPassword] = useState('')
  const [message, setMessage] = useState('')

  const sendPwdVerificationCode = async (oldPassword) => {
    setLoading(true)

    try {
      const response = await axios.post(
        `${BaseUrl}/auth/client/pwd-verification-code`,
        { oldPassword }, // Only send oldPassword for this step
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      )

      // Handle successful response
      console.log('Verification email sent:', response.data.message)
      setMessage(response.data.message) // Show success message in UI
      setEmailSent(true)
    } catch (error) {
      console.error('Error sending verification code:', error.response?.data || error.message)

      // Display error message in UI
      setError(error.response?.data?.error || 'Failed to send verification code')
    } finally {
      setLoading(false)
    }
  }
  //change pwd after sending verification code
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const changePassword = async (verificationCode, newPassword, confirmPassword) => {
    setLoading(true)

    try {
      const response = await axios.post(
        `${BaseUrl}/auth/client/change-password`,
        { verificationCode, newPassword, confirmPassword }, // Send the verification code and new passwords
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      )

      // Handle successful response
      console.log('Password changed successfully:', response.data.message)
      setMessage(response.data.message) // Show success message in UI
      setEmailSent(false)
      setNewPassword('')
      setOldPassword('')
      setConfirmPassword('')
      setConfirmationCode('')
    } catch (error) {
      console.error('Error changing password:', error.response?.data || error.message)

      // Display error message in UI
      setError(error.response?.data?.error || 'Failed to change password')
    } finally {
      setLoading(false)
    }
  }

  const changeProfilePic = (e, picType) => {
    const file = e.target.files[0]
    previewFile(file, picType)
  }
  const profileChange = async () => {
    setLoading(true)
    try {
      const response = await axios.post(
        `${BaseUrl}/auth/superClient/change-profile`,
        { image: tempSrcProfile },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      )
      setLoading(false)
      // Handle successful response
      console.log('profile changed successfully:', response.data.message)
      setMessage(response.data.message) // Show success message in UI
    } catch (error) {
      setLoading(false)
      console.error('Error changing profile:', error.response?.data || error.message)

      // Display error message in UI
      setError(error.response?.data?.error || 'Failed to change profile')
    } finally {
      setLoading(false)
    }
  }
  const updateBusinessDetails = async () => {
    setLoading(true)
    try {
      console.log(placeData)
      const response = await axios.post(
        `${BaseUrl}/auth/superClient/update-business-details`,
        { placeData },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      )
      setLoading(false)
      // Handle successful response
      console.log('Business details changed successfully:', response.data.message)
      setMessage(response.data.message) // Show success message in UI
    } catch (error) {
      setLoading(false)
      console.error('Error changing Business details:', error.response?.data || error.message)

      // Display error message in UI
      setError(error.response?.data?.error || 'Failed to change Business details')
    } finally {
      setLoading(false)
    }
  }

  // Preview uploaded image
  const previewFile = (file, picType) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onloadend = () => {
      if (picType === 'profile') {
        setTempSrcProfile(reader.result)
      }
      if (picType === 'logo') {
        setPlaceData((prev) => ({ ...prev, logoPreview: reader.result }))
      }
      if (picType === 'place') {
        setPlaceData((prev) => ({ ...prev, picturePreview: reader.result }))
      }
    }
  }

  //personal details modal
  const [visiblePDModal, setVisiblePDModal] = useState(false)
  const [email, setEmail] = useState(data?.email)
  const [personalPhoneNumber, setPersonalPhoneNumber] = useState(data?.personalPhoneNumber)
  const [pDVerifModal, setPDVerifModal] = useState(false)
  const [PDVerifCode, setPDVerifCode] = useState('')
  const sendEmailPDVerif = async () => {
    setLoading(true)
    try {
      const response = await axios.post(
        `${BaseUrl}/auth/client/personal-details-change`,
        { newemail: email, newpersonalPhoneNumber: personalPhoneNumber }, // Empty request body (if needed)
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      )

      // Handle successful response
      console.log('Verification email sent:', response.data.message)
      setVisiblePDModal(false)
      setPDVerifModal(true)
      setMessage(response.data.message) // Show success message in UI
    } catch (error) {
      console.error('Error sending verification code:', error.response?.data || error.message)

      // Display error message in UI
      setError(error.response?.data?.error || 'Failed to send verification code')
    } finally {
      setLoading(false)
    }
  }
  const confirmChangePDCode = async () => {
    setLoading(true)
    try {
      const response = await axios.post(
        `${BaseUrl}/auth/client/verify-pd-change-code`,
        { PDVerifCode }, // Empty request body (if needed)
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      )

      // Handle successful response
      console.log('personal details changed successfully:', response.data.message)
      setPDVerifModal(false)
      setPDVerifCode('')
      fetchUserData()
      setMessage(response.data.message) // Show success message in UI
    } catch (error) {
      console.error('Error sending verification code:', error.response?.data || error.message)

      // Display error message in UI
      setError(error.response?.data?.error || 'Failed to send verification code')
    } finally {
      setLoading(false)
    }
  }
  const [placeData, setPlaceData] = useState({})

  const handleChange = (e) => {
    const { name, value } = e.target
    setPlaceData((prev) => ({ ...prev, [name]: value }))
  }

  const handleFileChange = (e, type) => {
    const file = e.target.files[0]
    const previewUrl = file ? URL.createObjectURL(file) : ''
    if (type === 'logo') {
      setPlaceData((prev) => ({ ...prev, logoPreview: previewUrl }))
    } else if (type === 'picture') {
      setPlaceData((prev) => ({ ...prev, picturePreview: previewUrl }))
    }
  }

  const handleSave = () => {
    console.log('Saving data:', placeData)
    setDetailsVisible(false)
  }

  useEffect(() => {
    fetchUserData()
  }, [])

  if (loading) {
    return <CSpinner />
  }

  return (
    <CRow className="justify-content-center mt-5">
      <CCol xs={12} md={8} lg={6}>
        {/* Profile Card */}
        <CCard className="shadow-lg rounded-4 overflow-hidden border-0">
          {/* Gradient Header */}
          <div className="bg-gradient-primary py-4 position-relative">
            <div
              className="position-absolute w-100 h-100 top-0 start-0 bg-opacity-10"
              style={{
                background:
                  "url('https://www.transparenttextures.com/patterns/diagonal-striped-brick.png')",
              }}
            ></div>
            <CCardHeader className="bg-transparent border-0 text-center">
              <CIcon icon={cilUser} size="xl" className="text-white me-2" />
              <span className="fw-bold fs-4 text-white">My Profile</span>
            </CCardHeader>
          </div>

          {/* Profile Content */}
          <CCardBody className="p-4">
            {/* Profile Image with Decorative Elements */}
            <div className="position-relative mb-4">
              <div className="d-flex justify-content-center">
                <div className="position-relative">
                  <CCardImage
                    src={data?.profilePicture || 'https://via.placeholder.com/300'}
                    alt="Profile Picture"
                    className="rounded-circle border-4 border-white shadow-lg"
                    style={{
                      width: '180px',
                      height: '180px',
                      objectFit: 'cover',
                      transform: 'translateY(-50px)',
                    }}
                  />
                  <div className="position-absolute bottom-0 end-0 bg-white rounded-circle p-2 shadow-sm">
                    <CIcon icon={cilCamera} className="text-primary" size="lg" />
                  </div>
                </div>
              </div>
            </div>

            {/* User Information */}
            <div className="text-center mt-3 pt-4">
              <CCardTitle className="fw-bold fs-3 text-dark mb-1">
                {data?.fullName || 'Your Name'}
              </CCardTitle>
              <CCardText className="text-muted mb-3">
                <CIcon icon={cilBuilding} className="me-1" />
                {data?.placeName || 'Your Business'}
              </CCardText>

              {/* Info Cards */}
              <CRow className="g-3 mb-4">
                <CCol md={6}>
                  <div className="bg-light rounded-3 p-3 h-100">
                    <div className="d-flex align-items-center">
                      <div className="bg-primary bg-opacity-10 rounded-circle p-2 me-3">
                        <CIcon icon={cilEnvelopeOpen} className="text-primary" />
                      </div>
                      <div className="text-start">
                        <small className="text-muted d-block">Email</small>
                        <span className="fw-semibold text-break">
                          {data?.email || 'your.email@example.com'}
                        </span>
                      </div>
                    </div>
                  </div>
                </CCol>
                <CCol md={6}>
                  <div className="bg-light rounded-3 p-3 h-100">
                    <div className="d-flex align-items-center">
                      <div className="bg-success bg-opacity-10 rounded-circle p-2 me-3">
                        <CIcon icon={cilLocationPin} className="text-success" />
                      </div>
                      <div className="text-start">
                        <small className="text-muted d-block">Location</small>
                        <span className="fw-semibold text-break">
                          {data?.PlaceAddress || 'Your Address'}
                        </span>
                      </div>
                    </div>
                  </div>
                </CCol>
              </CRow>

              {/* Action Buttons */}
              <div className="d-flex flex-column gap-3 mt-4">
                <CButton
                  color="primary"
                  className="rounded-pill px-4 py-2 d-flex align-items-center justify-content-center"
                  onClick={() => setVisible(true)}
                >
                  <CIcon icon={cilLockLocked} className="me-2" />
                  Change Password
                </CButton>
                <CButton
                  color="secondary"
                  variant="outline"
                  className="rounded-pill px-4 py-2 d-flex align-items-center justify-content-center"
                  onClick={() => setDetailsVisible(true)}
                >
                  <CIcon icon={cilHome} className="me-2" />
                  Business Details
                </CButton>
                <CButton
                  color="dark"
                  variant="outline"
                  className="rounded-pill px-4 py-2 d-flex align-items-center justify-content-center"
                  onClick={() => setVisiblePDModal(true)}
                >
                  <CIcon icon={cilUser} className="me-2" />
                  Personal Information
                </CButton>
              </div>
            </div>
          </CCardBody>
        </CCard>
      </CCol>

      {/* Modals */}
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
        visible={DetailsVisible}
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
    </CRow>
  )
}

export default Profile
