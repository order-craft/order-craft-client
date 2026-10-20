import React, { useEffect, useRef } from 'react'
import { NavLink } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import {
  CContainer,
  CDropdown,
  CDropdownItem,
  CDropdownMenu,
  CDropdownToggle,
  CHeader,
  CHeaderNav,
  CHeaderToggler,
  CNavLink,
  CNavItem,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilMenu } from '@coreui/icons'
import translations from '../app/Language'
import { AppHeaderDropdown } from './header/index'
import AppBreadcrumb from './AppBreadcrumb'
import NotificationBell from './NotificationBell'
import EN from '../assets/flags/English.png'
import FR from '../assets/flags/Frensh.jpg'
import IT from '../assets/flags/Italy.jpg'

const AppHeader = () => {
  const headerRef = useRef()
  const dispatch = useDispatch()
  const sidebarShow = useSelector((state) => state.sidebarShow)
  const t = useSelector((state) => state.language)
  const Language = translations[t]

  useEffect(() => {
    document.addEventListener('scroll', () => {
      headerRef.current &&
        headerRef.current.classList.toggle('shadow-sm', document.documentElement.scrollTop > 0)
    })
  }, [])

  return (
    <CHeader position="sticky" className="mb-4 p-0 app-header" ref={headerRef}>
      <CContainer className="border-bottom px-4" fluid>
        <CHeaderToggler
          onClick={() => dispatch({ type: 'set', sidebarShow: !sidebarShow })}
          style={{ marginInlineStart: '-14px' }}
        >
          <CIcon icon={cilMenu} size="lg" />
        </CHeaderToggler>
        <CHeaderNav className="d-none d-md-flex">
          <CNavItem>
            <CNavLink to="/" as={NavLink}>
              {Language.dashboard}
            </CNavLink>
          </CNavItem>
        </CHeaderNav>
        <CHeaderNav className="ms-auto">
          <CDropdown variant="nav-item" placement="bottom-end">
            {t === 'English' ? (
              <CDropdownToggle caret={false}>
                <img src={EN} width={30} alt="English" />
              </CDropdownToggle>
            ) : t === 'French' ? (
              <CDropdownToggle caret={false}>
                <img src={FR} width={30} alt="Français" />
              </CDropdownToggle>
            ) : (
              <CDropdownToggle caret={false}>
                <img src={IT} width={30} alt="Italiano" />
              </CDropdownToggle>
            )}
            <CDropdownMenu>
              <CDropdownItem
                active={t === 'English'}
                className="d-flex align-items-center"
                as="button"
                type="button"
                onClick={() => dispatch({ type: 'set', language: 'English' })}
              >
                English
              </CDropdownItem>
              <CDropdownItem
                active={t === 'French'}
                className="d-flex align-items-center"
                as="button"
                type="button"
                onClick={() => dispatch({ type: 'set', language: 'French' })}
              >
                Français
              </CDropdownItem>
              <CDropdownItem
                active={t === 'Italian'}
                className="d-flex align-items-center"
                as="button"
                type="button"
                onClick={() => dispatch({ type: 'set', language: 'Italian' })}
              >
                Italiano
              </CDropdownItem>
            </CDropdownMenu>
          </CDropdown>
          <li className="nav-item py-1">
            <div className="vr h-100 mx-2 text-body text-opacity-75"></div>
          </li>
          <NotificationBell />
          <li className="nav-item py-1">
            <div className="vr h-100 mx-2 text-body text-opacity-75"></div>
          </li>
          <AppHeaderDropdown />
        </CHeaderNav>
      </CContainer>
      <CContainer className="px-4" fluid>
        <AppBreadcrumb />
      </CContainer>
    </CHeader>
  )
}

export default AppHeader
