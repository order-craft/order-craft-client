import React from 'react'
import { CModal, CModalHeader, CModalBody, CModalFooter, CButton } from '@coreui/react'
import { useSelector } from 'react-redux'
import { useSocket } from '../context/SocketContext'
import { useNotificationCenter } from '../context/NotificationCenterContext'
import translations from '../app/Language'

const GlobalNotification = () => {
  const { isModalOpen, activeTable, handleAnswerCall, handleDismissCall, RequestTypeName } =
    useSocket()
  const { stopRingtone } = useNotificationCenter()
  const t = useSelector((state) => state.language)
  const Language = translations[t]

  const onAnswer = () => {
    stopRingtone()
    handleAnswerCall()
  }

  const onDismiss = () => {
    stopRingtone()
    handleDismissCall()
  }

  return (
    <CModal visible={isModalOpen}>
      <CModalHeader>
        {Language.request} — {Language.table} {activeTable}
      </CModalHeader>
      <CModalBody>
        {Language.table} {activeTable} · <b>{RequestTypeName}</b>
      </CModalBody>
      <CModalFooter>
        <CButton color="primary" onClick={onAnswer}>
          {Language.answerCall}
        </CButton>
        <CButton color="danger" onClick={onDismiss}>
          {Language.dismissCall}
        </CButton>
      </CModalFooter>
    </CModal>
  )
}

export default GlobalNotification
