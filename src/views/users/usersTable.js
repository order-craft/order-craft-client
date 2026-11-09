import React, { useEffect, useMemo, useState } from 'react'
import {
  CButton,
  CModal,
  CFormInput,
  CFormSwitch,
  CSpinner,
  CToaster,
  CToast,
  CToastHeader,
  CToastBody,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilSearch, cilPlus, cilPencil, cilTrash, cilPeople, cilCheckAlt } from '@coreui/icons'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { BaseUrl } from '../../helpers/BaseUrl'
import { useSelector } from 'react-redux'
import translations from '../../app/Language'
import AssignTablesModal from './AssignTablesModal'
import { ACCENTS } from '../../helpers/palette'
import './users.css'

const avatarPalette = ACCENTS
const colorFor = (id) => {
  let h = 0
  const s = String(id || '')
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return avatarPalette[Math.abs(h) % avatarPalette.length]
}

// Some existing translations are lowercase (FR "actif"); labels that stand
// alone should still start with a capital.
const cap = (str) => (str ? str.charAt(0).toUpperCase() + str.slice(1) : str)

const Dashboard = () => {
  const t = useSelector((state) => state.language)
  const Language = translations[t]
  const navigate = useNavigate()

  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [busyIds, setBusyIds] = useState(new Set())
  const [statusFilter, setStatusFilter] = useState('all')
  const [showUncovered, setShowUncovered] = useState(false)

  const [showEditModal, setShowEditModal] = useState(false)
  const [editUser, setEditUser] = useState(null)
  const [editForm, setEditForm] = useState({
    fullName: '',
    email: '',
    password: '',
  })
  const [editError, setEditError] = useState('')
  const [saving, setSaving] = useState(false)

  const [confirmTarget, setConfirmTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  // Responsibilities & table assignment
  const [staffOverview, setStaffOverview] = useState({})
  const [attentionTables, setAttentionTables] = useState([])
  const [assignTarget, setAssignTarget] = useState(null)
  const [respBusyIds, setRespBusyIds] = useState(new Set())

  const [toasts, setToasts] = useState([])
  const showToast = (msg, color = 'success') => {
    const id = Date.now() + Math.random()
    setToasts((prev) => [...prev, { id, msg, color }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((x) => x.id !== id))
    }, 5000)
  }
  const removeToast = (id) => setToasts((prev) => prev.filter((x) => x.id !== id))

  /* ---------- fetch ---------- */
  const fetchClients = async () => {
    setLoading(true)
    setError('')
    try {
      const token = localStorage.getItem('token')
      const response = await axios.get(`${BaseUrl}/auth/superClient/getUsers`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setClients(response.data)
    } catch (err) {
      setError(Language.fetchError || 'Error fetching waiters')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const fetchOverview = async () => {
    try {
      const token = localStorage.getItem('token')
      const [overviewRes, tablesRes] = await Promise.all([
        axios.get(`${BaseUrl}/auth/superClient/staff-overview`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`${BaseUrl}/tables/assignments/overview`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ])
      const map = {}
      ;(overviewRes.data.staff || []).forEach((s) => {
        map[s._id] = s
      })
      setStaffOverview(map)
      setAttentionTables((tablesRes.data.tables || []).filter((tb) => tb.needsAttention))
    } catch (err) {
      // Non-fatal — the base staff list above already loaded. This only
      // enriches rows with responsibilities/assignments.
      console.error('Failed to fetch staff overview:', err)
    }
  }

  useEffect(() => {
    fetchClients()
    fetchOverview()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* ---------- derived ---------- */
  const filteredClients = useMemo(() => {
    if (!searchQuery.trim()) return clients
    const q = searchQuery.trim().toLowerCase()
    return clients.filter(
      (c) =>
        (c.fullName || '').toLowerCase().includes(q) || (c.email || '').toLowerCase().includes(q),
    )
  }, [clients, searchQuery])

  const totalActive = clients.filter((c) => c.verified).length
  const prepCount = clients.filter((c) => c.verified && staffOverview[c._id]?.canPrepare).length
  const deliverCount = clients.filter((c) => c.verified && staffOverview[c._id]?.canDeliver).length
  const visibleClients = filteredClients.filter((c) =>
    statusFilter === 'active' ? c.verified : statusFilter === 'inactive' ? !c.verified : true,
  )

  /* ---------- toggle active ---------- */
  const toggleActive = async (client) => {
    const current = !!client.verified
    const next = !current

    // Optimistic
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
      // Revert
      setClients((prev) =>
        prev.map((c) => (c._id === client._id ? { ...c, verified: current } : c)),
      )
      showToast(err.response?.data?.message || Language.saveError || 'Failed to update', 'danger')
    } finally {
      setBusyIds((prev) => {
        const next = new Set(prev)
        next.delete(client._id)
        return next
      })
    }
  }

  /* ---------- preparation responsibility ---------- */
  const togglePrepare = async (client) => {
    const overview = staffOverview[client._id]
    const current = !!overview?.canPrepare
    const next = !current

    if (!client.verified && next) {
      showToast(
        Language.cannotAssignInactive || 'Cannot assign responsibilities to an inactive account',
        'danger',
      )
      return
    }

    setStaffOverview((prev) => ({
      ...prev,
      [client._id]: { ...prev[client._id], canPrepare: next },
    }))
    setRespBusyIds((prev) => new Set(prev).add(client._id))

    try {
      const token = localStorage.getItem('token')
      await axios.patch(
        `${BaseUrl}/auth/superClient/${client._id}/responsibilities`,
        { canPrepare: next },
        { headers: { Authorization: `Bearer ${token}` } },
      )
    } catch (err) {
      setStaffOverview((prev) => ({
        ...prev,
        [client._id]: { ...prev[client._id], canPrepare: current },
      }))
      showToast(err.response?.data?.message || Language.saveError || 'Failed to update', 'danger')
    } finally {
      setRespBusyIds((prev) => {
        const nextSet = new Set(prev)
        nextSet.delete(client._id)
        return nextSet
      })
    }
  }

  /* ---------- delivery ("service-enabled") responsibility ---------- */
  const toggleDeliver = async (client) => {
    const overview = staffOverview[client._id]
    const current = !!overview?.canDeliver
    const next = !current

    if (!client.verified && next) {
      showToast(
        Language.cannotAssignInactive || 'Cannot assign responsibilities to an inactive account',
        'danger',
      )
      return
    }

    setStaffOverview((prev) => ({
      ...prev,
      [client._id]: { ...prev[client._id], canDeliver: next },
    }))
    setRespBusyIds((prev) => new Set(prev).add(client._id))

    try {
      const token = localStorage.getItem('token')
      await axios.patch(
        `${BaseUrl}/auth/superClient/${client._id}/responsibilities`,
        { canDeliver: next },
        { headers: { Authorization: `Bearer ${token}` } },
      )
    } catch (err) {
      setStaffOverview((prev) => ({
        ...prev,
        [client._id]: { ...prev[client._id], canDeliver: current },
      }))
      showToast(err.response?.data?.message || Language.saveError || 'Failed to update', 'danger')
    } finally {
      setRespBusyIds((prev) => {
        const nextSet = new Set(prev)
        nextSet.delete(client._id)
        return nextSet
      })
    }
  }

  /* ---------- table assignment ---------- */
  const openAssign = (client) => {
    if (!client.verified) {
      showToast(
        Language.cannotAssignInactive || 'Cannot assign responsibilities to an inactive account',
        'danger',
      )
      return
    }
    setAssignTarget(client)
  }
  const closeAssign = () => setAssignTarget(null)
  const handleAssignSaved = () => {
    setAssignTarget(null)
    fetchOverview()
    showToast(Language.tablesAssigned || 'Table assignments updated')
  }

  /* ---------- edit ---------- */
  const openEdit = (client) => {
    setEditUser(client)
    setEditForm({
      fullName: client.fullName || '',
      email: client.email || '',
      password: '',
    })
    setEditError('')
    setShowEditModal(true)
  }

  const closeEdit = () => {
    setShowEditModal(false)
    setEditUser(null)
    setEditForm({ fullName: '', email: '', password: '' })
    setEditError('')
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

    setSaving(true)
    try {
      const token = localStorage.getItem('token')
      const payload = {
        fullName: editForm.fullName.trim(),
        email: editForm.email.trim(),
      }
      if (editForm.password.trim()) {
        payload.password = editForm.password
      }
      await axios.put(`${BaseUrl}/auth/superClient/update-user/${editUser._id}`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      })
      closeEdit()
      fetchClients()
      showToast(Language.waiterUpdated || 'Waiter updated')
    } catch (err) {
      setEditError(err.response?.data?.message || Language.saveError || 'Error updating waiter')
    } finally {
      setSaving(false)
    }
  }

  /* ---------- delete ---------- */
  const askDelete = (client) => {
    setConfirmTarget(client)
  }

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

  /* ---------- render ---------- */
  return (
    <>
      <CToaster position="top-end">
        {toasts.map(({ id, msg, color }) => (
          <CToast
            key={id}
            autohide
            delay={5000}
            color={color}
            visible
            onClose={() => removeToast(id)}
          >
            <CToastHeader closeButton>{color === 'danger' ? 'Error' : 'Notification'}</CToastHeader>
            <CToastBody>{msg}</CToastBody>
          </CToast>
        ))}
      </CToaster>

      <div className="oc-stack">
        {/* ---- Toolbar ---- */}
        <div className="oc-toolbar">
          <div className="oc-toolbar-group">
            <div className="oc-seg" role="group" aria-label="Filter staff">
              {[
                ['all', Language.tlAll || 'All', clients.length],
                ['active', Language.active || 'Active', totalActive],
                ['inactive', Language.inactive || 'Inactive', clients.length - totalActive],
              ].map(([key, label, count]) => (
                <button
                  key={key}
                  type="button"
                  className={statusFilter === key ? 'is-active' : ''}
                  onClick={() => setStatusFilter(key)}
                >
                  {cap(label)}
                  <span className="oc-seg-count">{count}</span>
                </button>
              ))}
            </div>
            <label className="oc-search">
              <CIcon icon={cilSearch} width={15} />
              <input
                type="text"
                placeholder={Language.searchWaiters || 'Search by name or email…'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Search staff"
              />
            </label>
          </div>
          <CButton color="primary" onClick={() => navigate('/users/createUser')}>
            <CIcon icon={cilPlus} className="me-2" />
            {Language.navNewStaff || 'New staff member'}
          </CButton>
        </div>

        {/* ---- Coverage: who covers what, at a glance ---- */}
        <section className="st-coverage" aria-label={Language.stCoverage || 'Service coverage'}>
          <div className="st-cov-cell">
            <span className="st-cov-value">{totalActive}</span>
            <span className="st-cov-label">
              {Language.stActiveStaff || 'active staff'}{' '}
              <span className="st-cov-muted">
                {Language.hmOf || 'of'} {clients.length}
              </span>
            </span>
          </div>
          <div className="st-cov-cell">
            <span className="st-cov-value">{prepCount}</span>
            <span className="st-cov-label">{Language.stInKitchen || 'can prepare orders'}</span>
          </div>
          <div className="st-cov-cell">
            <span className="st-cov-value">{deliverCount}</span>
            <span className="st-cov-label">{Language.stCanDeliver || 'can deliver orders'}</span>
          </div>
          <div className={`st-cov-cell ${attentionTables.length ? 'is-alert' : 'is-ok'}`}>
            <span className="st-cov-value">{attentionTables.length}</span>
            <span className="st-cov-label">
              {Language.stTablesNoServer || 'tables without a server'}
              {attentionTables.length > 0 && (
                <button
                  type="button"
                  className="oc-link st-cov-toggle"
                  onClick={() => setShowUncovered((v) => !v)}
                  aria-expanded={showUncovered}
                >
                  {showUncovered ? Language.stHide || 'Hide' : Language.stShow || 'Show'}
                </button>
              )}
            </span>
          </div>
          {showUncovered && attentionTables.length > 0 && (
            <div className="st-cov-detail">
              <p>
                {Language.unassignedTablesHint ||
                  'These tables have no active assigned server. Orders still work and preparation still sees them — assign a server so they get routed and notified.'}
              </p>
              <div className="st-chips">
                {attentionTables.map((tb) => (
                  <span className="st-chip" key={tb._id}>
                    {Language.table || 'Table'} {tb.number}
                    {tb.assignedTo && !tb.assignedTo.verified
                      ? ` · ${Language.inactive || 'Inactive'}`
                      : ''}
                  </span>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* ---- Staff table ---- */}
        <div className="oc-panel st-panel">
          {loading && clients.length === 0 ? (
            <div className="oc-empty">
              <CSpinner color="primary" size="sm" />
            </div>
          ) : error ? (
            <div className="p-3">
              <div className="alert alert-danger mb-0">{error}</div>
            </div>
          ) : clients.length === 0 ? (
            <div className="oc-empty">
              <span className="oc-empty-icon">
                <CIcon icon={cilPeople} />
              </span>
              <span className="oc-empty-title">{Language.noWaitersYet || 'No staff yet'}</span>
              <span className="oc-empty-body">
                {Language.noWaitersHint || 'Staff accounts can log in to take and prepare orders.'}
              </span>
              <CButton
                color="primary"
                className="mt-2"
                onClick={() => navigate('/users/createUser')}
              >
                <CIcon icon={cilPlus} className="me-2" />
                {Language.navNewStaff || 'New staff member'}
              </CButton>
            </div>
          ) : visibleClients.length === 0 ? (
            <div className="oc-empty">
              <span className="oc-empty-icon">
                <CIcon icon={cilSearch} />
              </span>
              <span className="oc-empty-title">{Language.noWaitersMatch || 'No one matches'}</span>
              <span className="oc-empty-body">
                {Language.noWaitersMatchHint || 'Try a different search or filter.'}
              </span>
            </div>
          ) : (
            <div className="st-table" role="table">
              <div className="st-head" role="row">
                <span role="columnheader">{Language.stMember || 'Staff member'}</span>
                <span role="columnheader">{Language.stResponsibilities || 'Responsibilities'}</span>
                <span role="columnheader">{Language.tables || 'Tables'}</span>
                <span role="columnheader">{Language.stWorkload || 'Right now'}</span>
                <span role="columnheader" className="st-right">
                  {Language.stAccess || 'Access'}
                </span>
              </div>

              {visibleClients.map((client) => {
                const ov = staffOverview[client._id] || {}
                const initial = (client.fullName || '?').charAt(0).toUpperCase()
                const busy = busyIds.has(client._id)
                const respBusy = respBusyIds.has(client._id)
                const tables = ov.assignedTables || []
                const ts = ov.tableService
                const prep = ov.preparation

                return (
                  <div
                    className={`st-row ${client.verified ? '' : 'is-inactive'}`}
                    key={client._id}
                    role="row"
                  >
                    {/* Member */}
                    <div className="st-member" role="cell">
                      <span className="st-avatar" style={{ background: colorFor(client._id) }}>
                        {initial}
                      </span>
                      <span className="st-member-text">
                        <span className="st-name">{client.fullName}</span>
                        <span className="st-email">{client.email}</span>
                      </span>
                    </div>

                    {/* Responsibilities */}
                    <div className="st-resp" role="cell">
                      <button
                        type="button"
                        className={`st-toggle ${ov.canPrepare ? 'is-on is-prep' : ''}`}
                        onClick={() => togglePrepare(client)}
                        disabled={respBusy}
                        aria-pressed={!!ov.canPrepare}
                        title={Language.togglePreparation || 'Toggle preparation responsibility'}
                      >
                        <span className="st-toggle-box" aria-hidden="true">
                          {ov.canPrepare && <CIcon icon={cilCheckAlt} width={11} />}
                        </span>
                        {Language.preparation || 'Preparation'}
                      </button>
                      <button
                        type="button"
                        className={`st-toggle ${ov.canDeliver ? 'is-on is-deliver' : ''}`}
                        onClick={() => toggleDeliver(client)}
                        disabled={respBusy}
                        aria-pressed={!!ov.canDeliver}
                        title={
                          Language.toggleDelivery ||
                          'Toggle delivery responsibility (shared delivery mode)'
                        }
                      >
                        <span className="st-toggle-box" aria-hidden="true">
                          {ov.canDeliver && <CIcon icon={cilCheckAlt} width={11} />}
                        </span>
                        {Language.delivery || 'Delivery'}
                      </button>
                      {respBusy && <CSpinner size="sm" />}
                    </div>

                    {/* Tables */}
                    <div className="st-tables" role="cell">
                      {tables.length > 0 ? (
                        <span className="st-table-list">
                          {tables
                            .slice(0, 6)
                            .map((tb) => tb.number)
                            .join(', ')}
                          {tables.length > 6 && ` +${tables.length - 6}`}
                        </span>
                      ) : (
                        <span className="st-muted">{Language.noTables || 'No tables'}</span>
                      )}
                      <button
                        type="button"
                        className="oc-link st-assign"
                        onClick={() => openAssign(client)}
                      >
                        {tables.length > 0
                          ? Language.stEdit || 'Change'
                          : Language.assignTables || 'Assign tables'}
                      </button>
                    </div>

                    {/* Workload */}
                    <div className="st-load" role="cell">
                      {ts && (
                        <span>
                          <b>{ts.activeOrders}</b> {Language.active || 'active'}
                          {ts.readyAwaitingDelivery > 0 && (
                            <span className="st-warn">
                              {' · '}
                              {ts.readyAwaitingDelivery}{' '}
                              {Language.awaitingDelivery || 'awaiting delivery'}
                            </span>
                          )}
                        </span>
                      )}
                      {ts && (
                        <span className="st-muted">
                          {ts.deliveredToday} {Language.deliveredToday || 'delivered today'}
                          {ts.avgDeliveryMinutes != null &&
                            ` · ${Language.avg || 'avg'} ${ts.avgDeliveryMinutes}${Language.minutesShort || 'min'}`}
                        </span>
                      )}
                      {prep && (
                        <span className="st-muted">
                          {Language.stKitchen || 'Kitchen'}: {prep.pendingOrders}{' '}
                          {Language.pending || 'pending'} · {prep.preparingOrders}{' '}
                          {Language.preparing || 'preparing'}
                        </span>
                      )}
                      {!ts && !prep && <span className="st-muted">—</span>}
                    </div>

                    {/* Access */}
                    <div className="st-access" role="cell">
                      {busy ? (
                        <CSpinner size="sm" />
                      ) : (
                        <CFormSwitch
                          checked={!!client.verified}
                          onChange={() => toggleActive(client)}
                          aria-label={Language.stCanLogIn || 'Can log in'}
                          label={
                            client.verified
                              ? cap(Language.active) || 'Active'
                              : cap(Language.inactive) || 'Inactive'
                          }
                        />
                      )}
                      <button
                        type="button"
                        className="oc-icon-btn st-icon"
                        onClick={() => openEdit(client)}
                        aria-label={Language.editUser || 'Edit'}
                        title={Language.editUser || 'Edit'}
                      >
                        <CIcon icon={cilPencil} width={15} />
                      </button>
                      <button
                        type="button"
                        className="oc-icon-btn st-icon is-danger"
                        onClick={() => askDelete(client)}
                        aria-label={Language.delete || 'Delete'}
                        title={Language.delete || 'Delete'}
                      >
                        <CIcon icon={cilTrash} width={15} />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* ---- Edit modal ---- */}
        <CModal visible={showEditModal} onClose={closeEdit} backdrop="static" className="ut-modal">
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

        {/* ---- Confirm delete ---- */}
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
      </div>

      <AssignTablesModal
        visible={!!assignTarget}
        staff={assignTarget}
        onClose={closeAssign}
        onSaved={handleAssignSaved}
        Language={Language}
      />
    </>
  )
}

export default Dashboard
