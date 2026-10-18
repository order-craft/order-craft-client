import React, { createContext, useCallback, useContext, useState } from 'react'
import { createPortal } from 'react-dom'
import AlertToast from './AlertToast'

const ToastContext = createContext(null)

export const ToastProvider = ({ children }) => {
  const [toast, setToast] = useState({ message: '', type: 'success' })

  /**
   * showToast("Saved successfully")
   * showToast("Something failed", "danger")
   * showToast("Heads up", "warning")
   */
  const showToast = useCallback((message, type = 'success') => {
    setToast({ message: String(message || ''), type })
  }, [])

  const clear = useCallback(() => setToast({ message: '' }), [])

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {typeof document !== 'undefined' &&
        createPortal(
          <div className="toast-anchor">
            <AlertToast
              message={toast.message}
              setMessage={clear}
              type={toast.type}
              placement="top-center"
            />
          </div>,
          document.body,
        )}
    </ToastContext.Provider>
  )
}

export const useToast = () => {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    throw new Error('useToast must be used inside a ToastProvider')
  }
  return ctx
}
