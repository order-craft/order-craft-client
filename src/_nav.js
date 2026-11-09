import React from 'react'
import { useSelector } from 'react-redux'
import CIcon from '@coreui/icons-react'
import {
  cilHome,
  cilListNumbered,
  cilRestaurant,
  cilBell,
  cilBraille,
  cilNotes,
  cilLayers,
  cilChartLine,
  cilListRich,
  cilBasket,
  cilPeople,
  cilStar,
  cilDescription,
  cilHistory,
  cilUser,
  cilCreditCard,
  cilSettings,
  cilWallet,
} from '@coreui/icons'
import { CNavItem } from '@coreui/react'
import { jwtDecode } from 'jwt-decode'
import translations from './app/Language'

const icon = (i) => <CIcon icon={i} customClassName="nav-icon" />

// Sections follow the shape of a restaurant day: what's happening on the
// floor right now, what's on the menu, how the business is doing, and the
// rarely-touched setup. Routes and role filtering are unchanged.
const NavItems = () => {
  const t = useSelector((state) => state.language)
  const L = translations[t] || {}

  const token = localStorage.getItem('token')
  let role = null
  if (token) {
    try {
      role = jwtDecode(token).role
    } catch {
      role = null
    }
  }

  const item = (name, to, i) => ({ component: CNavItem, name, to, icon: icon(i) })

  const _nav = [
    {
      key: 'service',
      label: L.navService || 'Service',
      items: [
        item(L.navHome || 'Home', '/dashboard', cilHome),
        item(L.orders || 'Orders', '/orders/ordersList', cilListNumbered),
        item(L.navTablesBills || 'Tables & bills', '/tables/tablesList', cilRestaurant),
        item(L.navServiceCalls || 'Service calls', '/support', cilBell),
        item(L.navAvailability || 'Availability', '/product/availability', cilBraille),
      ],
    },
    {
      key: 'menu',
      label: L.navMenuStock || 'Menu & stock',
      items: [
        item(L.navMenu || 'Menu', '/menu/sections', cilNotes),
        item(L.navInventory || 'Inventory', '/stock-inventory', cilLayers),
      ],
    },
    {
      key: 'insights',
      label: L.navInsights || 'Insights',
      items: [
        item(L.navSales || 'Sales', '/Sales', cilChartLine),
        item(L.navOrderInsights || 'Order insights', '/order-management', cilListRich),
        item(L.navProductInsights || 'Product insights', '/product-performance', cilBasket),
        item(L.navStaffInsights || 'Staff insights', '/employee-performance', cilPeople),
        item(L.navLeaderboard || 'Table leaderboard', '/tables/guru', cilStar),
        item(L.navDailyReport || 'Daily receipt', '/daily-receipt', cilDescription),
        item(L.navHistory || 'Order history', '/history', cilHistory),
      ],
    },
    {
      key: 'settings',
      label: L.navSettings || 'Settings',
      items: [
        item(L.navStaff || 'Staff', '/users/usersList', cilUser),
        item(L.navPaymentMethods || 'Payment methods', '/payment-methods', cilCreditCard),
        item(L.navCallTypes || 'Call types', '/support-types', cilSettings),
        item(L.navBilling || 'Billing', '/bill', cilWallet),
      ],
    },
  ]

  const SUPERCLIENT_ONLY_ROUTES = new Set([
    '/dashboard',
    '/Sales',
    '/order-management',
    '/product-performance',
    '/employee-performance',
    '/bill',
    '/menu/sections',
    '/users/usersList',
    '/users/createUser',
    '/tables/guru',
    '/payment-methods',
    '/support-types',
    '/stock-inventory',
  ])

  const filterItem = (navItem) => {
    if (role === 'superClient' || role !== 'client') return navItem
    if (SUPERCLIENT_ONLY_ROUTES.has(navItem.to)) return null
    return navItem
  }

  return _nav
    .map((section) => ({ ...section, items: section.items.map(filterItem).filter(Boolean) }))
    .filter((section) => section.items.length > 0)
}

export default NavItems
