// src/components/GlobalNotification.js
import React from 'react'
import { CModal, CModalHeader, CModalBody, CModalFooter, CButton } from '@coreui/react'
import { useSocket } from '../context/SocketContext'

const GlobalNotification = () => {
  const { isModalOpen, activeTable, handleAnswerCall, handleDismissCall, RequestTypeName } =
    useSocket()

  return (
    <CModal visible={isModalOpen}>
      <CModalHeader>Incoming Call from Table {activeTable}</CModalHeader>
      <CModalBody>
        Table {activeTable} is calling for<b> {RequestTypeName}</b> . What would you like to do?
      </CModalBody>
      <CModalFooter>
        <CButton color="primary" onClick={handleAnswerCall}>
          Answer
        </CButton>
        <CButton color="danger" onClick={handleDismissCall}>
          Dismiss
        </CButton>
      </CModalFooter>
    </CModal>
  )
}

export default GlobalNotification
