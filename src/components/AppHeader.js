import { useEffect, useRef } from 'react'
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
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilMenu, cilGlobeAlt } from '@coreui/icons'
import { AppHeaderDropdown } from './header/index'
import './AppHeader.css'

const LANGUAGES = [
  { code: 'English', label: 'English', short: 'EN' },
  { code: 'French', label: 'Français', short: 'FR' },
  { code: 'Italian', label: 'Italiano', short: 'IT' },
]

const AppHeader = () => {
  const headerRef = useRef()
  const dispatch = useDispatch()
  const sidebarShow = useSelector((state) => state.sidebarShow)
  const currentLanguage = useSelector((state) => state.language)

  useEffect(() => {
    const onScroll = () => {
      if (headerRef.current) {
        headerRef.current.classList.toggle('is-scrolled', document.documentElement.scrollTop > 0)
      }
    }
    document.addEventListener('scroll', onScroll)
    return () => document.removeEventListener('scroll', onScroll)
  }, [])

  const activeLang = LANGUAGES.find((l) => l.code === currentLanguage) || LANGUAGES[0]

  return (
    <CHeader position="sticky" className="app-header" ref={headerRef}>
      <CContainer className="app-header-inner" fluid>
        <CHeaderToggler
          className="app-header-toggler"
          onClick={() => dispatch({ type: 'set', sidebarShow: !sidebarShow })}
        >
          <CIcon icon={cilMenu} size="lg" />
        </CHeaderToggler>

        <CHeaderNav className="app-header-right ms-auto">
          {/* Language dropdown */}
          <CDropdown variant="nav-item" placement="bottom-end">
            <CDropdownToggle caret={false} className="app-header-lang">
              <CIcon icon={cilGlobeAlt} className="app-header-lang-icon" />
              <span className="app-header-lang-code">{activeLang.short}</span>
            </CDropdownToggle>
            <CDropdownMenu className="app-header-menu">
              {LANGUAGES.map((lang) => (
                <CDropdownItem
                  key={lang.code}
                  active={currentLanguage === lang.code}
                  onClick={() => dispatch({ type: 'set', language: lang.code })}
                >
                  <span className="app-header-lang-short">{lang.short}</span>
                  {lang.label}
                </CDropdownItem>
              ))}
            </CDropdownMenu>
          </CDropdown>

          {/* Account dropdown */}
          <AppHeaderDropdown />
        </CHeaderNav>
      </CContainer>
    </CHeader>
  )
}

export default AppHeader
