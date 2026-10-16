import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  CButton,
  CCard,
  CCardBody,
  CCol,
  CContainer,
  CForm,
  CFormInput,
  CInputGroup,
  CInputGroupText,
  CRow,
  CSpinner,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilLockLocked, cilLockUnlocked, cilUser, cilWarning } from '@coreui/icons'
import axios from 'axios'
import { useAuth } from '../../../context/AuthContext'
import { BaseUrl } from '../../../helpers/BaseUrl'
import './login.css'

const Login = () => {
  const navigate = useNavigate()
  const { login } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPwd, setShowPwd] = useState(true)

  const handleLogin = async (e) => {
    if (e) e.preventDefault()
    if (!email || !password) {
      setError('Enter your email and password.')
      return
    }
    setError('')
    setLoading(true)
    try {
      const response = await axios.post(`${BaseUrl}/auth/login`, {
        email: email.trim(),
        password,
      })
      const { token } = response.data
      if (!token) {
        setError('Unexpected response from server.')
        return
      }
      localStorage.setItem('token', token)
      login(token)
      navigate('/')
    } catch (err) {
      const msg =
        err.response?.data?.error || err.response?.data?.msg || 'Invalid email or password.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="lg-page">
      <CContainer>
        <CRow className="justify-content-center">
          <CCol xs={12} sm={10} md={8} lg={7} xl={6}>
            <CCard className="lg-card">
              <CRow className="g-0">
                {/* Brand panel */}
                <CCol md={5} className="lg-brand">
                  <div className="lg-brand-inner">
                    <div className="lg-brand-logo">OC</div>
                    <h1 className="lg-brand-title">Order Craft</h1>
                    <p className="lg-brand-text">
                      Your best way to manage a coffee shop, restaurant or hotel.
                    </p>
                  </div>
                </CCol>

                {/* Form panel */}
                <CCol md={7}>
                  <CCardBody className="lg-form-body">
                    <CForm onSubmit={handleLogin}>
                      <h2 className="lg-form-title">Sign in</h2>
                      <p className="lg-form-sub">Enter your credentials to continue.</p>

                      {error && (
                        <div className="lg-error">
                          <CIcon icon={cilWarning} />
                          <span>{error}</span>
                        </div>
                      )}

                      <div className="lg-field">
                        <label htmlFor="lg-email">Email</label>
                        <CInputGroup>
                          <CInputGroupText>
                            <CIcon icon={cilUser} />
                          </CInputGroupText>
                          <CFormInput
                            id="lg-email"
                            type="email"
                            placeholder="you@example.com"
                            autoComplete="username"
                            autoFocus
                            value={email}
                            onChange={(e) => {
                              setEmail(e.target.value)
                              if (error) setError('')
                            }}
                          />
                        </CInputGroup>
                      </div>

                      <div className="lg-field">
                        <label htmlFor="lg-pwd">Password</label>
                        <CInputGroup>
                          <CInputGroupText>
                            <CIcon icon={cilLockLocked} />
                          </CInputGroupText>
                          <CFormInput
                            id="lg-pwd"
                            type={showPwd ? 'password' : 'text'}
                            placeholder="Your password"
                            autoComplete="current-password"
                            value={password}
                            onChange={(e) => {
                              setPassword(e.target.value)
                              if (error) setError('')
                            }}
                          />
                          <CInputGroupText
                            role="button"
                            tabIndex={0}
                            onClick={() => setShowPwd((v) => !v)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault()
                                setShowPwd((v) => !v)
                              }
                            }}
                            aria-label={showPwd ? 'Show password' : 'Hide password'}
                            style={{ cursor: 'pointer' }}
                          >
                            <CIcon icon={showPwd ? cilLockLocked : cilLockUnlocked} />
                          </CInputGroupText>
                        </CInputGroup>
                      </div>

                      <div className="lg-actions">
                        <CButton
                          type="submit"
                          color="primary"
                          disabled={loading}
                          className="lg-submit"
                        >
                          {loading ? (
                            <>
                              <CSpinner size="sm" className="me-2" />
                              Signing in…
                            </>
                          ) : (
                            'Sign in'
                          )}
                        </CButton>
                      </div>

                      <div className="lg-foot">
                        <span>Forgot password?</span>
                        
                      </div>
                    </CForm>
                  </CCardBody>
                </CCol>
              </CRow>
            </CCard>
          </CCol>
        </CRow>
      </CContainer>
    </div>
  )
}

export default Login
