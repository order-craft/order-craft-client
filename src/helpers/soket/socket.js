// src/socket.js
import { io } from 'socket.io-client'
import { BaseUrl } from '../BaseUrl'

const socket = io(BaseUrl, {
  transports: ['websocket'], // Use WebSocket as the transport mechanism
})

export default socket
