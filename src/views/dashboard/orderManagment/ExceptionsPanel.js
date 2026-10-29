import React, { useCallback, useEffect, useState } from 'react'
import { CSpinner } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import {
  cilWarning,
  cilCheckCircle,
  cilClock,
  cilInbox,
  cilDollar,
  cilStorage,
  cilArrowRight,
} from '@coreui/icons'
import axios from 'axios'
import { io } from 'socket.io-client'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { BaseUrl } from '../../../helpers/BaseUrl'
import { GetToken } from '../../../helpers/GetToken'
import translations from '../../../app/Language'
import './OrderKpiStrip.css'

// Poll every 20s in case a socket event is missed; the socket handles
// fast propagation, the poll handles the "always up-to-date" guarantee.
const POLL_INTERVAL = 20_000

const ExceptionsPanel = () => {
  const token = GetToken()
  const navigate = useNavigate()
  const t = useSelector((state) => state.language)
  const Language = translations[t]

  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchSnapshot = useCallback(async () => {
    try {
      const res = await axios.get(`${BaseUrl}/dashboard/attention`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setData(res.data)
    } catch (err) {
      console.error('Failed to fetch attention snapshot:', err)
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    fetchSnapshot()
    const interval = setInterval(fetchSnapshot, POLL_INTERVAL)
    const socket = io(BaseUrl, { auth: { token } })
    const refresh = () => fetchSnapshot()
    socket.on('newOrder', refresh)
    socket.on('orderUpdated', refresh)
    socket.on('orderReady', refresh)
    socket.on('orderDelivered', refresh)
    socket.on('deleteOrder', refresh)
    return () => {
      clearInterval(interval)
      socket.disconnect()
    }
  }, [token, fetchSnapshot])

  const formatAge = (ms) => {
    if (ms == null) return '—'
    const total = Math.round(ms / 1000)
    if (total < 60) return `${total}s`
    const m = Math.floor(total / 60)
    if (m < 60) return `${m} min`
    const h = Math.floor(m / 60)
    return `${h}h ${m % 60}m`
  }

  if (loading) {
    return (
      <div
        className="om-exceptions"
        style={{
          padding: 24,
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        <CSpinner color="primary" size="sm" />
      </div>
    )
  }

  const ex = data?.exceptions || {}
  const stuckPending = ex.stuckPending || []
  const stuckReady = ex.stuckReady || []
  const unpaidTables = ex.unpaidTables || []
  const lowStock = ex.lowStock || []

  const totalIssues =
    stuckPending.length + stuckReady.length + unpaidTables.length + lowStock.length

  if (totalIssues === 0) {
    return (
      <div className="om-exceptions is-clear">
        <div className="om-exceptions-head">
          <div className="om-exceptions-title">
            <CIcon icon={cilCheckCircle} />
            {Language.exceptionsAllClear || 'All clear'}
          </div>
          <div className="om-exceptions-hint">
            {Language.exceptionsAllClearHint || 'Nothing needs attention.'}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="om-exceptions">
      <div className="om-exceptions-head">
        <div className="om-exceptions-title">
          <CIcon icon={cilWarning} />
          {Language.exceptionsTitle || 'Attention needed'}
        </div>
        <div className="om-exceptions-hint">{totalIssues}</div>
      </div>

      {stuckPending.length > 0 && (
        <div className="om-exceptions-group">
          <div className="om-exceptions-group-title">
            <CIcon icon={cilClock} style={{ marginRight: 4 }} />
            {Language.exceptionsStuckPending || 'Orders stuck in pending'}
          </div>
          {stuckPending.map((o) => (
            <div
              key={o.orderId}
              className="om-exceptions-row"
              onClick={() => navigate('/orders/ordersList')}
              role="button"
              tabIndex={0}
            >
              <div className="om-exceptions-row-main">
                {o.tableNumber
                  ? `${Language.table || 'Table'} ${o.tableNumber}`
                  : `${Language.order || 'Order'} #${o.orderNumber || o.orderId.slice(-4)}`}
                {o.planName && <span className="om-exceptions-row-meta"> · {o.planName}</span>}
              </div>
              <div className="om-exceptions-row-meta">{Number(o.totalPrice).toFixed(2)} TND</div>
              <div className="om-exceptions-row-age">{formatAge(o.ageMs)}</div>
            </div>
          ))}
        </div>
      )}

      {stuckReady.length > 0 && (
        <div className="om-exceptions-group">
          <div className="om-exceptions-group-title">
            <CIcon icon={cilInbox} style={{ marginRight: 4 }} />
            {Language.exceptionsStuckReady || 'Ready orders not picked up'}
          </div>
          {stuckReady.map((o) => (
            <div
              key={o.orderId}
              className="om-exceptions-row"
              onClick={() => navigate('/orders/ordersList')}
              role="button"
              tabIndex={0}
            >
              <div className="om-exceptions-row-main">
                {o.tableNumber
                  ? `${Language.table || 'Table'} ${o.tableNumber}`
                  : `${Language.order || 'Order'} #${o.orderNumber || o.orderId.slice(-4)}`}
                {o.planName && <span className="om-exceptions-row-meta"> · {o.planName}</span>}
              </div>
              <div className="om-exceptions-row-meta">{Number(o.totalPrice).toFixed(2)} TND</div>
              <div className="om-exceptions-row-age is-mild">{formatAge(o.ageMs)}</div>
            </div>
          ))}
        </div>
      )}

      {unpaidTables.length > 0 && (
        <div className="om-exceptions-group">
          <div className="om-exceptions-group-title">
            <CIcon icon={cilDollar} style={{ marginRight: 4 }} />
            {Language.exceptionsUnpaidTables || 'Unpaid tables'}
          </div>
          {unpaidTables.map((tb) => (
            <div
              key={tb.tableId}
              className="om-exceptions-row"
              onClick={() => navigate(`/tables/${tb.tableId}`)}
              role="button"
              tabIndex={0}
            >
              <div className="om-exceptions-row-main">
                {Language.table || 'Table'} {tb.tableNumber}
                {tb.planName && <span className="om-exceptions-row-meta"> · {tb.planName}</span>}
              </div>
              <div className="om-exceptions-row-meta">
                {tb.unpaidTotal.toFixed(2)} TND · {tb.orderCount}{' '}
                {Language.exceptionsUnpaid || 'unpaid'}
              </div>
              <div className="om-exceptions-row-age is-mild">{formatAge(tb.ageMs)}</div>
            </div>
          ))}
        </div>
      )}

      {lowStock.length > 0 && (
        <div className="om-exceptions-group">
          <div className="om-exceptions-group-title">
            <CIcon icon={cilStorage} style={{ marginRight: 4 }} />
            {Language.exceptionsLowStock || 'Low stock'}
          </div>
          {lowStock.map((m) => (
            <div
              key={String(m.rawMaterialId)}
              className="om-exceptions-row"
              onClick={() => navigate('/stock-inventory')}
              role="button"
              tabIndex={0}
            >
              <div className="om-exceptions-row-main">{m.name}</div>
              <div className="om-exceptions-row-meta">
                {m.currentQuantity} / {m.reorderLevel} {m.unit}
              </div>
              <div className="om-exceptions-row-age is-stock">
                {m.deficit} {Language.exceptionsDeficit || 'short'}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default ExceptionsPanel
