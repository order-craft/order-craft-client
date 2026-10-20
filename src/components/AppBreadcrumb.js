import React from 'react'
import { useLocation } from 'react-router-dom'

import routes from '../routes'

import { CBreadcrumb, CBreadcrumbItem } from '@coreui/react'
import { useSelector } from 'react-redux'
import translations from '../app/Language'

// routes.js route names are hardcoded English labels, not translation keys.
// This maps each path to the Language key that already exists for it, so
// the breadcrumb reads in the active language instead of always English.
const ROUTE_NAME_KEYS = {
  '/tables/tablesList': 'payment',
  '/tables/guru': 'Guru',
  '/orders/ordersList': 'orders',
  '/support-types': 'supportTypes',
  '/support': 'support',
  '/product/availability': 'productAvailability',
  '/daily-receipt': 'dailyReceipt',
  '/history': 'history',
  '/dashboard': 'dashboard',
  '/Sales': 'salesStatistic',
  '/order-management': 'orderManagement',
  '/product-performance': 'productPerformance',
  '/bill': 'bills',
  '/employee-performance': 'EmployeePerformance',
  '/stock-inventory': 'stockInventory',
  '/users/usersList': 'usersList',
  '/users/createUser': 'createUser',
  '/menu/sections': 'sections',
  '/profile': 'profile',
  '/payment-methods': 'paymentMethods',
}

const AppBreadcrumb = () => {
  const currentLocation = useLocation().pathname
  const t = useSelector((state) => state.language)
  const Language = translations[t]

  const getRouteName = (pathname, routes) => {
    const currentRoute = routes.find((route) => route.path === pathname)
    if (!currentRoute) return false
    const key = ROUTE_NAME_KEYS[pathname]
    return (key && Language[key]) || currentRoute.name
  }

  const getBreadcrumbs = (location) => {
    const breadcrumbs = []
    location.split('/').reduce((prev, curr, index, array) => {
      const currentPathname = `${prev}/${curr}`
      const routeName = getRouteName(currentPathname, routes)
      routeName &&
        breadcrumbs.push({
          pathname: currentPathname,
          name: routeName,
          active: index + 1 === array.length ? true : false,
        })
      return currentPathname
    })
    return breadcrumbs
  }

  const breadcrumbs = getBreadcrumbs(currentLocation)
  return (
    <CBreadcrumb className="my-0">
      <CBreadcrumbItem href="/">{Language.home}</CBreadcrumbItem>
      {breadcrumbs.map((breadcrumb, index) => {
        const name = breadcrumb.name
        return (
          <CBreadcrumbItem
            {...(breadcrumb.active ? { active: true } : { href: breadcrumb.pathname })}
            key={index}
          >
            {name}
          </CBreadcrumbItem>
        )
      })}
    </CBreadcrumb>
  )
}

export default React.memo(AppBreadcrumb)
