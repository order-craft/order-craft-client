import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { io } from 'socket.io-client'
import CIcon from '@coreui/icons-react'
import {
  cilArrowRight,
  cilCheckCircle,
  cilBell,
  cilLayers,
  cilInbox,
  cilWarning,
} from '@coreui/icons'
import { differenceInMinutes, format, formatDistanceToNow } from 'date-fns'
import { useSelector } from 'react-redux'
import translations from '../../app/Language'
import { BaseUrl } from '../../helpers/BaseUrl'
import { GetToken } from '../../helpers/GetToken'
import { getDateLocale } from '../../helpers/dateLocale'
import './CSS/Dashboard.css'

const isToday = (iso) => {
  if (!iso) return false
  const d = new Date(iso)
  const n = new Date()
  return (
    d.getFullYear() === n.getFullYear() &&
    d.getMonth() === n.getMonth() &&
    d.getDate() === n.getDate()
  )
}

const orderTime = (o) => o.timestamp || o.createdAt

const orderTotal = (order) =>
  (order.products || []).reduce((sum, item) => {
    const p = item.product || {}
    const price = typeof p.price === 'number' ? p.price : 0
    const disc = typeof p.discountPercentage === 'number' ? p.discountPercentage : 0
    return sum + (disc > 0 ? price * (1 - disc / 100) : price) * (item.quantity || 0)
  }, 0)

const itemsSummary = (order) =>
  (order.products || [])
    .map((it) => `${it.quantity || 1}× ${(it.product?.name || it.name || '—').trim()}`)
    .join(', ')

const waitLabel = (mins) =>
  mins < 60 ? `${mins} min` : `${Math.floor(mins / 60)} h ${String(mins % 60).padStart(2, '0')}`

const money = (n) => `${n.toFixed(2)} TND`

const Dashboard = () => {
  const navigate = useNavigate()
  const token = GetToken()
  const t = useSelector((state) => state.language)
  const L = translations[t] || {}
  const dateLocale = getDateLocale(t)

  const [orders, setOrders] = useState(null)
  const [tables, setTables] = useState(null)
  const [calls, setCalls] = useState(null)
  const [revenue, setRevenue] = useState(null)
  const [lowStock, setLowStock] = useState(null)
  const [bestSellers, setBestSellers] = useState(null)
  const [now, setNow] = useState(() => new Date())
  const refreshTimer = useRef(null)

  const load = useCallback(async () => {
    const auth = { headers: { Authorization: `Bearer ${token}` } }
    const [o, tb, sc, rv, ls, bs] = await Promise.allSettled([
      axios.get(`${BaseUrl}/order/orders/ordersfifo`, auth),
      axios.get(`${BaseUrl}/tables`, auth),
      axios.get(`${BaseUrl}/sup/support-requests?answered=false&limit=20`, auth),
      axios.get(`${BaseUrl}/dashboard/daily-revenue`, auth),
      axios.get(`${BaseUrl}/inventory/low-stock`, auth),
      axios.get(`${BaseUrl}/dashboard/most-sold-products`, auth),
    ])
    const val = (r, pick, fallback) => (r.status === 'fulfilled' ? pick(r.value.data) : fallback)
    setOrders(val(o, (d) => d.orders || [], []))
    setTables(val(tb, (d) => d || [], []))
    setCalls(val(sc, (d) => d.data || [], []))
    setRevenue(val(rv, (d) => d.totalRevenue ?? 0, null))
    setLowStock(val(ls, (d) => d.lowStockItems || [], []))
    setBestSellers(val(bs, (d) => d || [], []))
  }, [token])

  // Live: refetch on any order/table event, plus a slow safety refresh.
  useEffect(() => {
    load()
    const scheduleRefresh = () => {
      clearTimeout(refreshTimer.current)
      refreshTimer.current = setTimeout(load, 600)
    }
    const socket = io(BaseUrl, { auth: { token } })
    ;['newOrder', 'orderUpdated', 'deleteOrder', 'tableUpdated'].forEach((ev) =>
      socket.on(ev, scheduleRefresh),
    )
    const poll = setInterval(load, 60000)
    const tick = setInterval(() => setNow(new Date()), 30000)
    return () => {
      socket.disconnect()
      clearInterval(poll)
      clearInterval(tick)
      clearTimeout(refreshTimer.current)
    }
  }, [load, token])

  const today = useMemo(() => (orders || []).filter((o) => isToday(orderTime(o))), [orders])
  const waiting = today.filter((o) => o.status === 'pending')
  const cooking = today.filter((o) => o.status === 'preparing')
  const done = today.filter((o) => o.status === 'completed')
  const queue = useMemo(
    () =>
      [...waiting, ...cooking].sort(
        (a, b) => new Date(orderTime(a)).getTime() - new Date(orderTime(b)).getTime(),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [today],
  )
  const staleOpen = (orders || []).filter(
    (o) => (o.status === 'pending' || o.status === 'preparing') && !isToday(orderTime(o)),
  ).length

  const openBills = useMemo(
    () =>
      (tables || [])
        .filter((tb) => tb.unpaidOrders)
        .map((tb) => ({
          ...tb,
          amount: (tb.orders || []).reduce((s, o) => s + (Number(o.totalPrice) || 0), 0),
        }))
        .sort((a, b) => b.amount - a.amount),
    [tables],
  )

  const hour = now.getHours()
  const greeting =
    hour < 12
      ? L.goodMorning || 'Good morning'
      : hour < 18
        ? L.goodAfternoon || 'Good afternoon'
        : L.goodEvening || 'Good evening'

  const loading = orders === null

  const pulse = [
    {
      key: 'waiting',
      tone: 'pending',
      label: L.hmWaiting || 'Waiting',
      value: waiting.length,
      hint: L.hmWaitingHint || 'placed, not started',
      to: '/orders/ordersList',
    },
    {
      key: 'cooking',
      tone: 'preparing',
      label: L.hmPreparing || 'In preparation',
      value: cooking.length,
      hint: L.hmPreparingHint || 'being prepared now',
      to: '/orders/ordersList',
    },
    {
      key: 'done',
      tone: 'completed',
      label: L.hmCompleted || 'Completed today',
      value: done.length,
      hint: `${today.length} ${L.hmOrdersToday || 'orders today'}`,
      to: '/orders/ordersList',
    },
    {
      key: 'bills',
      tone: 'neutral',
      label: L.hmOpenBills || 'Open bills',
      value: tables === null ? null : openBills.length,
      hint: `${L.hmOf || 'of'} ${(tables || []).length} ${L.hmTables || 'tables'}`,
      to: '/tables/tablesList',
    },
    {
      key: 'revenue',
      tone: 'brand',
      label: L.TodaysRevenue || "Today's revenue",
      value: revenue === null ? '—' : revenue.toFixed(2),
      unit: 'TND',
      hint: L.hmPaidOnly || 'paid orders',
      to: '/Sales',
    },
  ]

  const waitTone = (mins) => (mins >= 30 ? 'is-late' : mins >= 15 ? 'is-slow' : '')

  const maxSold = Math.max(1, ...(bestSellers || []).slice(0, 5).map((p) => p.totalSold || 0))

  return (
    <div className="hm">
      {/* ---- Heading ---- */}
      <header className="hm-head">
        <div>
          <h2 className="hm-greet">{greeting}</h2>
          <p className="hm-sub">
            {format(now, 'EEEE d MMMM', { locale: dateLocale })}
            {!loading && (
              <>
                {' — '}
                {queue.length === 0
                  ? L.hmQuiet || 'the queue is clear.'
                  : `${queue.length} ${L.hmInQueue || 'orders in the queue.'}`}
              </>
            )}
          </p>
        </div>
        <div className="hm-actions">
          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={() => navigate('/tables/tablesList')}
          >
            {L.navTablesBills || 'Tables & bills'}
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => navigate('/orders/ordersList')}
          >
            {L.hmOpenQueue || 'Open order queue'}
            <CIcon icon={cilArrowRight} className="ms-2" />
          </button>
        </div>
      </header>

      {/* ---- Service pulse ---- */}
      <section className="hm-pulse" aria-label={L.hmPulse || 'Service right now'}>
        {pulse.map((p) => (
          <button
            key={p.key}
            type="button"
            className={`hm-pulse-cell tone-${p.tone}`}
            onClick={() => navigate(p.to)}
          >
            <span className="hm-pulse-label">{p.label}</span>
            {loading || p.value === null ? (
              <span className="oc-skel hm-pulse-skel" />
            ) : (
              <span className="hm-pulse-value">
                {p.value}
                {p.unit && <small>{p.unit}</small>}
              </span>
            )}
            <span className="hm-pulse-hint">{p.hint}</span>
          </button>
        ))}
      </section>

      {/* ---- Queue + side rail ---- */}
      <div className="hm-main">
        <section className="oc-panel hm-queue">
          <div className="oc-panel-head">
            <h3 className="oc-panel-title">
              {L.hmQueue || 'Order queue'}
              {!loading && <span className="oc-panel-count">{queue.length}</span>}
            </h3>
            <button
              type="button"
              className="oc-link"
              onClick={() => navigate('/orders/ordersList')}
            >
              {L.hmManageOrders || 'Manage orders'}
            </button>
          </div>

          {loading ? (
            <div className="hm-rows">
              {[0, 1, 2].map((i) => (
                <div key={i} className="hm-row">
                  <span className="oc-skel" style={{ height: 14, width: '60%' }} />
                </div>
              ))}
            </div>
          ) : queue.length === 0 ? (
            <div className="oc-empty">
              <span className="oc-empty-icon">
                <CIcon icon={cilCheckCircle} />
              </span>
              <span className="oc-empty-title">{L.hmQueueEmpty || 'Nothing waiting'}</span>
              <span className="oc-empty-body">
                {L.hmQueueEmptyHint ||
                  'New orders appear here the moment guests place them, oldest first.'}
              </span>
            </div>
          ) : (
            <ol className="hm-rows">
              {queue.slice(0, 8).map((o) => {
                const mins = Math.max(0, differenceInMinutes(now, new Date(orderTime(o))))
                return (
                  <li key={o._id}>
                    <button
                      type="button"
                      className="hm-row"
                      onClick={() => navigate('/orders/ordersList')}
                    >
                      <span className={`oc-status is-${o.status}`}>
                        {o.status === 'pending'
                          ? L.hmWaiting || 'Waiting'
                          : L.hmPreparingShort || 'Preparing'}
                      </span>
                      <span className="hm-row-main">
                        <span className="hm-row-title">
                          {o.table
                            ? `${L.table || 'Table'} ${o.table.number}`
                            : `${o.orderType === 'delivery' ? L.delivery || 'Delivery' : L.togo || 'To-go'}${o.orderNumber ? ` #${o.orderNumber}` : ''}`}
                        </span>
                        <span className="hm-row-items">{itemsSummary(o)}</span>
                      </span>
                      <span className={`hm-row-wait ${waitTone(mins)}`}>
                        {mins < 1 ? L.hmJustNow || 'just now' : waitLabel(mins)}
                      </span>
                      <span className="hm-row-total">{money(orderTotal(o))}</span>
                    </button>
                  </li>
                )
              })}
            </ol>
          )}

          {!loading && (queue.length > 8 || staleOpen > 0) && (
            <div className="hm-queue-foot">
              {queue.length > 8 && (
                <span>
                  +{queue.length - 8} {L.hmMoreInQueue || 'more in the queue'}
                </span>
              )}
              {staleOpen > 0 && (
                <span className="hm-stale">
                  <CIcon icon={cilWarning} width={14} />
                  {staleOpen} {L.hmStale || 'unfinished orders from earlier days are still open'}
                </span>
              )}
            </div>
          )}
        </section>

        <div className="hm-rail">
          <section className="oc-panel">
            <div className="oc-panel-head">
              <h3 className="oc-panel-title">
                {L.hmOpenBills || 'Open bills'}
                {tables !== null && <span className="oc-panel-count">{openBills.length}</span>}
              </h3>
              <button
                type="button"
                className="oc-link"
                onClick={() => navigate('/tables/tablesList')}
              >
                {L.hmAllTables || 'All tables'}
              </button>
            </div>
            {tables === null ? (
              <div className="hm-list">
                <span className="oc-skel" style={{ height: 14, width: '50%' }} />
              </div>
            ) : openBills.length === 0 ? (
              <p className="hm-calm">{L.hmBillsClear || 'Every table is settled.'}</p>
            ) : (
              <ul className="hm-list">
                {openBills.slice(0, 6).map((tb) => (
                  <li key={tb._id}>
                    <button
                      type="button"
                      className="hm-list-row"
                      onClick={() => navigate(`/tables/${tb._id}`)}
                    >
                      <span className="hm-list-name">
                        {L.table || 'Table'} {tb.number}
                      </span>
                      <span className="hm-list-meta">
                        {(tb.orders || []).length}{' '}
                        {(tb.orders || []).length === 1
                          ? L.hmOrder || 'order'
                          : L.hmOrders || 'orders'}
                      </span>
                      <span className="hm-list-amount">
                        {tb.amount > 0 ? money(tb.amount) : ''}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="oc-panel">
            <div className="oc-panel-head">
              <h3 className="oc-panel-title">
                <CIcon icon={cilBell} width={16} />
                {L.navServiceCalls || 'Service calls'}
                {calls !== null && calls.length > 0 && (
                  <span className="oc-panel-count is-alert">{calls.length}</span>
                )}
              </h3>
              <button type="button" className="oc-link" onClick={() => navigate('/support')}>
                {L.hmViewAll || 'View all'}
              </button>
            </div>
            {calls === null ? (
              <div className="hm-list">
                <span className="oc-skel" style={{ height: 14, width: '50%' }} />
              </div>
            ) : calls.length === 0 ? (
              <p className="hm-calm">{L.hmCallsClear || 'No one is waiting for help.'}</p>
            ) : (
              <ul className="hm-list">
                {calls.slice(0, 5).map((c) => (
                  <li key={c._id} className="hm-list-row is-static">
                    <span className="hm-list-name">
                      {c.requestType?.name || L.hmRequest || 'Request'}
                    </span>
                    <span className="hm-list-meta">
                      {L.table || 'Table'} {c.table?.number ?? '?'}
                    </span>
                    <span className="hm-list-amount is-muted">
                      {c.createdAt
                        ? formatDistanceToNow(new Date(c.createdAt), {
                            addSuffix: true,
                            locale: dateLocale,
                          })
                        : ''}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>

      {/* ---- Kitchen & menu ---- */}
      <div className="hm-lower">
        <section className="oc-panel">
          <div className="oc-panel-head">
            <h3 className="oc-panel-title">
              <CIcon icon={cilLayers} width={16} />
              {L.hmRunningLow || 'Running low'}
            </h3>
            <button type="button" className="oc-link" onClick={() => navigate('/stock-inventory')}>
              {L.navInventory || 'Inventory'}
            </button>
          </div>
          {lowStock === null ? (
            <div className="hm-list">
              <span className="oc-skel" style={{ height: 14, width: '50%' }} />
            </div>
          ) : lowStock.length === 0 ? (
            <p className="hm-calm">
              {L.hmStockFine || 'Every raw material is above its reorder level.'}
            </p>
          ) : (
            <ul className="hm-list">
              {lowStock.slice(0, 6).map((it, i) => {
                const rm = it.rawMaterial || {}
                const level = Number(rm.reorderLevel) || 0
                const qty = Number(it.currentQuantity) || 0
                const pct = level > 0 ? Math.min(100, Math.round((qty / level) * 100)) : 0
                return (
                  <li key={it._id || i} className="hm-stock">
                    <div className="hm-stock-top">
                      <span className="hm-list-name">{rm.name || '—'}</span>
                      <span className="hm-list-meta">
                        {qty} / {level} {rm.unit || ''}
                      </span>
                    </div>
                    <span className="hm-bar">
                      <span className="hm-bar-fill is-warn" style={{ width: `${pct}%` }} />
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        <section className="oc-panel">
          <div className="oc-panel-head">
            <h3 className="oc-panel-title">
              <CIcon icon={cilInbox} width={16} />
              {L.bestSellers || 'Best sellers'}
            </h3>
            <button
              type="button"
              className="oc-link"
              onClick={() => navigate('/product-performance')}
            >
              {L.navProductInsights || 'Product insights'}
            </button>
          </div>
          {bestSellers === null ? (
            <div className="hm-list">
              <span className="oc-skel" style={{ height: 14, width: '50%' }} />
            </div>
          ) : bestSellers.length === 0 ? (
            <p className="hm-calm">{L.noProductsData || 'No products sold yet.'}</p>
          ) : (
            <ol className="hm-list">
              {bestSellers.slice(0, 5).map((p, i) => (
                <li key={p._id || i} className="hm-stock">
                  <div className="hm-stock-top">
                    <span className="hm-list-name">
                      <span className="hm-rank">{i + 1}</span>
                      {p.productName}
                    </span>
                    <span className="hm-list-meta">
                      {p.totalSold} {L.sold || 'sold'}
                    </span>
                  </div>
                  <span className="hm-bar">
                    <span
                      className="hm-bar-fill"
                      style={{ width: `${Math.round(((p.totalSold || 0) / maxSold) * 100)}%` }}
                    />
                  </span>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </div>
  )
}

export default Dashboard
