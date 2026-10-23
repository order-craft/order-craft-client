import React, { useEffect, useMemo, useState } from 'react'
import {
  CButton,
  CCard,
  CCardBody,
  CModal,
  CFormCheck,
  CFormInput,
  CFormSwitch,
  CSpinner,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import {
  cilSearch,
  cilPlus,
  cilPencil,
  cilTrash,
  cilPeople,
  cilWarning,
  cilFilter,
} from '@coreui/icons'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { BaseUrl } from '../../helpers/BaseUrl'
import { useSelector } from 'react-redux'
import translations from '../../app/Language'
import './users.css'
import { useToast } from '../../components/toast/ToastProvider'

const avatarPalette = ['#0d6efd', '#6610f2', '#d63384', '#fd7e14', '#198754', '#20c997', '#0dcaf0']
const colorFor = (id) => {
  let h = 0
  const s = String(id || '')
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return avatarPalette[Math.abs(h) % avatarPalette.length]
}

const ROLE_KEYS = ['preparer', 'deliverer', 'both']

const UsersTable = () => {
  const t = useSelector((state) => state.language)
  const Language = translations[t]
  const navigate = useNavigate()
  const { showToast } = useToast()

  // ── Data ─────────────────────────────────────────────────
  const [clients, setClients] = useState([])
  const [plans, setPlans] = useState([])
  const [tables, setTables] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // ── Filters ──────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')

  // ── Toggle loading per user ──────────────────────────────
  const [busyIds, setBusyIds] = useState(new Set())

  // ── Edit modal state ─────────────────────────────────────
  const [showEditModal, setShowEditModal] = useState(false)
  const [editUser, setEditUser] = useState(null)
  const [editForm, setEditForm] = useState({
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
  const [editError, setEditError] = useState('')
  const [saving, setSaving] = useState(false)

  // ── Delete confirm ───────────────────────────────────────
  const [confirmTarget, setConfirmTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  // ── Fetch clients + plans + tables ───────────────────────
  const fetchAll = async () => {
    setLoading(true)
    setError('')
    try {
      const token = localStorage.getItem('token')
      const [usersRes, plansRes, tablesRes] = await Promise.all([
        axios.get(`${BaseUrl}/auth/superClient/getUsers`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`${BaseUrl}/tables/get/plans`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`${BaseUrl}/tables/all`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ])
      setClients(usersRes.data || [])
      setPlans(plansRes.data || [])
      setTables(tablesRes.data || [])
    } catch (err) {
      setError(Language.fetchError || 'Error fetching data')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Derived ──────────────────────────────────────────────
  const filteredClients = useMemo(() => {
    let list = clients
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase()
      list = list.filter(
        (c) =>
          (c.fullName || '').toLowerCase().includes(q) || (c.email || '').toLowerCase().includes(q),
      )
    }
    if (roleFilter !== 'all') {
      list = list.filter((c) => (c.staffRole || 'both') === roleFilter)
    }
    return list
  }, [clients, searchQuery, roleFilter])

  const totalActive = clients.filter((c) => c.verified).length

  const getRolePill = (role) => {
    const map = {
      preparer: { label: Language.staffRolePreparer || 'Preparer', cls: 'is-preparer' },
      deliverer: { label: Language.staffRoleDeliverer || 'Deliverer', cls: 'is-deliverer' },
      both: { label: Language.staffRoleBoth || 'Preparer & Deliverer', cls: 'is-both' },
    }
    return map[role] || map.both
  }

  const describeScope = (client) => {
    const planCount = (client.assignedPlanIds || []).length
    const tableCount = (client.assignedTableIds || []).length
    if (planCount === 0 && tableCount === 0) {
      return Language.assignmentsModeAll || 'Whole venue'
    }
    const parts = []
    if (planCount > 0) {
      parts.push(`${planCount} ${planCount === 1 ? 'plan' : 'plans'}`)
    }
    if (tableCount > 0) {
      parts.push(`${tableCount} ${tableCount === 1 ? 'table' : 'tables'}`)
    }
    return parts.join(' · ')
  }

  // ── Toggle verification ──────────────────────────────────
  const toggleActive = async (client) => {
    const current = !!client.verified
    const next = !current

    setClients((prev) => prev.map((c) => (c._id === client._id ? { ...c, verified: next } : c)))
    setBusyIds((prev) => new Set(prev).add(client._id))

    try {
      const token = localStorage.getItem('token')
      await axios.patch(
        `${BaseUrl}/auth/superClient/${client._id}/verify`,
        { verified: next },
        { headers: { Authorization: `Bearer ${token}` } },
      )
      showToast(
        next
          ? Language.waiterActivated || 'Waiter activated'
          : Language.waiterDeactivated || 'Waiter deactivated',
      )
    } catch (err) {
      setClients((prev) =>
        prev.map((c) => (c._id === client._id ? { ...c, verified: current } : c)),
      )
      showToast(err.response?.data?.message || Language.saveError || 'Failed to update', 'danger')
    } finally {
      setBusyIds((prev) => {
        const s = new Set(prev)
        s.delete(client._id)
        return s
      })
    }
  }

  // ── Edit ─────────────────────────────────────────────────
  const openEdit = (client) => {
    setEditUser(client)
    const plans = client.assignedPlanIds || []
    const tabs = client.assignedTableIds || []
    let mode = 'all'
    if (plans.length > 0 && tabs.length > 0) mode = 'both'
    else if (plans.length > 0) mode = 'plans'
    else if (tabs.length > 0) mode = 'tables'

    setEditForm({
      fullName: client.fullName || '',
      email: client.email || '',
      password: '',
      staffRole: client.staffRole || 'both',
      assignedPlanIds: plans,
      assignedTableIds: tabs,
      notifications: {
        newOrder: client.notifications?.newOrder ?? true,
        support: client.notifications?.support ?? true,
        orderReady: client.notifications?.orderReady ?? true,
        orderDelivered: client.notifications?.orderDelivered ?? true,
      },
    })
    setScopeMode(mode)
    setEditError('')
    setShowEditModal(true)
  }

  const closeEdit = () => {
    setShowEditModal(false)
    setEditUser(null)
    setEditError('')
  }

  const togglePlan = (planId) => {
    setEditForm((prev) => ({
      ...prev,
      assignedPlanIds: prev.assignedPlanIds.includes(planId)
        ? prev.assignedPlanIds.filter((id) => id !== planId)
        : [...prev.assignedPlanIds, planId],
    }))
  }

  const toggleTable = (tableId) => {
    setEditForm((prev) => ({
      ...prev,
      assignedTableIds: prev.assignedTableIds.includes(tableId)
        ? prev.assignedTableIds.filter((id) => id !== tableId)
        : [...prev.assignedTableIds, tableId],
    }))
  }

  const submitEdit = async () => {
    if (!editForm.fullName.trim()) {
      setEditError(Language.nameRequired || 'Name is required')
      return
    }
    if (!editForm.email.trim()) {
      setEditError(Language.emailRequired || 'Email is required')
      return
    }

    // Enforce the scope mode: if the mode excludes plans/tables, clear them.
    const assignedPlanIds =
      scopeMode === 'all' || scopeMode === 'tables' ? [] : editForm.assignedPlanIds
    const assignedTableIds =
      scopeMode === 'all' || scopeMode === 'plans' ? [] : editForm.assignedTableIds

    setSaving(true)
    try {
      const token = localStorage.getItem('token')
      const payload = {
        fullName: editForm.fullName.trim(),
        email: editForm.email.trim(),
        staffRole: editForm.staffRole,
        assignedPlanIds,
        assignedTableIds,
        notifications: editForm.notifications,
      }
      if (editForm.password.trim()) {
        payload.password = editForm.password
      }

      await axios.put(`${BaseUrl}/auth/superClient/update-user/${editUser._id}`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      })

      closeEdit()
      showToast(Language.waiterUpdated || 'Waiter updated')

      // Reset the role filter if the saved role no longer matches it, so the
      // just-edited row stays visible instead of being filtered out silently.
      if (roleFilter !== 'all' && roleFilter !== payload.staffRole) {
        setRoleFilter('all')
      }

      // Reset search if it no longer matches the new name/email.
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase()
        if (
          !payload.fullName.toLowerCase().includes(q) &&
          !payload.email.toLowerCase().includes(q)
        ) {
          setSearchQuery('')
        }
      }

      // Always refetch from the server so the row reflects what the backend
      // actually persisted (avoids stale data and ObjectId/string mismatch bugs).
      await fetchAll()
    } catch (err) {
      setEditError(err.response?.data?.message || Language.saveError || 'Error updating waiter')
    } finally {
      setSaving(false)
    }
  }
  // ── Delete ───────────────────────────────────────────────
  const askDelete = (client) => setConfirmTarget(client)

  const confirmDelete = async () => {
    if (!confirmTarget) return
    setDeleting(true)
    try {
      const token = localStorage.getItem('token')
      await axios.delete(`${BaseUrl}/auth/superClient/${confirmTarget._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setClients((prev) => prev.filter((c) => c._id !== confirmTarget._id))
      setConfirmTarget(null)
      showToast(Language.waiterDeleted || 'Waiter deleted')
    } catch (err) {
      showToast(
        err.response?.data?.message || Language.deleteError || 'Error deleting waiter',
        'danger',
      )
      setConfirmTarget(null)
    } finally {
      setDeleting(false)
    }
  }

  // ── Render ───────────────────────────────────────────────
  return (
    <>
      <CCard className="mb-4">
        <div className="ut-header">
          <div className="ut-header-inner">
            <div className="ut-header-left">
              <h5 className="ut-title">{Language.users || 'Waiters'}</h5>
              <div className="ut-subtitle">
                <strong>{clients.length}</strong> {clients.length === 1 ? 'waiter' : 'waiters'}
                {' · '}
                <strong>{totalActive}</strong> active
              </div>
            </div>

            <div className="ut-header-right">
              <div className="ut-search">
                <CIcon icon={cilSearch} className="ut-search-icon" />
                <input
                  type="text"
                  placeholder={Language.searchWaiters || 'Search by name or email...'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <CButton color="primary" onClick={() => navigate('/users/createUser')}>
                <CIcon icon={cilPlus} className="me-2" />
                {Language.createUser || 'New waiter'}
              </CButton>
            </div>
          </div>

          {/* Role filter row */}
          <div className="ut-header-inner" style={{ marginTop: 12 }}>
            <div className="d-flex align-items-center gap-2">
              <CIcon icon={cilFilter} style={{ color: '#6c757d' }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: '#4a5568' }}>
                {Language.staffRole || 'Role'}:
              </span>
              {['all', ...ROLE_KEYS].map((r) => (
                <CButton
                  key={r}
                  size="sm"
                  color={roleFilter === r ? 'primary' : 'secondary'}
                  variant={roleFilter === r ? undefined : 'outline'}
                  onClick={() => setRoleFilter(r)}
                >
                  {r === 'all'
                    ? 'All'
                    : r === 'preparer'
                      ? Language.staffRolePreparer || 'Preparer'
                      : r === 'deliverer'
                        ? Language.staffRoleDeliverer || 'Deliverer'
                        : Language.staffRoleBoth || 'Both'}
                </CButton>
              ))}
            </div>
          </div>
        </div>

        <CCardBody className="p-0">
          {loading && clients.length === 0 ? (
            <div className="text-center py-5">
              <CSpinner color="primary" />
            </div>
          ) : error ? (
            <div className="p-4">
              <div className="alert alert-danger">{error}</div>
            </div>
          ) : clients.length === 0 ? (
            <div className="ut-empty">
              <CIcon icon={cilPeople} size="xl" />
              <div className="ut-empty-title">{Language.noWaitersYet || 'No waiters yet'}</div>
              <div className="ut-empty-body">
                {Language.noWaitersHint || 'Waiters can log in to take orders at tables.'}
              </div>
              <CButton color="primary" onClick={() => navigate('/users/createUser')}>
                <CIcon icon={cilPlus} className="me-2" />
                {Language.createUser || 'New waiter'}
              </CButton>
            </div>
          ) : filteredClients.length === 0 ? (
            <div className="ut-empty">
              <CIcon icon={cilWarning} size="xl" />
              <div className="ut-empty-title">{Language.noWaitersMatch || 'No waiters match'}</div>
              <div className="ut-empty-body">
                {Language.noWaitersMatchHint || 'Try a different search term.'}
              </div>
            </div>
          ) : (
            <div className="ut-list">
              {filteredClients.map((client) => {
                const initial = (client.fullName || '?').charAt(0).toUpperCase()
                const color = colorFor(client._id)
                const busy = busyIds.has(client._id)
                const rolePill = getRolePill(client.staffRole || 'both')

                return (
                  <div className="ut-row" key={client._id}>
                    <div className="ut-avatar" style={{ background: color }}>
                      {initial}
                    </div>

                    <div className="ut-info">
                      <p className="ut-name">{client.fullName}</p>
                      <div className="ut-email">{client.email}</div>
                      <div className="ut-row-meta">
                        <span className={`ut-role-pill ${rolePill.cls}`}>{rolePill.label}</span>
                        <span className="ut-scope-pill">{describeScope(client)}</span>
                      </div>
                    </div>

                    <span className={`ut-status ${client.verified ? 'is-active' : 'is-inactive'}`}>
                      {client.verified
                        ? Language.active || 'Active'
                        : Language.inactive || 'Inactive'}
                    </span>

                    <div className="ut-row-actions">
                      <div className="ut-toggle-cell">
                        {busy ? (
                          <CSpinner size="sm" />
                        ) : (
                          <CFormSwitch
                            checked={!!client.verified}
                            onChange={() => toggleActive(client)}
                            aria-label="Toggle active"
                          />
                        )}
                      </div>
                      <CButton
                        color="secondary"
                        variant="outline"
                        size="sm"
                        onClick={() => openEdit(client)}
                        aria-label="Edit"
                      >
                        <CIcon icon={cilPencil} />
                      </CButton>
                      <CButton
                        color="danger"
                        variant="outline"
                        size="sm"
                        onClick={() => askDelete(client)}
                        aria-label="Delete"
                      >
                        <CIcon icon={cilTrash} />
                      </CButton>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CCardBody>

        {/* ── Edit modal ─────────────────────────────────── */}
        <CModal
          visible={showEditModal}
          onClose={closeEdit}
          backdrop="static"
          className="ut-modal"
          size="lg"
        >
          <div className="ut-modal-header">
            <h5 className="ut-modal-title">
              <CIcon icon={cilPencil} />
              {Language.editUser || 'Edit waiter'}
            </h5>
            <button className="ut-modal-close" onClick={closeEdit} aria-label="Close" type="button">
              &times;
            </button>
          </div>

          <div className="ut-modal-body">
            {/* Identity */}
            <div className="ut-field">
              <label htmlFor="ut-name">{Language.FullName || 'Full name'}</label>
              <CFormInput
                id="ut-name"
                value={editForm.fullName}
                autoFocus
                onChange={(e) => {
                  setEditForm({ ...editForm, fullName: e.target.value })
                  setEditError('')
                }}
              />
            </div>

            <div className="ut-field">
              <label htmlFor="ut-email">{Language.email || 'Email'}</label>
              <CFormInput
                id="ut-email"
                type="email"
                value={editForm.email}
                onChange={(e) => {
                  setEditForm({ ...editForm, email: e.target.value })
                  setEditError('')
                }}
              />
            </div>

            <div className="ut-field">
              <label htmlFor="ut-pwd">
                {Language.password || 'Password'}{' '}
                <span className="text-muted">({Language.optional || 'optional'})</span>
              </label>
              <CFormInput
                id="ut-pwd"
                type="password"
                value={editForm.password}
                placeholder={Language.leaveBlankToKeep || 'Leave blank to keep current'}
                onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
              />
            </div>

            {/* Role */}
            <div className="ut-field">
              <label>{Language.staffRole || 'Role'}</label>
              <div className="ut-role-grid">
                {ROLE_KEYS.map((key) => (
                  <button
                    key={key}
                    type="button"
                    className={`ut-role-card ${editForm.staffRole === key ? 'is-active' : ''}`}
                    onClick={() => setEditForm({ ...editForm, staffRole: key })}
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
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: '#4a5568',
                      marginBottom: 6,
                    }}
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
                            editForm.assignedPlanIds.includes(p._id) ? 'is-selected' : ''
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
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: '#4a5568',
                      marginBottom: 6,
                    }}
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
                            editForm.assignedTableIds.includes(tbl._id) ? 'is-selected' : ''
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

              <div style={{ fontSize: 12, color: '#6c757d', marginTop: 6 }}>
                {Language.assignmentsHint}
              </div>
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
                      checked={!!editForm.notifications[key]}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          notifications: {
                            ...editForm.notifications,
                            [key]: e.target.checked,
                          },
                        })
                      }
                    />
                  </div>
                ))}
              </div>
            </div>

            {editError && <div className="text-danger small mt-2">{editError}</div>}
          </div>

          <div className="ut-modal-footer">
            <CButton color="secondary" variant="outline" onClick={closeEdit} disabled={saving}>
              {Language.cancel || 'Cancel'}
            </CButton>
            <CButton color="primary" onClick={submitEdit} disabled={saving}>
              {saving ? (
                <>
                  <CSpinner size="sm" className="me-2" />
                  {Language.saving || 'Saving…'}
                </>
              ) : (
                Language.saveChanges || 'Save'
              )}
            </CButton>
          </div>
        </CModal>

        {/* ── Confirm delete ─────────────────────────────── */}
        <CModal
          visible={!!confirmTarget}
          onClose={() => setConfirmTarget(null)}
          backdrop="static"
          className="ut-modal"
        >
          <div className="ut-confirm-body">
            <div className="ut-confirm-icon">
              <CIcon icon={cilTrash} />
            </div>
            <div className="ut-confirm-title">{Language.deleteUser || 'Delete waiter'}</div>
            <div className="ut-confirm-text">
              {Language.deleteUserConfirm?.replace('{name}', confirmTarget?.fullName || '') ||
                `Delete ${confirmTarget?.fullName || 'this waiter'}? They won't be able to log in anymore.`}
            </div>
          </div>
          <div className="ut-modal-footer">
            <CButton
              color="secondary"
              variant="outline"
              onClick={() => setConfirmTarget(null)}
              disabled={deleting}
            >
              {Language.cancel || 'Cancel'}
            </CButton>
            <CButton color="danger" onClick={confirmDelete} disabled={deleting}>
              {deleting ? (
                <>
                  <CSpinner size="sm" className="me-2" />
                  {Language.deleting || 'Deleting…'}
                </>
              ) : (
                <>
                  <CIcon icon={cilTrash} className="me-2" />
                  {Language.delete || 'Delete'}
                </>
              )}
            </CButton>
          </div>
        </CModal>
      </CCard>
    </>
  )
}

export default UsersTable
