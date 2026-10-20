import React from 'react'
import { CModal, CModalHeader, CModalBody, CModalFooter, CButton } from '@coreui/react'
import { useSelector } from 'react-redux'
import { useSocket } from '../context/SocketContext'
import translations from '../app/Language'

const GlobalNotification = () => {
  const { isModalOpen, activeTable, handleAnswerCall, handleDismissCall, RequestTypeName } =
    useSocket()
  const t = useSelector((state) => state.language)
  const Language = translations[t]

  return (
    <CModal visible={isModalOpen}>
      <CModalHeader>
        {Language.request} — {Language.table} {activeTable}
      </CModalHeader>
      <CModalBody>
        {Language.table} {activeTable} · <b>{RequestTypeName}</b>
      </CModalBody>
      <CModalFooter>
        <CButton color="primary" onClick={handleAnswerCall}>
          {Language.answerCall}
        </CButton>
        <CButton color="danger" onClick={handleDismissCall}>
          {Language.dismissCall}
        </CButton>
      </CModalFooter>
    </CModal>
  )
}

export default GlobalNotification
