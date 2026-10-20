import React, { useState } from 'react'
import { CButton, CFormInput, CInputGroup, CInputGroupText, CSpinner } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import {
  cilLockLocked,
  cilUser,
  cilLockUnlocked,
  cilWarning,
  cilQrCode,
  cilSync,
  cilChartLine,
} from '@coreui/icons'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../../context/AuthContext'
import axios from 'axios'
import { BaseUrl } from '../../../helpers/BaseUrl'
import logo from '../../../assets/images/logo-.png'
import './Login.css'

const FEATURES = [
  {
    icon: cilQrCode,
    title: 'QR menus that just work',
    desc: 'Guests scan, browse and order from their table in seconds.',
  },
  {
    icon: cilSync,
    title: 'Live order flow',
    desc: 'Every order lands instantly on your kitchen screen, status in real time.',
  },
  {
    icon: cilChartLine,
    title: 'Sales & stock, at a glance',
    desc: 'Revenue, top products and inventory — all in one dashboard.',
  },
]

const Login = () => {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPwd, setShowPwd] = useState(true)

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    try {
      setLoading(true)
      const response = await axios.post(`${BaseUrl}/auth/login`, {
        email,
        password,
      })

      const { token } = response.data
      localStorage.setItem('token', token)
      login(token)
      setLoading(false)
      navigate('/')
    } catch (err) {
      setLoading(false)
      setError('Invalid email or password')
      console.error(err)
    }
  }

  return (
    <div className="lg-screen">
      {/* ---- Brand panel ---- */}
      <div className="lg-brand">
        <div className="lg-brand-logo">
          <img src={logo} alt="Order Craft" />
        </div>

        <div className="lg-brand-copy">
          <h1 className="oc-display">Run your coffee shop or restaurant like a modern business.</h1>
          <ul className="lg-brand-features">
            {FEATURES.map((f) => (
              <li key={f.title}>
                <span className="lg-brand-feature-icon">
                  <CIcon icon={f.icon} size="lg" />
                </span>
                <span>
                  <strong>{f.title}</strong>
                  <br />
                  {f.desc}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="lg-brand-foot">&copy; {new Date().getFullYear()} Order Craft</div>
      </div>

      {/* ---- Form panel ---- */}
      <div className="lg-form-panel">
        <div className="lg-form-card">
          <div className="lg-form-logo-mobile">
            <img src={logo} alt="Order Craft" />
          </div>

          <h1 className="lg-form-title">Welcome back</h1>
          <p className="lg-form-subtitle">Sign in to manage your business.</p>

          {error && (
            <div className="lg-alert" role="alert">
              <CIcon icon={cilWarning} className="mt-1" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin}>
            <label className="lg-field-label" htmlFor="login-email">
              Email
            </label>
            <CInputGroup className="lg-input-group">
              <CInputGroupText>
                <CIcon icon={cilUser} />
              </CInputGroupText>
              <CFormInput
                id="login-email"
                type="email"
                placeholder="you@restaurant.com"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </CInputGroup>

            <label className="lg-field-label" htmlFor="login-password">
              Password
            </label>
            <CInputGroup className="lg-input-group">
              <CInputGroupText>
                <CIcon icon={cilLockLocked} />
              </CInputGroupText>
              <CFormInput
                id="login-password"
                type={!showPwd ? 'text' : 'password'}
                placeholder="••••••••"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <CInputGroupText
                className="lg-toggle-pwd"
                onClick={() => setShowPwd(!showPwd)}
                role="button"
                aria-label={showPwd ? 'Show password' : 'Hide password'}
              >
                <CIcon icon={showPwd ? cilLockLocked : cilLockUnlocked} />
              </CInputGroupText>
            </CInputGroup>

            <CButton type="submit" color="primary" className="lg-submit" disabled={loading}>
              {loading ? (
                <>
                  <CSpinner size="sm" className="me-2" /> Signing in…
                </>
              ) : (
                'Sign in'
              )}
            </CButton>
          </form>

          <div className="lg-form-foot">Order Craft — order & inventory management</div>
        </div>
      </div>
    </div>
  )
}

export default Login
