import React, { useEffect } from 'react'
import PropTypes from 'prop-types'
import { CToast, CToastBody, CToaster } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilCheckCircle, cilWarning, cilInfo, cilXCircle, cilX } from '@coreui/icons'
import './toast.css'

const TONE_META = {
  success: { icon: cilCheckCircle, color: '#198754', tint: '#d1e7dd' },
  danger: { icon: cilXCircle, color: '#dc2626', tint: '#f8d7da' },
  warning: { icon: cilWarning, color: '#d97706', tint: '#fff3cd' },
  info: { icon: cilInfo, color: '#0891b2', tint: '#cff4fc' },
}

const AlertToast = ({ message, setMessage, type = 'success', placement = 'top-center' }) => {
  useEffect(() => {
    if (!message) return undefined
    const timer = setTimeout(() => setMessage(''), 4000)
    return () => clearTimeout(timer)
  }, [message, setMessage])

  const meta = TONE_META[type] || TONE_META.success

  return (
    <CToaster placement={placement}>
      {message && (
        <CToast
          autohide={false}
          visible
          className="pf-toast"
          style={{
            background: '#fff',
            borderLeft: `4px solid ${meta.color}`,
          }}
        >
          <div className="pf-toast-inner">
            <div className="pf-toast-icon" style={{ background: meta.tint, color: meta.color }}>
              <CIcon icon={meta.icon} />
            </div>

            <CToastBody className="pf-toast-body">{message}</CToastBody>

            <button
              type="button"
              className="pf-toast-close"
              onClick={() => setMessage('')}
              aria-label="Close"
            >
              <CIcon icon={cilX} />
            </button>
          </div>

          {/* thin progress bar showing auto-dismiss */}
          <div className="pf-toast-progress-track">
            <div className="pf-toast-progress-fill" style={{ background: meta.color }} />
          </div>
        </CToast>
      )}
    </CToaster>
  )
}

AlertToast.propTypes = {
  message: PropTypes.string.isRequired,
  setMessage: PropTypes.func.isRequired,
  type: PropTypes.oneOf(['success', 'danger', 'warning', 'info']),
  placement: PropTypes.oneOf([
    'top-start',
    'top-center',
    'top-end',
    'middle-start',
    'middle-center',
    'middle-end',
    'bottom-start',
    'bottom-center',
    'bottom-end',
  ]),
}

export default AlertToast
