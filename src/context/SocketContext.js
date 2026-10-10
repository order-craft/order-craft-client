// src/context/SocketContext.js
import React, { createContext, useContext, useEffect, useState } from 'react'
import { io } from 'socket.io-client'
import { BaseUrl } from '../helpers/BaseUrl'
import { GetToken } from '../helpers/GetToken'
import PropTypes from 'prop-types' 
const SocketContext = createContext()

export const SocketProvider = ({ children }) => {
  const token = GetToken()
  const [supportRequests, setSupportRequests] = useState([])
  const [activeTable, setActiveTable] = useState(null)
  const [activeSupportRequest, setActiveSupportRequest] = useState(null)
  const [RequestTypeName, setRequestTypeName] = useState('')

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [ringtone, setRingtone] = useState(null)
  const socket = io(BaseUrl, { auth: { token } })

  useEffect(() => {
    socket.on('supportNotification', (data) => {
      setSupportRequests((prevRequests) => [...prevRequests, data.tableNumber])
      setActiveTable(data.tableNumber)
      setActiveSupportRequest(data.supportId)
      setRequestTypeName(data.requestTypeName)
      setIsModalOpen(true)
      playRingtone()
    })

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
    console.log(activeSupportRequest)
    socket.emit('supportCallAnswered', {
      tableNumber: activeTable,
      supportId: activeSupportRequest,
    })
  }

  const handleDismissCall = () => {
    stopRingtone()
    setIsModalOpen(false)
  }

  return (
    <SocketContext.Provider
      value={{
        supportRequests,
        isModalOpen,
        activeTable,
        RequestTypeName,
        handleAnswerCall,
        handleDismissCall,
      }}
    >
      {children}
    </SocketContext.Provider>
  )
}
SocketProvider.propTypes = {
  children: PropTypes.node.isRequired,
}

export const useSocket = () => useContext(SocketContext)
