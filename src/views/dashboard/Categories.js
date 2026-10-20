import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import CIcon from '@coreui/icons-react'
import {
  cilChartLine,
  cilRestaurant,
  cilListRich,
  cilPeople,
  cilDescription,
  cilLayers,
  cilCash,
  cilWarning,
  cilArrowRight,
  cilCheckCircle,
  cilClock,
  cilFire,
} from '@coreui/icons'
import { formatDistanceToNow } from 'date-fns'
import './CSS/Dashboard.css'
import { useSelector } from 'react-redux'
import translations from '../../app/Language'
import { BaseUrl } from '../../helpers/BaseUrl'
import { GetToken } from '../../helpers/GetToken'
import { getDateLocale } from '../../helpers/dateLocale'

const STATUS_STYLE = {
  pending: { icon: cilClock, color: '#d79a2c', bg: 'rgba(215,154,44,.14)' },
  preparing: { icon: cilFire, color: '#2f8fae', bg: 'rgba(47,143,174,.14)' },
  completed: { icon: cilCheckCircle, color: '#2f8f5b', bg: 'rgba(47,143,91,.14)' },
  cancelled: { icon: cilWarning, color: '#c6432f', bg: 'rgba(198,67,47,.14)' },
}

const orderTotal = (order) =>
  (order.products || []).reduce((sum, item) => {
    const product = item.product || {}
    const price = typeof product.price === 'number' ? product.price : 0
    const discount = typeof product.discountPercentage === 'number' ? product.discountPercentage : 0
    const unitPrice = discount > 0 ? price * (1 - discount / 100) : price
    return sum + unitPrice * (item.quantity || 0)
  }, 0)

const Dashboard = () => {
  const navigate = useNavigate()
  const token = GetToken()
  const t = useSelector((state) => state.language)
  const Language = translations[t]
  const dateLocale = getDateLocale(t)

  const [revenue, setRevenue] = useState(null)
  const [orders, setOrders] = useState(null)
  const [lowStock, setLowStock] = useState(null)
  const [bestSellers, setBestSellers] = useState(null)
  const [loadError, setLoadError] = useState(false)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      const auth = { headers: { Authorization: `Bearer ${token}` } }
      const [revenueRes, ordersRes, inventoryRes, bestSellersRes] = await Promise.allSettled([
        axios.get(`${BaseUrl}/dashboard/daily-revenue`, auth),
        axios.get(`${BaseUrl}/order/orders/ordersfifo`, auth),
        axios.get(`${BaseUrl}/inventory/low-stock`, auth),
        axios.get(`${BaseUrl}/dashboard/most-sold-products`, auth),
      ])

      if (cancelled) return

      setRevenue(revenueRes.status === 'fulfilled' ? revenueRes.value.data.totalRevenue ?? 0 : null)
      setOrders(ordersRes.status === 'fulfilled' ? ordersRes.value.data.orders || [] : null)
      setLowStock(
        inventoryRes.status === 'fulfilled' ? inventoryRes.value.data.lowStockItems || [] : null,
      )
      setBestSellers(bestSellersRes.status === 'fulfilled' ? bestSellersRes.value.data || [] : null)

      if (
        [revenueRes, ordersRes, inventoryRes, bestSellersRes].every((r) => r.status === 'rejected')
      ) {
        setLoadError(true)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [token])

  const pendingOrders = useMemo(
    () => (orders || []).filter((o) => o.status === 'pending'),
    [orders],
  )

  const recentOrders = useMemo(() => {
    if (!orders) return []
    return [...orders]
      .sort(
        (a, b) =>
          new Date(b.timestamp || b.createdAt).getTime() -
          new Date(a.timestamp || a.createdAt).getTime(),
      )
      .slice(0, 5)
  }, [orders])

  const greetingHour = new Date().getHours()
  const greeting =
    greetingHour < 12
      ? Language.goodMorning || 'Good morning'
      : greetingHour < 18
        ? Language.goodAfternoon || 'Good afternoon'
        : Language.goodEvening || 'Good evening'

  const categories = [
    {
      name: Language.salesStatistic,
      desc: Language.salesHubDesc || 'Revenue, growth and payment breakdowns',
      accent: '#b5502b',
      icon: cilChartLine,
      path: '/Sales',
    },
    {
      name: Language.productPerformance,
      desc: Language.productHubDesc || 'Best sellers and margin by product',
      accent: '#7a5aa8',
      icon: cilRestaurant,
      path: '/product-performance',
    },
    {
      name: Language.orderManagement,
      desc: Language.orderHubDesc || 'Live status, value and table turnover',
      accent: '#c15a76',
      icon: cilListRich,
      path: '/order-management',
    },
    {
      name: Language.EmployeePerformance,
      desc: Language.employeeHubDesc || 'Shift reports and staff ratings',
      accent: '#2f8fae',
      icon: cilPeople,
      path: '/employee-performance',
    },
    {
      name: Language.bills,
      desc: Language.billsHubDesc || 'Closed tickets and transaction history',
      accent: '#3d7a5c',
      icon: cilDescription,
      path: '/bill',
    },
    {
      name: Language.stockInventory,
      desc: Language.stockHubDesc || 'Raw materials, recipes and stock levels',
      accent: '#8a7a2e',
      icon: cilLayers,
      path: '/stock-inventory',
    },
  ]

  const needsAttention = (lowStock && lowStock.length > 0) || pendingOrders.length > 0

  return (
    <div className="dh-page">
      <div className="dh-head">
        <h4 className="dh-greeting oc-display">{greeting}</h4>
        <p className="dh-subtitle">
          {Language.dashboardSubtitle || "Here's how your business is doing today."}
        </p>
      </div>

      {/* ---- Needs attention now ---- */}
      <div className="dh-section-label">{Language.needsAttention || 'Needs attention now'}</div>
      {orders === null && lowStock === null && !loadError ? (
        <div className="dh-stats">
          <div className="dh-stat-skeleton-card" />
          <div className="dh-stat-skeleton-card" />
        </div>
      ) : !needsAttention ? (
        <div className="dh-allclear">
          <CIcon icon={cilCheckCircle} />
          {Language.allCaughtUp || 'All caught up — nothing needs your attention right now.'}
        </div>
      ) : (
        <div className="dh-stats">
          {pendingOrders.length > 0 && (
            <button
              type="button"
              className="oc-stat-card dh-stat-clickable"
              onClick={() => navigate('/orders/ordersList')}
            >
              <span className="oc-stat-icon" style={{ background: 'rgba(215,154,44,.14)' }}>
                <CIcon icon={cilClock} style={{ color: '#d79a2c' }} />
              </span>
              <div>
                <p className="oc-stat-label">
                  {Language.pending || 'Pending'} {Language.orders || 'orders'}
                </p>
                <p className="oc-stat-value">{pendingOrders.length}</p>
              </div>
              <CIcon icon={cilArrowRight} className="dh-stat-arrow" />
            </button>
          )}
          {lowStock && lowStock.length > 0 && (
            <button
              type="button"
              className="oc-stat-card dh-stat-clickable"
              onClick={() => navigate('/stock-inventory')}
            >
              <span className="oc-stat-icon" style={{ background: 'rgba(198,67,47,.14)' }}>
                <CIcon icon={cilWarning} style={{ color: '#c6432f' }} />
              </span>
              <div>
                <p className="oc-stat-label">{Language.lowStockAlerts || 'Low stock alerts'}</p>
                <p className="oc-stat-value">{lowStock.length}</p>
              </div>
              <CIcon icon={cilArrowRight} className="dh-stat-arrow" />
            </button>
          )}
        </div>
      )}

      {/* ---- Performance today ---- */}
      <div className="dh-section-label">{Language.performanceToday || 'Performance today'}</div>
      <div className="dh-perf-grid">
        <button
          type="button"
          className="oc-stat-card dh-stat-clickable dh-revenue-card"
          onClick={() => navigate('/Sales')}
        >
          <span className="oc-stat-icon" style={{ background: 'rgba(181,80,43,.12)' }}>
            <CIcon icon={cilCash} style={{ color: '#b5502b' }} />
          </span>
          <div>
            <p className="oc-stat-label">{Language.TodaysRevenue || "Today's revenue"}</p>
            {revenue === null && !loadError ? (
              <div className="dh-stat-skeleton" />
            ) : (
              <p className="oc-stat-value">
                {revenue === null ? '—' : `${revenue.toFixed(2)} TND`}
              </p>
            )}
          </div>
          <CIcon icon={cilArrowRight} className="dh-stat-arrow" />
        </button>

        <div className="dh-card">
          <div className="dh-card-head">
            <span className="dh-card-title">{Language.recentOrders || 'Recent orders'}</span>
            <button
              type="button"
              className="dh-card-link"
              onClick={() => navigate('/orders/ordersList')}
            >
              {Language.viewAll || 'View all'}
            </button>
          </div>
          {orders === null && !loadError ? (
            <div className="dh-list-skeleton" />
          ) : recentOrders.length === 0 ? (
            <div className="dh-card-empty">
              {Language.noOrdersYetHint || 'No orders yet today.'}
            </div>
          ) : (
            <ul className="dh-order-list">
              {recentOrders.map((order) => {
                const style = STATUS_STYLE[order.status] || STATUS_STYLE.pending
                return (
                  <li key={order._id} className="dh-order-row">
                    <span
                      className="dh-order-pill"
                      style={{ background: style.bg, color: style.color }}
                    >
                      <CIcon icon={style.icon} />
                    </span>
                    <span className="dh-order-main">
                      <span className="dh-order-name">
                        {order.table
                          ? `${Language.table || 'Table'} ${order.table.number}`
                          : `${Language.togo || 'To-go'}${order.orderNumber ? ` #${order.orderNumber}` : ''}`}
                      </span>
                      <span className="dh-order-time">
                        {formatDistanceToNow(new Date(order.timestamp || order.createdAt), {
                          addSuffix: true,
                          locale: dateLocale,
                        })}
                      </span>
                    </span>
                    <span className="dh-order-price">{orderTotal(order).toFixed(2)} TND</span>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>

      {/* ---- Best sellers ---- */}
      <div className="dh-section-label">{Language.bestSellers || 'Best sellers'}</div>
      <div className="dh-card dh-card-wide">
        <div className="dh-card-head">
          <span className="dh-card-title">
            {Language.bestSellersAllTime || 'Top products, all-time by units sold'}
          </span>
          <button
            type="button"
            className="dh-card-link"
            onClick={() => navigate('/product-performance')}
          >
            {Language.viewAll || 'View all'}
          </button>
        </div>
        {bestSellers === null && !loadError ? (
          <div className="dh-list-skeleton" />
        ) : bestSellers.length === 0 ? (
          <div className="dh-card-empty">{Language.noProductsData || 'No products sold yet.'}</div>
        ) : (
          <ol className="dh-seller-list">
            {bestSellers.slice(0, 5).map((p, i) => (
              <li key={p._id} className="dh-seller-row">
                <span className="dh-seller-rank">{i + 1}</span>
                <span className="dh-seller-name">{p.productName}</span>
                <span className="dh-seller-count">
                  {p.totalSold} {Language.sold || 'sold'}
                </span>
              </li>
            ))}
          </ol>
        )}
      </div>

      {/* ---- Navigation hub ---- */}
      <div className="dh-section-label">{Language.explore || 'Explore'}</div>
      <div className="dashboard-grid">
        {categories.map((category) => (
          <div
            key={category.path}
            className="oc-hub-card"
            onClick={() => navigate(category.path)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter') navigate(category.path)
            }}
          >
            <div className="dashboard-item-content">
              <span
                className="oc-hub-card-icon"
                style={{ background: `${category.accent}1f`, color: category.accent }}
              >
                <CIcon icon={category.icon} size="lg" />
              </span>
              <CIcon icon={cilArrowRight} className="dh-hub-arrow" />
            </div>
            <div>
              <p className="oc-hub-card-title">{category.name}</p>
              <p className="oc-hub-card-desc">{category.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default Dashboard
