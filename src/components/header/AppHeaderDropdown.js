import React from 'react'
import {
  CAvatar,
  CDropdown,
  CDropdownDivider,
  CDropdownItem,
  CDropdownMenu,
  CDropdownToggle,
} from '@coreui/react'
import { cilAccountLogout, cilUser } from '@coreui/icons'
import CIcon from '@coreui/icons-react'
import { useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'

import avatar8 from './../../assets/images/avatars/user.jpeg'
import { useAuth } from '../../context/AuthContext'
import translations from '../../app/Language'

const AppHeaderDropdown = () => {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const t = useSelector((state) => state.language)
  const L = translations[t] || {}

  return (
    <CDropdown variant="nav-item" placement="bottom-end">
      <CDropdownToggle className="py-0 pe-0 ps-2" caret={false} aria-label="Account menu">
        <CAvatar src={avatar8} size="md" />
      </CDropdownToggle>
      <CDropdownMenu>
        <CDropdownItem as="button" type="button" onClick={() => navigate('/profile')}>
          <CIcon icon={cilUser} className="me-2" />
          {L.navProfile || 'Account'}
        </CDropdownItem>
        <CDropdownDivider />
        <CDropdownItem as="button" type="button" onClick={() => logout()}>
          <CIcon icon={cilAccountLogout} className="me-2" />
          {L.signOut || 'Sign out'}
        </CDropdownItem>
      </CDropdownMenu>
    </CDropdown>
  )
}

export default AppHeaderDropdown
