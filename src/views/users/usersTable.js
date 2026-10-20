import React, { useEffect, useMemo, useState } from 'react'
import {
  CButton,
  CCard,
  CCardBody,
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
import {
  cilSearch,
  cilPlus,
  cilPencil,
  cilTrash,
  cilPeople,
  cilWarning,
  cilGrid,
} from '@coreui/icons'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { BaseUrl } from '../../helpers/BaseUrl'
import { useSelector } from 'react-redux'
import translations from '../../app/Language'
import AssignTablesModal from './AssignTablesModal'
import './users.css'

const avatarPalette = ['#0d6efd', '#6610f2', '#d63384', '#fd7e14', '#198754', '#20c997', '#0dcaf0']
const colorFor = (id) => {
  let h = 0
  const s = String(id || '')
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return avatarPalette[Math.abs(h) % avatarPalette.length]
}

const Dashboard = () => {
  const t = useSelector((state) => state.language)
  const Language = translations[t]
  const navigate = useNavigate()

  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [busyIds, setBusyIds] = useState(new Set())

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

      {attentionTables.length > 0 && (
        <div className="staff-attention">
          <CIcon icon={cilWarning} size="lg" />
          <div>
            <div className="staff-attention-title">
              {(
                Language.unassignedTablesTitle || '{count} table(s) need a table-service assignee'
              ).replace('{count}', attentionTables.length)}
            </div>
            <div>
              {Language.unassignedTablesHint ||
                'These tables have no active assigned server. Orders still work and preparation still sees them — assign a server so they get routed and notified.'}
            </div>
            <div className="staff-attention-list">
              {attentionTables.map((tb) => (
                <span className="staff-attention-chip" key={tb._id}>
                  {Language.table || 'Table'} {tb.number}
                  {tb.assignedTo && !tb.assignedTo.verified
                    ? ` (${Language.inactive || 'Inactive'})`
                    : ''}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

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

                return (
                  <div className="ut-row" key={client._id}>
                    <div className="ut-avatar" style={{ background: color }}>
                      {initial}
                    </div>

                    <div className="ut-info">
                      <p className="ut-name">{client.fullName}</p>
                      <div className="ut-email">{client.email}</div>
                    </div>

                    <div className="resp-cell">
                      <div className="resp-pills">
                        {respBusyIds.has(client._id) ? (
                          <CSpinner size="sm" />
                        ) : (
                          <>
                            <button
                              type="button"
                              className={`resp-pill ${
                                staffOverview[client._id]?.canPrepare ? 'is-prep' : 'is-none'
                              }`}
                              onClick={() => togglePrepare(client)}
                              title={
                                Language.togglePreparation || 'Toggle preparation responsibility'
                              }
                            >
                              {Language.preparation || 'Preparation'}
                            </button>
                            <button
                              type="button"
                              className={`resp-pill ${
                                staffOverview[client._id]?.canDeliver ? 'is-deliver' : 'is-none'
                              }`}
                              onClick={() => toggleDeliver(client)}
                              title={
                                Language.toggleDelivery ||
                                'Toggle delivery responsibility (shared delivery mode)'
                              }
                            >
                              {Language.delivery || 'Delivery'}
                            </button>
                            <button
                              type="button"
                              className={`resp-pill ${
                                staffOverview[client._id]?.assignedTables?.length
                                  ? 'is-tables'
                                  : 'is-none'
                              }`}
                              onClick={() => openAssign(client)}
                            >
                              {staffOverview[client._id]?.assignedTables?.length
                                ? `${staffOverview[client._id].assignedTables.length} ${
                                    Language.tables || 'tables'
                                  }`
                                : Language.noTables || 'No tables'}
                            </button>
                          </>
                        )}
                      </div>
                      {staffOverview[client._id]?.assignedTables?.length > 0 && (
                        <div className="resp-tables-list">
                          {Language.table || 'Table'}{' '}
                          {staffOverview[client._id].assignedTables
                            .map((tb) => tb.number)
                            .join(', ')}
                        </div>
                      )}
                      {staffOverview[client._id]?.tableService && (
                        <div className="resp-workload">
                          <span title={Language.activeOrders || 'Active orders'}>
                            {staffOverview[client._id].tableService.activeOrders}{' '}
                            {Language.active || 'active'}
                          </span>
                          {staffOverview[client._id].tableService.readyAwaitingDelivery > 0 && (
                            <span className="resp-workload-warn">
                              {staffOverview[client._id].tableService.readyAwaitingDelivery}{' '}
                              {Language.awaitingDelivery || 'awaiting delivery'}
                            </span>
                          )}
                          <span className="text-muted">
                            {staffOverview[client._id].tableService.deliveredToday}{' '}
                            {Language.deliveredToday || 'delivered today'}
                            {staffOverview[client._id].tableService.avgDeliveryMinutes != null &&
                              ` · ${Language.avg || 'avg'} ${staffOverview[client._id].tableService.avgDeliveryMinutes}${Language.minutesShort || 'min'}`}
                          </span>
                        </div>
                      )}
                      {staffOverview[client._id]?.preparation && (
                        <div className="resp-workload">
                          <span>
                            {staffOverview[client._id].preparation.pendingOrders}{' '}
                            {Language.pending || 'pending'} ·{' '}
                            {staffOverview[client._id].preparation.preparingOrders}{' '}
                            {Language.preparing || 'preparing'}{' '}
                            <span className="text-muted">
                              ({Language.kitchenQueueShared || 'shared kitchen queue'})
                            </span>
                          </span>
                        </div>
                      )}
                      <button
                        type="button"
                        className="resp-assign-btn"
                        onClick={() => openAssign(client)}
                      >
                        <CIcon icon={cilGrid} className="me-1" />
                        {Language.assignTables || 'Assign tables'}
                      </button>
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
      </CCard>

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
