import React from 'react'
import { useSelector } from 'react-redux'
import CIcon from '@coreui/icons-react'
import {
  cilNotes,
  cilSpeedometer,
  cilWallet,
  cilUser,
  cilListNumbered,
  cilBraille,
  cilBell,
  cilDiamond,
  cilAlignLeft,
  cilHouse,
  cilCreditCard,
  cilHistory,
} from '@coreui/icons'
import { CNavGroup, CNavItem } from '@coreui/react'
import { jwtDecode } from 'jwt-decode'
import translations from './app/Language'

const NavItems = () => {
  const t = useSelector((state) => state.language)
  const Language = translations[t]

  const token = localStorage.getItem('token')
  let role = null
  if (token) {
    const decodedToken = jwtDecode(token)
    role = decodedToken.role
  }

  // ---- Sections ----
  // Each section = { label, items: [...] }
  const _nav = [
    {
      label: Language.sectionOperations || 'Operations',
      items: [
        {
          component: CNavItem,
          name: Language.dashboard || 'Dashboard',
          to: '/dashboard',
          icon: <CIcon icon={cilSpeedometer} customClassName="nav-icon" />,
        },
        {
          component: CNavItem,
          name: Language?.payment || 'Payment',
          to: '/tables/tablesList',
          icon: <CIcon icon={cilWallet} customClassName="nav-icon" />,
        },
        {
          component: CNavItem,
          name: Language?.orders || 'Orders',
          to: '/orders/ordersList',
          icon: <CIcon icon={cilListNumbered} customClassName="nav-icon" />,
        },
        {
          component: CNavItem,
          name: Language?.productAvailability || "Product's availability",
          to: '/product/availability',
          icon: <CIcon icon={cilBraille} customClassName="nav-icon" />,
        },
      ],
    },
    {
      label: Language.sectionMenuStock || 'Menu & Stock',
      items: [
        {
          component: CNavItem,
          name: Language?.menu || 'Menu',
          to: '/menu/sections',
          icon: <CIcon icon={cilNotes} customClassName="nav-icon" />,
        },
        {
          component: CNavItem,
          name: Language.inventory || 'Inventory',
          to: '/stock-inventory',
          icon: <CIcon icon={cilHouse} customClassName="nav-icon" />,
        },
      ],
    },
    {
      label: Language.sectionManagement || 'Management',
      items: [
        {
          component: CNavGroup,
          name: Language?.users || 'Users',
          to: '/users',
          icon: <CIcon icon={cilUser} customClassName="nav-icon" />,
          items: [
            {
              component: CNavItem,
              name: Language?.usersList || 'Users List',
              to: '/users/usersList',
            },
            {
              component: CNavItem,
              name: Language?.createUser || 'Create User',
              to: '/users/createUser',
            },
          ],
        },
        {
          component: CNavItem,
          name: 'Payment Methods',
          to: '/payment-methods',
          icon: <CIcon icon={cilCreditCard} customClassName="nav-icon" />,
        },
        {
          component: CNavGroup,
          name: Language?.Support || 'Support',
          to: '/support',
          icon: <CIcon icon={cilBell} customClassName="nav-icon" />,
          items: [
            {
              component: CNavItem,
              name: Language?.support || 'Support',
              to: '/support',
            },
            {
              component: CNavItem,
              name: Language?.supportTypes || 'Support Types',
              to: '/support-types',
            },
          ],
        },
      ],
    },
    {
      label: Language.sectionReports || 'Reports',
      items: [
        {
          component: CNavItem,
          name: Language?.dailyReceipt || 'Daily Receipt',
          to: '/daily-receipt',
          icon: <CIcon icon={cilAlignLeft} customClassName="nav-icon" />,
        },
        {
          component: CNavItem,
          name: Language?.history || 'History',
          to: '/history',
          icon: <CIcon icon={cilHistory} customClassName="nav-icon" />,
        },
        {
          component: CNavItem,
          name: 'Guru',
          to: '/tables/guru',
          icon: <CIcon icon={cilDiamond} customClassName="nav-icon" />,
        },
      ],
    },
  ]

  // ---- Role filter ----
  const SUPERCLIENT_ONLY_ROUTES = new Set([
    '/dashboard',
    '/menu/sections',
    '/users/usersList',
    '/users/createUser',
    '/tables/guru',
    '/payment-methods',
    '/support-types',
    '/stock-inventory',
  ])

  const filterItem = (item) => {
    if (role === 'superClient' || role !== 'client') return item
    if (SUPERCLIENT_ONLY_ROUTES.has(item.to)) return null
    if (Array.isArray(item.items)) {
      const kids = item.items.map(filterItem).filter(Boolean)
      if (kids.length === 0) return null
      return { ...item, items: kids }
    }
    return item
  }

  const filteredSections = _nav
    .map((section) => ({
      ...section,
      items: section.items.map(filterItem).filter(Boolean),
    }))
    .filter((section) => section.items.length > 0)

  return filteredSections
}

export default NavItems
