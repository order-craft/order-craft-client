import React, { useEffect, useMemo, useState } from 'react'
import PropTypes from 'prop-types'
import { CModal, CButton, CSpinner, CFormCheck } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilGrid, cilWarning } from '@coreui/icons'
import axios from 'axios'
import { BaseUrl } from '../../helpers/BaseUrl'
import { GetToken } from '../../helpers/GetToken'

/**
 * Lets an admin pick which tables a staff member is responsible for
 * (table-service). A table has exactly one assigned server
 * (Table.user), so checking a table here reassigns it away from whoever
 * currently has it — the modal makes that visible before saving.
 */
const AssignTablesModal = ({ visible, staff, onClose, onSaved, Language }) => {
  const token = GetToken()
  const [tables, setTables] = useState([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState(new Set())

  useEffect(() => {
    if (!visible) return
    const load = async () => {
      setLoading(true)
      setError('')
      try {
        const res = await axios.get(`${BaseUrl}/tables/assignments/overview`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        const list = res.data.tables || []
        setTables(list)
        setSelected(new Set(list.filter((t) => t.assignedTo?._id === staff?._id).map((t) => t._id)))
      } catch (err) {
        setError(err.response?.data?.error || Language.dataLoadError || 'Failed to load data')
      } finally {
        setLoading(false)
      }
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, staff])

  const toggle = (tableId) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(tableId)) next.delete(tableId)
      else next.add(tableId)
      return next
    })
  }

  const changedTables = useMemo(() => {
    return tables.filter((t) => {
      const wasMine = t.assignedTo?._id === staff?._id
      const isMine = selected.has(t._id)
      return wasMine !== isMine
    })
  }, [tables, selected, staff])

  const save = async () => {
    setSaving(true)
    setError('')
    try {
      await Promise.all(
        changedTables.map((t) => {
          const isMine = selected.has(t._id)
          return axios.patch(
            `${BaseUrl}/tables/${t._id}/assign-staff`,
            { userId: isMine ? staff._id : null },
            { headers: { Authorization: `Bearer ${token}` } },
          )
        }),
      )
      onSaved()
    } catch (err) {
      setError(err.response?.data?.error || Language.saveError || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  if (!staff) return null

  return (
    <CModal visible={visible} onClose={onClose} backdrop="static" className="ut-modal">
      <div className="ut-modal-header">
        <h5 className="ut-modal-title">
          <CIcon icon={cilGrid} />
          {(Language.assignTablesTo || 'Assign tables to').replace('{name}', staff.fullName)} —{' '}
          {staff.fullName}
        </h5>
        <button className="ut-modal-close" onClick={onClose} aria-label="Close" type="button">
          &times;
        </button>
      </div>

      <div className="ut-modal-body">
        {loading ? (
          <div className="text-center py-4">
            <CSpinner size="sm" />
          </div>
        ) : (
          <>
            {error && <div className="alert alert-danger py-2">{error}</div>}
            <div className="at-table-list">
              {tables.map((t) => {
                const isMine = selected.has(t._id)
                const assignedToSomeoneElse =
                  t.assignedTo && t.assignedTo._id !== staff._id && !isMine
                return (
                  <label className="at-table-row" key={t._id}>
                    <CFormCheck checked={isMine} onChange={() => toggle(t._id)} />
                    <span className="at-table-number">
                      {Language.table || 'Table'} {t.number}
                    </span>
                    {assignedToSomeoneElse && (
                      <span className="at-table-note">
                        <CIcon icon={cilWarning} className="me-1" />
                        {(Language.currentlyAssignedTo || 'Currently: {name}').replace(
                          '{name}',
                          t.assignedTo.fullName,
                        )}
                      </span>
                    )}
                  </label>
                )
              })}
              {tables.length === 0 && (
                <div className="text-muted small py-3">{Language.noTablesFound || 'No tables'}</div>
              )}
            </div>
            {changedTables.length > 0 && (
              <div className="at-change-note">
                {(Language.tablesWillChange || '{count} table(s) will be reassigned').replace(
                  '{count}',
                  changedTables.length,
                )}
              </div>
            )}
          </>
        )}
      </div>

      <div className="ut-modal-footer">
        <CButton color="secondary" variant="outline" onClick={onClose} disabled={saving}>
          {Language.cancel || 'Cancel'}
        </CButton>
        <CButton color="primary" onClick={save} disabled={saving || loading}>
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
  )
}

AssignTablesModal.propTypes = {
  visible: PropTypes.bool.isRequired,
  staff: PropTypes.object,
  onClose: PropTypes.func.isRequired,
  onSaved: PropTypes.func.isRequired,
  Language: PropTypes.object.isRequired,
}

export default AssignTablesModal
