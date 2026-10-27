import React, { useEffect, useState } from 'react'
import { CCard, CCardBody, CButton, CSpinner } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilBell, cilCheck, cilWarning } from '@coreui/icons'
import { useSelector } from 'react-redux'
import axios from 'axios'
import { BaseUrl } from '../../../helpers/BaseUrl'
import { useAuth } from '../../../context/AuthContext'
import { useToast } from '../../../components/toast/ToastProvider'
import translations from '../../../app/Language'
import './profile.css'

const StaffNotificationPreferences = () => {
  const t = useSelector((state) => state.language)
  const Language = translations[t]
  const token = localStorage.getItem('token')
  const { setStaffNotifications } = useAuth()
  const { showToast } = useToast()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [prefs, setPrefs] = useState({
    newOrder: true,
    support: true,
    orderReady: true,
    orderDelivered: true,
  })

  // Load current preferences on mount
  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      setError('')
      try {
        const res = await axios.get(`${BaseUrl}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!cancelled && res.data?.notifications) {
          setPrefs({
            newOrder: res.data.notifications.newOrder !== false,
            support: res.data.notifications.support !== false,
            orderReady: res.data.notifications.orderReady !== false,
            orderDelivered: res.data.notifications.orderDelivered !== false,
          })
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err.response?.data?.message || Language.fetchError || 'Failed to load preferences',
          )
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [token, Language])

  const toggle = (key) => setPrefs((p) => ({ ...p, [key]: !p[key] }))

  const submit = async () => {
    setSaving(true)
    setError('')
    try {
      const res = await axios.post(
        `${BaseUrl}/auth/staff/notifications`,
        { notifications: prefs },
        { headers: { Authorization: `Bearer ${token}` } },
      )
      // Push the new prefs into context so ringtone logic stays in sync
      setStaffNotifications(res.data.notifications)
      showToast(Language.prefsSaved || 'Preferences saved', 'success')
    } catch (err) {
      setError(err.response?.data?.message || Language.saveError || 'Failed to save preferences')
    } finally {
      setSaving(false)
    }
  }

  const rows = [
    {
      key: 'newOrder',
      title: Language.notifyNewOrder || 'New orders',
      hint: 'Orders that are placed while you are working.',
    },
    {
      key: 'support',
      title: Language.notifySupport || 'Support requests',
      hint: 'When a guest calls a waiter.',
    },
    {
      key: 'orderReady',
      title: Language.notifyOrderReady || 'Orders ready for delivery',
      hint: 'When the kitchen marks an order as ready.',
    },
    {
      key: 'orderDelivered',
      title: Language.notifyOrderDelivered || 'Orders delivered',
      hint: 'When another staff hands an order to the table.',
    },
  ]

  return (
    <div className="pf-card">
      <div className="pf-card-header">
        <CIcon icon={cilBell} />
        <span>{Language.staffPrefsTitle || 'My notification preferences'}</span>
      </div>
      <div className="pf-card-body">
        <p className="pf-card-hint">
          {Language.staffPrefsHint ||
            "Choose which events you want to hear about. You'll still see everything in the app."}
        </p>

        {loading ? (
          <div className="text-center py-3">
            <CSpinner size="sm" />
          </div>
        ) : (
          <>
            {error && (
              <div
                className="pf-modal-error"
                style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}
              >
                <CIcon icon={cilWarning} />
                <span>{error}</span>
              </div>
            )}

            <div className="pf-prefs-list">
              {rows.map(({ key, title, hint }) => (
                <div className="pf-pref-row" key={key}>
                  <div className="pf-pref-text">
                    <div className="pf-pref-title">{title}</div>
                    <div className="pf-pref-hint">{hint}</div>
                  </div>
                  <label className="pf-toggle">
                    <input type="checkbox" checked={!!prefs[key]} onChange={() => toggle(key)} />
                    <span className="pf-toggle-slider" />
                  </label>
                </div>
              ))}
            </div>

            <CButton color="primary" onClick={submit} disabled={saving} className="mt-3">
              {saving ? (
                <>
                  <CSpinner size="sm" className="me-2" />
                  {Language.saving || 'Saving…'}
                </>
              ) : (
                <>
                  <CIcon icon={cilCheck} className="me-2" />
                  {Language.saveChanges || 'Save changes'}
                </>
              )}
            </CButton>
          </>
        )}
      </div>
    </div>
  )
}

export default StaffNotificationPreferences
