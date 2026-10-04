import React, { useEffect, useState } from 'react'
import { io } from 'socket.io-client'
import {
  CModal,
  CModalHeader,
  CModalBody,
  CModalFooter,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CListGroup,
  CListGroupItem,
  CContainer,
  CRow,
  CCol,
} from '@coreui/react'
import { GetToken } from '../../helpers/GetToken'
import { BaseUrl } from '../../helpers/BaseUrl'
import { useSelector } from 'react-redux'
import translations from '../../app/Language'

const NotifSupport = () => {
  const token = GetToken()
  const [supportRequests, setSupportRequests] = useState([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [activeTable, setActiveTable] = useState(null)
  const [supporId, setSupportId] = useState(null)

  const [ringtone, setRingtone] = useState(null)
  const socket = io(BaseUrl, { auth: { token } })

  useEffect(() => {
    socket.on('supportNotification', (data) => {
      setSupportRequests((prevRequests) => [...prevRequests, data.tableNumber])
      setActiveTable(data.tableNumber)
      setSupportId(data.supportId)
      console.log(data)
      setIsModalOpen(true)
      playRingtone()
    })

    // Listen for call answered event
    socket.on('callAnswered', (data) => {
      if (data.tableNumber === activeTable) {
        stopRingtone()
        setIsModalOpen(false)
        setSupportRequests((prevRequests) =>
          prevRequests.filter((tableNumber) => tableNumber !== data.tableNumber),
        )
      }
    })

    return () => {
      socket.disconnect()
    }
  }, [activeTable, token])

  const playRingtone = () => {
    const audio = new Audio('/ringtone.mp3')
    audio.loop = true
    audio.play()
    setRingtone(audio)
  }

  const stopRingtone = () => {
    if (ringtone) {
      ringtone.pause()
      ringtone.currentTime = 0
    }
  }

  const handleAnswerCall = () => {
    stopRingtone()
    setIsModalOpen(false)
    alert(`Answered call from table ${activeTable}`)
    console.log(supporId)
    socket.emit('supportCallAnswered', { tableNumber: activeTable, supporId: supporId })
  }

  const handleDismissCall = () => {
    stopRingtone()
    setIsModalOpen(false)
    alert(`Dismissed call from table ${activeTable}`)
  }
  //language
  const t = useSelector((state) => state.language)
  const Language = translations[t]

  return (
    <CContainer>
      <CRow className="justify-content-center">
        <CCol md="8">
          <CCard>
            <CCardHeader>
              <h1>{Language.support + ' ' + Language.request}</h1>
            </CCardHeader>
            <CCardBody>
              {supportRequests.length > 0 ? (
                <CListGroup>
                  {supportRequests.map((tableNumber, index) => (
                    <CListGroupItem key={index}>{tableNumber} called for support</CListGroupItem>
                  ))}
                </CListGroup>
              ) : (
                <p>No support requests at the moment.</p>
              )}
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>

      {/* Modal for incoming support call */}
      <CModal visible={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <CModalHeader>pst Table {activeTable}</CModalHeader>
        <CModalBody>t {activeTable} is calling for support. What would you like to do?</CModalBody>
        <CModalFooter>
          <CButton color="primary" onClick={handleAnswerCall}>
            Answer
          </CButton>
          <CButton color="danger" onClick={handleDismissCall}>
            Dismiss
          </CButton>
        </CModalFooter>
      </CModal>
    </CContainer>
  )
}

export default NotifSupport
