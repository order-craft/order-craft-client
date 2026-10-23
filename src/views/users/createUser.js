import { useEffect, useMemo, useState } from 'react'
import { CButton, CCard, CCardBody, CFormCheck, CFormInput, CSpinner } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilArrowLeft, cilCheck, cilLowVision } from '@coreui/icons'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { BaseUrl } from '../../helpers/BaseUrl'
import { useSelector } from 'react-redux'
import translations from '../../app/Language'
import './users.css'
import { useToast } from '../../components/toast/ToastProvider'

const ROLE_KEYS = ['preparer', 'deliverer', 'both']

const CreateUser = () => {
  const t = useSelector((state) => state.language)
  const Language = translations[t]
  const navigate = useNavigate()
  const { showToast } = useToast()

  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    staffRole: 'both',
    assignedPlanIds: [],
    assignedTableIds: [],
    notifications: {
      newOrder: true,
      support: true,
      orderReady: true,
      orderDelivered: true,
    },
  })
  const [scopeMode, setScopeMode] = useState('all')
  const [plans, setPlans] = useState([])
  const [tables, setTables] = useState([])
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)

  // Fetch plans/tables for the chips
  useEffect(() => {
    const token = localStorage.getItem('token')
    const load = async () => {
      try {
        const [plansRes, tablesRes] = await Promise.all([
          axios.get(`${BaseUrl}/tables/get/plans`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get(`${BaseUrl}/tables/all`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ])
        setPlans(plansRes.data || [])
        setTables(tablesRes.data || [])
      } catch (err) {
        console.error('Failed to load plans/tables:', err)
      }
    }
    load()
  }, [])

  const validate = () => {
    const e = {}
    if (!form.fullName.trim()) e.fullName = 'Name is required'
    if (!form.email.trim()) e.email = 'Email is required'
    else if (!/^\S+@\S+\.\S+$/.test(form.email)) e.email = 'Invalid email format'
    if (!form.password) e.password = 'Password is required'
    else if (form.password.length < 6) e.password = 'Password must be at least 6 characters'
    if (!ROLE_KEYS.includes(form.staffRole)) e.staffRole = 'Pick a role'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return

    // Enforce scope mode
    const assignedPlanIds =
      scopeMode === 'all' || scopeMode === 'tables' ? [] : form.assignedPlanIds
    const assignedTableIds =
      scopeMode === 'all' || scopeMode === 'plans' ? [] : form.assignedTableIds

    setSubmitting(true)
    try {
      const token = localStorage.getItem('token')
      await axios.post(
        `${BaseUrl}/auth/superClient/create-user`,
        {
          fullName: form.fullName.trim(),
          email: form.email.trim(),
          password: form.password,
          staffRole: form.staffRole,
          assignedPlanIds,
          assignedTableIds,
          notifications: form.notifications,
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

  const togglePlan = (planId) => {
    setForm((prev) => ({
      ...prev,
      assignedPlanIds: prev.assignedPlanIds.includes(planId)
        ? prev.assignedPlanIds.filter((id) => id !== planId)
        : [...prev.assignedPlanIds, planId],
    }))
  }

  const toggleTable = (tableId) => {
    setForm((prev) => ({
      ...prev,
      assignedTableIds: prev.assignedTableIds.includes(tableId)
        ? prev.assignedTableIds.filter((id) => id !== tableId)
        : [...prev.assignedTableIds, tableId],
    }))
  }

  return (
    <>
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
              {/* Identity */}
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
                    <CIcon icon={cilLowVision} />
                  </button>
                </div>
                {errors.password && <div className="text-danger small mt-1">{errors.password}</div>}
              </div>

              {/* Role */}
              <div className="ut-field">
                <label>{Language.staffRole || 'Role'}</label>
                <div className="ut-role-grid">
                  {ROLE_KEYS.map((key) => (
                    <button
                      key={key}
                      type="button"
                      className={`ut-role-card ${form.staffRole === key ? 'is-active' : ''}`}
                      onClick={() => setForm({ ...form, staffRole: key })}
                    >
                      <div className="ut-role-label">
                        {key === 'preparer'
                          ? Language.staffRolePreparer || 'Preparer'
                          : key === 'deliverer'
                            ? Language.staffRoleDeliverer || 'Deliverer'
                            : Language.staffRoleBoth || 'Both'}
                      </div>
                      <div className="ut-role-sub">
                        {key === 'preparer'
                          ? 'Kitchen: pending → preparing → ready'
                          : key === 'deliverer'
                            ? 'Floor: ready → delivered'
                            : 'Can do both'}
                      </div>
                    </button>
                  ))}
                </div>
                <div style={{ fontSize: 12, color: '#6c757d', marginTop: 6 }}>
                  {Language.staffRoleHint}
                </div>
              </div>

              {/* Assignments */}
              <div className="ut-field">
                <label>{Language.assignmentsTitle || 'Assignments'}</label>
                <div className="ut-scope-select">
                  <select value={scopeMode} onChange={(e) => setScopeMode(e.target.value)}>
                    <option value="all">
                      {Language.assignmentsModeAll || 'Whole venue (unrestricted)'}
                    </option>
                    <option value="plans">{Language.assignmentsModePlans || 'By plan'}</option>
                    <option value="tables">{Language.assignmentsModeTables || 'By table'}</option>
                    <option value="both">
                      {Language.assignmentsModeBoth || 'By plan and table'}
                    </option>
                  </select>
                </div>

                {(scopeMode === 'plans' || scopeMode === 'both') && (
                  <div style={{ marginTop: 10 }}>
                    <div
                      style={{ fontSize: 12, fontWeight: 700, color: '#4a5568', marginBottom: 6 }}
                    >
                      {Language.assignedPlans || 'Plans'}
                    </div>
                    <div className="ut-chip-list">
                      {plans.length === 0 ? (
                        <span className="ut-chip-empty">
                          {Language.assignedPlansEmpty || 'No plans available'}
                        </span>
                      ) : (
                        plans.map((p) => (
                          <button
                            key={p._id}
                            type="button"
                            className={`ut-chip ${
                              form.assignedPlanIds.includes(p._id) ? 'is-selected' : ''
                            }`}
                            onClick={() => togglePlan(p._id)}
                          >
                            {p.name}
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {(scopeMode === 'tables' || scopeMode === 'both') && (
                  <div style={{ marginTop: 10 }}>
                    <div
                      style={{ fontSize: 12, fontWeight: 700, color: '#4a5568', marginBottom: 6 }}
                    >
                      {Language.assignedTables || 'Tables'}
                    </div>
                    <div className="ut-chip-list">
                      {tables.length === 0 ? (
                        <span className="ut-chip-empty">
                          {Language.assignedTablesEmpty || 'No tables available'}
                        </span>
                      ) : (
                        tables.map((tbl) => (
                          <button
                            key={tbl._id}
                            type="button"
                            className={`ut-chip ${
                              form.assignedTableIds.includes(tbl._id) ? 'is-selected' : ''
                            }`}
                            onClick={() => toggleTable(tbl._id)}
                          >
                            {Language.table || 'Table'} {tbl.number}
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Notifications */}
              <div className="ut-field">
                <label>{Language.staffNotificationsTitle || 'Notifications'}</label>
                <div className="ut-notif-list">
                  {[
                    { key: 'newOrder', label: Language.notifyNewOrder || 'New orders' },
                    { key: 'support', label: Language.notifySupport || 'Support requests' },
                    {
                      key: 'orderReady',
                      label: Language.notifyOrderReady || 'Orders ready for delivery',
                    },
                    {
                      key: 'orderDelivered',
                      label: Language.notifyOrderDelivered || 'Orders delivered',
                    },
                  ].map(({ key, label }) => (
                    <div className="ut-notif-row" key={key}>
                      <span>{label}</span>
                      <CFormCheck
                        checked={!!form.notifications[key]}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            notifications: {
                              ...form.notifications,
                              [key]: e.target.checked,
                            },
                          })
                        }
                      />
                    </div>
                  ))}
                </div>
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
