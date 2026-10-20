// src/components/GlobalNotification.js
import React from 'react'
import { CModal, CModalBody, CButton } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilBellExclamation } from '@coreui/icons'
import { useSocket } from '../context/SocketContext'
import './GlobalNotification.css'

const GlobalNotification = () => {
  const { isModalOpen, activeTable, handleAnswerCall, handleDismissCall, RequestTypeName } =
    useSocket()

  return (
    <CModal visible={isModalOpen} alignment="center" className="gn-modal">
      <CModalBody className="gn-body">
        <div className="gn-ring">
          <span className="gn-ring-pulse" />
          <span className="gn-ring-icon">
            <CIcon icon={cilBellExclamation} size="xl" />
          </span>
        </div>
        <div className="gn-title">Table {activeTable} needs you</div>
        <div className="gn-subtitle">
          Calling for <strong>{RequestTypeName}</strong>
        </div>
        <div className="gn-actions">
          <CButton color="primary" className="gn-answer" onClick={handleAnswerCall}>
            Answer
          </CButton>
          <CButton
            color="secondary"
            variant="outline"
            className="gn-dismiss"
            onClick={handleDismissCall}
          >
            Dismiss
          </CButton>
        </div>
      </CModalBody>
    </CModal>
  )
}

export default GlobalNotification
