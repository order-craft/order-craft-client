import React, { useEffect, useMemo, useState } from 'react'
import { CButton, CCard, CCardBody, CModal, CSpinner } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilCheckCircle, cilTrash, cilBell, cilFilter } from '@coreui/icons'
import axios from 'axios'
import { BaseUrl } from '../../helpers/BaseUrl'
import { GetToken } from '../../helpers/GetToken'
import { useSelector } from 'react-redux'
import translations from '../../app/Language'
import './support.css'
import { useToast } from '../../components/toast/ToastProvider'
const SupportRequestsManager = () => {
  const token = GetToken()
  const t = useSelector((state) => state.language)
  const Language = translations[t]

  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    answered: 'all',
    limit: 50,
  })
  const avatarPalette = [
    '#0d6efd',
    '#6610f2',
    '#d63384',
    '#fd7e14',
    '#198754',
    '#20c997',
    '#0dcaf0',
    '#e83e8c',
  ]
  const colorFor = (id) => {
    let h = 0
    const s = String(id || '')
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
    return avatarPalette[Math.abs(h) % avatarPalette.length]
  }
  const [confirmTarget, setConfirmTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [selectedIds, setSelectedIds] = useState([])
  const [bulkConfirmVisible, setBulkConfirmVisible] = useState(false)
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const { showToast } = useToast()

  const axiosConfig = {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  }

  /* ---------- data ---------- */
  const fetchSupportRequests = async () => {
    try {
      setLoading(true)
      let url = `${BaseUrl}/sup/support-requests?`
      if (filters.answered !== 'all') url += `answered=${filters.answered}&`
      if (filters.limit) url += `limit=${filters.limit}&`
      const response = await axios.get(url, axiosConfig)
      setRequests(response.data.data)
    } catch (error) {
      showToast(Language.fetchError || 'Failed to fetch support requests', 'danger')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSupportRequests()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.answered, filters.limit])

  /* ---------- derived ---------- */
  const stats = useMemo(() => {
    const pending = requests.filter((r) => !r.answered).length
    const answered = requests.length - pending
    return { pending, answered }
  }, [requests])

  /* ---------- actions ---------- */
  const markAsAnswered = async (id) => {
    try {
      await axios.put(`${BaseUrl}/sup/support-requests/${id}/answered`, {}, axiosConfig)
      showToast(Language.markedAnswered || 'Marked as answered')
      fetchSupportRequests()
    } catch (error) {
      showToast(Language.updateError || 'Failed to update support request', 'danger')
    }
  }

  const askDelete = (request) => setConfirmTarget(request)
  const toggleSelect = (id) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const toggleSelectAll = () => {
    if (selectedIds.length === requests.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(requests.map((r) => r._id))
    }
  }

  const confirmBulkDelete = async () => {
    setBulkDeleting(true)
    try {
      await Promise.all(
        selectedIds.map((id) => axios.delete(`${BaseUrl}/sup/support-requests/${id}`, axiosConfig)),
      )
      showToast(
        `${selectedIds.length} ${selectedIds.length === 1 ? 'request' : 'requests'} deleted`,
      )
      setSelectedIds([])
      setBulkConfirmVisible(false)
      fetchSupportRequests()
    } catch (error) {
      showToast(Language.deleteError || 'Failed to delete support requests', 'danger')
    } finally {
      setBulkDeleting(false)
    }
  }
  const confirmDelete = async () => {
    if (!confirmTarget) return
    setDeleting(true)
    try {
      await axios.delete(`${BaseUrl}/sup/support-requests/${confirmTarget._id}`, axiosConfig)
      showToast(Language.requestDeleted || 'Support request deleted')
      setConfirmTarget(null)
      fetchSupportRequests()
    } catch (error) {
      showToast(Language.deleteError || 'Failed to delete support request', 'danger')
      setConfirmTarget(null)
    } finally {
      setDeleting(false)
    }
  }

  const formatDate = (dateString) => {
    const opts = {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }
    return new Date(dateString).toLocaleString(undefined, opts)
  }

  return (
    <>
      <CCard className="mb-4">
        <div className="sr-header">
          <div className="sr-header-inner">
            <div className="sr-header-left">
              <h5 className="sr-title">{Language.supportRequests || 'Support requests'}</h5>
              <div className="sr-subtitle">
                <strong>{requests.length}</strong> total
                {' · '}
                <strong>{stats.pending}</strong> pending
                {' · '}
                <strong>{stats.answered}</strong> answered
              </div>
            </div>

            <div className="sr-header-right">
              {selectedIds.length > 0 && (
                <div className="sr-bulkbar">
                  <span className="sr-bulkbar-count">{selectedIds.length} selected</span>
                  <CButton color="danger" size="sm" onClick={() => setBulkConfirmVisible(true)}>
                    <CIcon icon={cilTrash} className="me-2" />
                    Delete
                  </CButton>
                </div>
              )}

              <div className="sr-select">
                <CIcon icon={cilFilter} className="sr-select-icon" />
                <select
                  value={filters.answered}
                  onChange={(e) =>
                    setFilters({
                      ...filters,
                      answered: e.target.value,
                    })
                  }
                  aria-label="Filter by status"
                >
                  <option value="all">{Language.allStatuses || 'All statuses'}</option>
                  <option value="false">{Language.pending || 'Pending'}</option>
                  <option value="true">{Language.answered || 'Answered'}</option>
                </select>
              </div>

              <div className="sr-select">
                <select
                  value={filters.limit}
                  onChange={(e) =>
                    setFilters({
                      ...filters,
                      limit: Number(e.target.value),
                    })
                  }
                  aria-label="Limit results"
                >
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <CCardBody className="p-0">
          {loading && requests.length === 0 ? (
            <div className="text-center py-5">
              <CSpinner color="primary" />
            </div>
          ) : requests.length === 0 ? (
            <div className="sr-empty">
              <CIcon icon={cilBell} size="xl" />
              <div className="sr-empty-title">
                {Language.noRequestsFound || 'No support requests'}
              </div>
              <div className="sr-empty-body">
                {Language.noRequestsHint ||
                  'Requests will appear here when customers call a waiter.'}
              </div>
            </div>
          ) : (
            <div className="sr-list">
              <div className="sr-selectall">
                <label>
                  <input
                    type="checkbox"
                    checked={requests.length > 0 && selectedIds.length === requests.length}
                    onChange={toggleSelectAll}
                  />
                  <span>Select all</span>
                </label>
              </div>
              {requests.map((request) => (
                <div className="sr-row" key={request._id}>
                  <input
                    type="checkbox"
                    className="sr-check"
                    checked={selectedIds.includes(request._id)}
                    onChange={() => toggleSelect(request._id)}
                    aria-label="Select request"
                  />
                  <div
                    className="sr-avatar"
                    style={{
                      background: colorFor(request.requestType?._id || request._id),
                    }}
                  >
                    {(request.requestType?.name || '?').charAt(0).toUpperCase()}
                  </div>

                  <div className="sr-info">
                    <p className="sr-title-line">
                      {request.requestType?.name || 'Request'}
                      {' — '}
                      {Language.table || 'Table'} {request.table?.number ?? '?'}
                    </p>
                    <div className="sr-meta">
                      <span
                        className={`sr-pill ${request.answered ? 'is-answered' : 'is-pending'}`}
                      >
                        {request.answered
                          ? Language.answered || 'Answered'
                          : Language.pending || 'Pending'}
                      </span>
                      <span>{formatDate(request.createdAt)}</span>
                    </div>
                  </div>

                  <div className="sr-actions">
                    {!request.answered && (
                      <CButton
                        color="success"
                        variant="outline"
                        size="sm"
                        onClick={() => markAsAnswered(request._id)}
                        aria-label="Mark answered"
                      >
                        <CIcon icon={cilCheckCircle} />
                      </CButton>
                    )}
                    <CButton
                      color="danger"
                      variant="outline"
                      size="sm"
                      onClick={() => askDelete(request)}
                      aria-label="Delete request"
                    >
                      <CIcon icon={cilTrash} />
                    </CButton>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CCardBody>

        {/* Confirm delete */}
        <CModal
          visible={!!confirmTarget}
          onClose={() => setConfirmTarget(null)}
          backdrop="static"
          className="sr-modal"
        >
          <div className="sr-confirm-body">
            <div className="sr-confirm-icon">
              <CIcon icon={cilTrash} />
            </div>
            <div className="sr-confirm-title">
              {Language.deleteRequest || 'Delete support request'}
            </div>
            <div className="sr-confirm-text">
              {confirmTarget
                ? `Delete the request from Table ${confirmTarget.table?.number} — "${confirmTarget.requestType?.name}"?`
                : 'Delete this request?'}
            </div>
          </div>
          <div className="sr-modal-footer">
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

        {/* Bulk delete confirmation */}
        <CModal
          visible={bulkConfirmVisible}
          onClose={() => setBulkConfirmVisible(false)}
          backdrop="static"
          className="sr-modal"
        >
          <div className="sr-confirm-body">
            <div className="sr-confirm-icon">
              <CIcon icon={cilTrash} />
            </div>
            <div className="sr-confirm-title">
              Delete {selectedIds.length} {selectedIds.length === 1 ? 'request' : 'requests'}?
            </div>
            <div className="sr-confirm-text">This cannot be undone.</div>
          </div>
          <div className="sr-modal-footer">
            <CButton
              color="secondary"
              variant="outline"
              onClick={() => setBulkConfirmVisible(false)}
              disabled={bulkDeleting}
            >
              {Language.cancel || 'Cancel'}
            </CButton>
            <CButton color="danger" onClick={confirmBulkDelete} disabled={bulkDeleting}>
              {bulkDeleting ? (
                <>
                  <CSpinner size="sm" className="me-2" />
                  {Language.deleting || 'Deleting…'}
                </>
              ) : (
                <>
                  <CIcon icon={cilTrash} className="me-2" />
                  Delete {selectedIds.length}
                </>
              )}
            </CButton>
          </div>
        </CModal>
      </CCard>
    </>
  )
}

export default SupportRequestsManager
