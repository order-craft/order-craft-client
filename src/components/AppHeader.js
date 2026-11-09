import React, { useEffect, useMemo, useState } from 'react'
import { Link, matchPath, useLocation } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import {
  CDropdown,
  CDropdownItem,
  CDropdownMenu,
  CDropdownToggle,
  CHeader,
  CHeaderNav,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilMenu, cilChevronRight } from '@coreui/icons'
import { format } from 'date-fns'
import translations from '../app/Language'
import { getDateLocale } from '../helpers/dateLocale'
import { AppHeaderDropdown } from './header/index'
import NotificationBell from './NotificationBell'

// path pattern → [label key, section key, parent path]
const PAGES = [
  ['/dashboard', 'navHome', 'navService'],
  ['/orders/ordersList', 'orders', 'navService'],
  ['/tables/tablesList', 'navTablesBills', 'navService'],
  ['/tables/guru', 'navLeaderboard', 'navInsights'],
  ['/tables/:tableId', 'navTableDetail', 'navService', '/tables/tablesList'],
  ['/support', 'navServiceCalls', 'navService'],
  ['/product/availability', 'navAvailability', 'navService'],
  ['/menu/sections', 'navMenu', 'navMenuStock'],
  ['/menu/sections/:sectionId', 'navCategories', 'navMenuStock', '/menu/sections'],
  ['/menu/categories/:id', 'navProducts', 'navMenuStock', '/menu/sections'],
  ['/stock-inventory', 'navInventory', 'navMenuStock'],
  ['/Sales', 'navSales', 'navInsights'],
  ['/order-management', 'navOrderInsights', 'navInsights'],
  ['/product-performance', 'navProductInsights', 'navInsights'],
  ['/employee-performance', 'navStaffInsights', 'navInsights'],
  ['/daily-receipt', 'navDailyReport', 'navInsights'],
  ['/history', 'navHistory', 'navInsights'],
  ['/users/usersList', 'navStaff', 'navSettings'],
  ['/users/createUser', 'navNewStaff', 'navSettings', '/users/usersList'],
  ['/payment-methods', 'navPaymentMethods', 'navSettings'],
  ['/support-types', 'navCallTypes', 'navSettings'],
  ['/bill', 'navBilling', 'navSettings'],
  ['/profile', 'navProfile', 'navSettings'],
]

const LANGS = [
  ['English', 'EN', 'English'],
  ['French', 'FR', 'Français'],
  ['Italian', 'IT', 'Italiano'],
]

const AppHeader = () => {
  const dispatch = useDispatch()
  const { pathname } = useLocation()
  const sidebarShow = useSelector((state) => state.sidebarShow)
  const t = useSelector((state) => state.language)
  const L = translations[t] || {}
  const dateLocale = getDateLocale(t)

  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 15000)
    return () => clearInterval(id)
  }, [])

  const page = useMemo(() => {
    const hit = PAGES.find(([pattern]) => matchPath({ path: pattern, end: true }, pathname))
    if (!hit) return null
    const [, labelKey, sectionKey, parent] = hit
    const parentHit = parent && PAGES.find(([p]) => p === parent)
    return {
      title: L[labelKey],
      section: L[sectionKey],
      parent: parentHit ? { to: parent, label: L[parentHit[1]] } : null,
    }
  }, [pathname, L])

  const currentLang = LANGS.find(([key]) => key === t) || LANGS[0]

  return (
    <CHeader position="sticky" className="p-0 app-header">
      <div className="oc-header-inner">
        <button
          type="button"
          className="oc-header-toggler"
          onClick={() => dispatch({ type: 'set', sidebarShow: !sidebarShow })}
          aria-label="Toggle navigation"
        >
          <CIcon icon={cilMenu} />
        </button>

        {page && (
          <div className="oc-header-where">
            <div className="oc-header-crumb">
              <span>{page.section}</span>
              {page.parent && (
                <>
                  <CIcon icon={cilChevronRight} width={10} />
                  <Link to={page.parent.to}>{page.parent.label}</Link>
                </>
              )}
            </div>
            <h1 className="oc-header-title">{page.title}</h1>
          </div>
        )}

        <div className="oc-header-right">
          <div className="oc-clock" aria-label="Current time">
            <span className="oc-clock-time">{format(now, 'HH:mm')}</span>
            <span className="oc-clock-date">
              {format(now, 'EEE d MMM', { locale: dateLocale })}
            </span>
          </div>

          <CDropdown placement="bottom-end">
            <CDropdownToggle caret={false} className="oc-lang-toggle" aria-label="Language">
              {currentLang[1]}
            </CDropdownToggle>
            <CDropdownMenu>
              {LANGS.map(([key, , label]) => (
                <CDropdownItem
                  key={key}
                  active={t === key}
                  as="button"
                  type="button"
                  onClick={() => dispatch({ type: 'set', language: key })}
                >
                  {label}
                </CDropdownItem>
              ))}
            </CDropdownMenu>
          </CDropdown>

          <CHeaderNav className="align-items-center">
            <NotificationBell />
            <AppHeaderDropdown />
          </CHeaderNav>
        </div>
      </div>
    </CHeader>
  )
}

export default AppHeader
