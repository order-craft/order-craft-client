// src/helpers/printerConnector.js
//
// Singleton WebSocket connector for the thermal-printer emulator.
//
// One WebSocket for the whole app — shared across every OrderCard.
// Opened lazily (first time someone asks to print). Closed when the last
// subscriber unsubscribes or after a period of inactivity.
//
// Set PRINTER_ENABLED = false in development (or on any environment
// without a printer emulator running on ws://localhost:8080) so the browser
// doesn't spam "WebSocket connection failed" in the console.

const PRINTER_ENABLED = true // ← set to false in dev if no printer emulator
const PRINTER_URL = 'ws://localhost:8080'
const CONNECT_TIMEOUT_MS = 5000
const IDLE_CLOSE_MS = 60_000 // close after 60s of no prints

let ws = null
let status = PRINTER_ENABLED ? 'disconnected' : 'disabled'
let subscribers = new Set()
let idleTimer = null

const notify = () => {
  for (const fn of subscribers) {
    try {
      fn(status)
    } catch (e) {
      console.error('[Printer] subscriber threw:', e)
    }
  }
}

const setStatus = (next) => {
  if (status === next) return
  status = next
  notify()
}

const resetIdleTimer = () => {
  if (idleTimer) clearTimeout(idleTimer)
  idleTimer = setTimeout(() => {
    if (subscribers.size === 0) {
      close()
    }
  }, IDLE_CLOSE_MS)
}

const connect = () => {
  if (!PRINTER_ENABLED) {
    setStatus('disabled')
    return Promise.reject(new Error('Printer connector is disabled'))
  }
  if (ws && ws.readyState === WebSocket.OPEN) {
    return Promise.resolve()
  }
  if (ws && ws.readyState === WebSocket.CONNECTING) {
    // Wait for the in-flight connection
    return new Promise((resolve, reject) => {
      const onOpen = () => {
        cleanup()
        resolve()
      }
      const onError = (e) => {
        cleanup()
        reject(e)
      }
      const cleanup = () => {
        ws.removeEventListener('open', onOpen)
        ws.removeEventListener('error', onError)
      }
      ws.addEventListener('open', onOpen)
      ws.addEventListener('error', onError)
    })
  }

  setStatus('connecting')

  return new Promise((resolve, reject) => {
    let settled = false
    try {
      ws = new WebSocket(PRINTER_URL)
    } catch (err) {
      setStatus('error')
      reject(err)
      return
    }

    const timeout = setTimeout(() => {
      if (settled) return
      settled = true
      setStatus('error')
      try {
        ws.close()
      } catch {}
      ws = null
      reject(new Error('Printer WebSocket connect timed out'))
    }, CONNECT_TIMEOUT_MS)

    ws.addEventListener('open', () => {
      if (settled) return
      settled = true
      clearTimeout(timeout)
      setStatus('connected')
      resolve()
    })

    ws.addEventListener('error', (e) => {
      if (settled) return
      settled = true
      clearTimeout(timeout)
      setStatus('error')
      // Don't throw to the caller — the caller falls back to browser printing.
      reject(e || new Error('Printer WebSocket error'))
    })

    ws.addEventListener('close', () => {
      clearTimeout(timeout)
      if (!settled) {
        settled = true
        setStatus('error')
        reject(new Error('Printer WebSocket closed before opening'))
      } else {
        setStatus('disconnected')
      }
      ws = null
    })
  })
}

const close = () => {
  if (ws) {
    try {
      ws.close()
    } catch {}
    ws = null
  }
  setStatus(PRINTER_ENABLED ? 'disconnected' : 'disabled')
}

const sendRaw = async (buffer) => {
  if (!PRINTER_ENABLED) {
    throw new Error('Printer connector is disabled')
  }
  await connect()
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    throw new Error('Printer not connected')
  }
  ws.send(buffer)
  resetIdleTimer()
}

const subscribe = (fn) => {
  subscribers.add(fn)
  // Immediately tell the subscriber the current status
  try {
    fn(status)
  } catch (e) {
    console.error('[Printer] initial subscriber call threw:', e)
  }
  return () => {
    subscribers.delete(fn)
    if (subscribers.size === 0) {
      resetIdleTimer()
    }
  }
}

export const printerConnector = {
  isEnabled: () => PRINTER_ENABLED,
  getStatus: () => status,
  subscribe,
  sendRaw,
  close,
}
