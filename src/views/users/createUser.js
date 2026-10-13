import React, { useState } from 'react'
import {
  CButton,
  CCard,
  CCardBody,
  CFormInput,
  CSpinner,
  CToaster,
  CToast,
  CToastHeader,
  CToastBody,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilArrowLeft, cilCheck, cilLowVision } from '@coreui/icons'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { BaseUrl } from '../../helpers/BaseUrl'
import { useSelector } from 'react-redux'
import translations from '../../app/Language'
import './users.css'

const CreateUser = () => {
  const t = useSelector((state) => state.language)
  const Language = translations[t]
  const navigate = useNavigate()

  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [toasts, setToasts] = useState([])

  const showToast = (msg, color = 'success') => {
    const id = Date.now() + Math.random()
    setToasts((prev) => [...prev, { id, msg, color }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((x) => x.id !== id))
    }, 4000)
  }
  const removeToast = (id) => setToasts((prev) => prev.filter((x) => x.id !== id))

  const validate = () => {
    const e = {}
    if (!form.fullName.trim()) e.fullName = 'Name is required'
    if (!form.email.trim()) e.email = 'Email is required'
    else if (!/^\S+@\S+\.\S+$/.test(form.email)) e.email = 'Invalid email format'
    if (!form.password) e.password = 'Password is required'
    else if (form.password.length < 6) e.password = 'Password must be at least 6 characters'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return

    setSubmitting(true)
    try {
      const token = localStorage.getItem('token')
      await axios.post(
        `${BaseUrl}/auth/superClient/create-user`,
        {
          fullName: form.fullName.trim(),
          email: form.email.trim(),
          password: form.password,
        },
        { headers: { Authorization: `Bearer ${token}` } },
      )
      showToast(Language.userCreated || 'Waiter created successfully')
      setTimeout(() => navigate('/users/usersList'), 800)
    } catch (err) {
      showToast(
        err.response?.data?.error || Language.saveError || 'Error creating waiter',
        'danger',
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <CToaster position="top-end">
        {toasts.map(({ id, msg, color }) => (
          <CToast
            key={id}
            autohide
            delay={4000}
            color={color}
            visible
            onClose={() => removeToast(id)}
          >
            <CToastHeader closeButton>{color === 'danger' ? 'Error' : 'Notification'}</CToastHeader>
            <CToastBody>{msg}</CToastBody>
          </CToast>
        ))}
      </CToaster>

      <CCard className="mb-4">
        <div className="ut-header">
          <div className="ut-header-inner">
            <div className="ut-header-left">
              <h5 className="ut-title">{Language.createUser || 'New waiter'}</h5>
              <div className="ut-subtitle">
                {Language.createUserHint || 'Add a staff member who can log in and take orders.'}
              </div>
            </div>

            <div className="ut-header-right">
              <CButton
                color="secondary"
                variant="outline"
                onClick={() => navigate('/users/usersList')}
              >
                <CIcon icon={cilArrowLeft} className="me-2" />
                {Language.cancel || 'Back'}
              </CButton>
            </div>
          </div>
        </div>

        <CCardBody className="p-0">
          <div className="ut-create-wrap">
            <form className="ut-create-card" onSubmit={handleSubmit} noValidate>
              <div className="ut-field">
                <label htmlFor="cu-name">{Language.FullName || 'Full name'}</label>
                <CFormInput
                  id="cu-name"
                  value={form.fullName}
                  autoFocus
                  onChange={(e) => {
                    setForm({ ...form, fullName: e.target.value })
                    setErrors({ ...errors, fullName: null })
                  }}
                  invalid={!!errors.fullName}
                />
                {errors.fullName && <div className="text-danger small mt-1">{errors.fullName}</div>}
              </div>

              <div className="ut-field">
                <label htmlFor="cu-email">{Language.email || 'Email'}</label>
                <CFormInput
                  id="cu-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => {
                    setForm({ ...form, email: e.target.value })
                    setErrors({ ...errors, email: null })
                  }}
                  invalid={!!errors.email}
                />
                {errors.email && <div className="text-danger small mt-1">{errors.email}</div>}
              </div>

              <div className="ut-field">
                <label htmlFor="cu-password">{Language.password || 'Password'}</label>
                <div className="ut-password-wrap">
                  <CFormInput
                    id="cu-password"
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={(e) => {
                      setForm({ ...form, password: e.target.value })
                      setErrors({ ...errors, password: null })
                    }}
                    invalid={!!errors.password}
                  />
                  <button
                    type="button"
                    className="ut-password-toggle"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    <CIcon icon={showPassword ? cilLowVision : cilLowVision} />
                  </button>
                </div>
                {errors.password && <div className="text-danger small mt-1">{errors.password}</div>}
              </div>

              <div className="d-flex justify-content-end gap-2 mt-4">
                <CButton
                  color="secondary"
                  variant="outline"
                  type="button"
                  onClick={() => navigate('/users/usersList')}
                  disabled={submitting}
                >
                  {Language.cancel || 'Cancel'}
                </CButton>
                <CButton color="primary" type="submit" disabled={submitting}>
                  {submitting ? (
                    <>
                      <CSpinner size="sm" className="me-2" />
                      {Language.creating || 'Creating…'}
                    </>
                  ) : (
                    <>
                      <CIcon icon={cilCheck} className="me-2" />
                      {Language.createUser || 'Create waiter'}
                    </>
                  )}
                </CButton>
              </div>
            </form>
          </div>
        </CCardBody>
      </CCard>
    </>
  )
}

export default CreateUser
