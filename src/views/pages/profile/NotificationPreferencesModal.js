import React, { useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import { CButton, CModal, CModalBody, CModalFooter, CSpinner } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilBell, cilCheck, cilX, cilWarning } from '@coreui/icons'
import { useSelector } from 'react-redux'
import axios from 'axios'
import { BaseUrl } from '../../../helpers/BaseUrl'
import { useAuth } from '../../../context/AuthContext'
import { useToast } from '../../../components/toast/ToastProvider'
import translations from '../../../app/Language'
import './profile.css'

const NotificationPreferencesModal = ({ visible, onClose }) => {
  const t = useSelector((state) => state.language)
  const Language = translations[t]
  const token = localStorage.getItem('token')
  const { showToast } = useToast()

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [prefs, setPrefs] = useState({
    muteOrderNotifications: false,
    muteSupportNotifications: false,
    muteStaffNotifications: false,
  })

  // Load current preferences when the modal opens
  useEffect(() => {
    if (!visible) return
    let cancelled = false
    const load = async () => {
      try {
        const res = await axios.get(`${BaseUrl}/auth/get-user`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!cancelled) {
          const p = res.data?.notificationPreferences || {}
          setPrefs({
            muteOrderNotifications: !!p.muteOrderNotifications,
            muteSupportNotifications: !!p.muteSupportNotifications,
            muteStaffNotifications: !!p.muteStaffNotifications,
          })
          setError('')
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err.response?.data?.message || Language.fetchError || 'Failed to load preferences',
          )
        }
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [visible, token, Language])

  const toggle = (key) => {
    setPrefs((p) => ({ ...p, [key]: !p[key] }))
  }

  const submit = async () => {
    setSaving(true)
    setError('')
    try {
      await axios.post(
        `${BaseUrl}/auth/superClient/notification-preferences`,
        { notificationPreferences: prefs },
        { headers: { Authorization: `Bearer ${token}` } },
      )
      showToast(Language.prefsSaved || 'Preferences saved', 'success')
      onClose()
    } catch (err) {
      setError(err.response?.data?.message || Language.saveError || 'Failed to save preferences')
    } finally {
      setSaving(false)
    }
  }

  const rows = [
    {
      key: 'muteOrderNotifications',
      title: Language.ownerNotifyOrders || 'Order events',
      hint: Language.ownerNotifyOrdersHint || 'New orders, ready, delivered, payments.',
    },
    {
      key: 'muteSupportNotifications',
      title: Language.ownerNotifySupport || 'Support requests',
      hint: Language.ownerNotifySupportHint || 'When a guest calls a waiter.',
    },
    {
      key: 'muteStaffNotifications',
      title: Language.ownerNotifyStaff || 'Staff events',
      hint: Language.ownerNotifyStaffHint || 'Assignments, shifts, and other staff changes.',
    },
  ]

  return (
    <CModal
      visible={visible}
      onClose={onClose}
      alignment="center"
      size="lg"
      backdrop="static"
      className="pf-modal"
    >
      <div className="pf-modal-header">
        <h5 className="pf-modal-title">
          <CIcon icon={cilBell} />
          {Language.notificationPrefsTitle || 'Notification preferences'}
        </h5>
        <button type="button" className="pf-modal-close" onClick={onClose} aria-label="Close">
          &times;
        </button>
      </div>

      <CModalBody className="pf-modal-body">
        <p className="pf-modal-hint">{Language.notificationPrefsHint}</p>

        {error && (
          <div className="pf-modal-error">
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
                <input type="checkbox" checked={!prefs[key]} onChange={() => toggle(key)} />
                <span className="pf-toggle-slider" />
              </label>
            </div>
          ))}
        </div>

        <p className="pf-modal-note" style={{ textAlign: 'left', marginTop: 12 }}>
          {Language.notificationPrefsHint ||
            "You'll still see everything in the app — this only controls sound and toasts."}
        </p>
      </CModalBody>

      <CModalFooter className="pf-modal-footer">
        <CButton color="secondary" variant="outline" onClick={onClose} disabled={saving}>
          <CIcon icon={cilX} className="me-2" />
          {Language.cancel || 'Cancel'}
        </CButton>
        <CButton color="primary" onClick={submit} disabled={saving}>
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
      </CModalFooter>
    </CModal>
  )
}

NotificationPreferencesModal.propTypes = {
  visible: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
}

export default NotificationPreferencesModal
