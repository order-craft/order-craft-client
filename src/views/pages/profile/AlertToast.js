import React, { useEffect } from 'react'
import PropTypes from 'prop-types'
import { CToast, CToastBody, CToaster, CButton } from '@coreui/react'

const AlertToast = ({ message, setMessage, type = 'success', placement = 'top-center' }) => {
  useEffect(() => {
    if (message && message.length > 0) {
      const timer = setTimeout(() => {
        setMessage('')
      }, 4000)
      return () => clearTimeout(timer)
    }
  }, [message, setMessage])

  return (
    <CToaster placement={placement}>
      {message && (
        <CToast
          autohide={false}
          visible
          className={`align-items-center text-white bg-${type} border-0 shadow`}
        >
          <div className="d-flex justify-content-between align-items-center px-3 py-2">
            <CToastBody>{message}</CToastBody>
            <CButton color="light" size="sm" className="ms-3" onClick={() => setMessage('')}>
              OK
            </CButton>
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
