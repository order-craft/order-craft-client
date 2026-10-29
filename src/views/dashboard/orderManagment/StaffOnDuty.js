import React, { useCallback, useEffect, useState } from 'react'
import { CSpinner } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilUser, cilPeople } from '@coreui/icons'
import axios from 'axios'
import { io } from 'socket.io-client'
import { useSelector } from 'react-redux'
import { BaseUrl } from '../../../helpers/BaseUrl'
import { GetToken } from '../../../helpers/GetToken'
import translations from '../../../app/Language'
import './OrderKpiStrip.css'

// "On duty" = verified staff, filtered to those who acted today OR are
// currently connected. The backend returns today's numbers; the online
// indicator is inferred from socket presence. Since we only track our own
// socket, we approximate "online" by whether the staff has done anything in
// the last 10 minutes. It's a hint, not a live presence tracker, but it's
// accurate enough for the owner to know who's active.
const ONLINE_WINDOW_MS = 10 * 60 * 1000
const POLL_INTERVAL = 30_000

const rolePill = (role) => {
  if (role === 'preparer') return { label: 'P', cls: 'is-preparer' }
  if (role === 'deliverer') return { label: 'D', cls: 'is-deliverer' }
  return { label: 'B', cls: 'is-both' }
}

const StaffOnDuty = () => {
  const token = GetToken()
  const t = useSelector((state) => state.language)
  const Language = translations[t]

  const [staff, setStaff] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchSnapshot = useCallback(async () => {
    try {
      const res = await axios.get(`${BaseUrl}/dashboard/attention`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setStaff(res.data?.staffOnDuty || [])
    } catch (err) {
      console.error('Failed to fetch staff on duty:', err)
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    fetchSnapshot()
    const interval = setInterval(fetchSnapshot, POLL_INTERVAL)
    return () => clearInterval(interval)
  }, [fetchSnapshot])

  const isOnline = (s) => {
    if (!s.lastActivityAt) return false
    return Date.now() - new Date(s.lastActivityAt).getTime() < ONLINE_WINDOW_MS
  }

  if (loading && staff.length === 0) {
    return (
      <div
        className="om-staff-duty"
        style={{ padding: 24, display: 'flex', justifyContent: 'center' }}
      >
        <CSpinner color="primary" size="sm" />
      </div>
    )
  }

  if (!loading && staff.length === 0) {
    return (
      <div className="om-staff-duty">
        <div className="om-staff-duty-head">
          <div className="om-staff-duty-title">
            <CIcon icon={cilPeople} />
            {Language.staffOnDutyTitle || 'Staff on duty today'}
          </div>
        </div>
        <div className="om-staff-duty-empty">
          <CIcon icon={cilPeople} size="xl" />
          <div className="om-staff-duty-empty-title">
            {Language.staffOnDutyEmpty || 'No staff on duty'}
          </div>
          <div className="om-staff-duty-empty-hint">
            {Language.staffOnDutyEmptyHint || 'Invite staff from the Users page.'}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="om-staff-duty">
      <div className="om-staff-duty-head">
        <div className="om-staff-duty-title">
          <CIcon icon={cilPeople} />
          {Language.staffOnDutyTitle || 'Staff on duty today'}
        </div>
        <div className="om-exceptions-hint">{staff.length}</div>
      </div>

      <div className="om-staff-duty-list">
        {staff.map((s) => {
          const initial = (s.name || '?').charAt(0).toUpperCase()
          const pill = rolePill(s.role)
          const online = isOnline(s)
          return (
            <div className="om-staff-duty-row" key={s.staffId}>
              <div className={`om-staff-duty-avatar ${pill.cls}`} title={s.role}>
                {initial}
              </div>

              <div className="om-staff-duty-info">
                <div className="om-staff-duty-name">
                  {s.name}
                  {s.isDeleted && (
                    <span className="em-role-pill is-deleted">
                      {Language.staffOnDutyDeleted || 'Deleted'}
                    </span>
                  )}
                </div>
                <div className="om-staff-duty-meta">
                  <span className={`om-staff-duty-online ${online ? 'is-online' : 'is-offline'}`}>
                    <span className="om-staff-duty-dot" />
                    {online
                      ? Language.staffOnDutyOnline || 'Online'
                      : Language.staffOnDutyOffline || 'Offline'}
                  </span>
                </div>
              </div>

              <div className="om-staff-duty-stats">
                <div className="om-staff-duty-stat">
                  <div className="om-staff-duty-stat-value">{s.preparedToday}</div>
                  <div className="om-staff-duty-stat-label">
                    {Language.staffOnDutyPrepared || 'prepared'}
                  </div>
                </div>
                <div className="om-staff-duty-stat">
                  <div className="om-staff-duty-stat-value">{s.deliveredToday}</div>
                  <div className="om-staff-duty-stat-label">
                    {Language.staffOnDutyDelivered || 'delivered'}
                  </div>
                </div>
                <div className="om-staff-duty-stat">
                  <div className="om-staff-duty-stat-value">{s.revenueToday.toFixed(0)}</div>
                  <div className="om-staff-duty-stat-label">
                    {Language.staffOnDutyRevenue || 'TND'}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default StaffOnDuty
