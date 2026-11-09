import React from 'react'
import { useSelector, useDispatch } from 'react-redux'

import {
  CCloseButton,
  CSidebar,
  CSidebarBrand,
  CSidebarFooter,
  CSidebarHeader,
  CSidebarToggler,
} from '@coreui/react'

import { AppSidebarNav } from './AppSidebarNav'

import logo from 'src/assets/images/logo-.png'

import NavItems from '../_nav'
import translations from '../app/Language'

const AppSidebar = () => {
  const dispatch = useDispatch()
  const unfoldable = useSelector((state) => state.sidebarUnfoldable)
  const sidebarShow = useSelector((state) => state.sidebarShow)
  const t = useSelector((state) => state.language)
  const Language = translations[t] || {}
  const navigation = NavItems()

  return (
    <CSidebar
      className="app-sidebar"
      colorScheme="dark"
      position="fixed"
      unfoldable={unfoldable}
      visible={sidebarShow}
      onVisibleChange={(visible) => {
        dispatch({ type: 'set', sidebarShow: visible })
      }}
    >
      <CSidebarHeader className="app-sidebar-header">
        <CSidebarBrand to="/" className="app-sidebar-brand">
          <img src={logo} alt="" className="app-sidebar-logo" />
          <span className="app-sidebar-wordmark">
            <strong>Order Craft</strong>
            <span>{Language.ocTagline || 'Restaurant operations'}</span>
          </span>
        </CSidebarBrand>
        <CCloseButton
          className="d-lg-none ms-auto"
          white
          onClick={() => dispatch({ type: 'set', sidebarShow: false })}
        />
      </CSidebarHeader>
      <AppSidebarNav items={navigation} language={Language} />
      <CSidebarFooter className="d-none d-lg-flex">
        <CSidebarToggler
          onClick={() => dispatch({ type: 'set', sidebarUnfoldable: !unfoldable })}
        />
      </CSidebarFooter>
    </CSidebar>
  )
}

export default React.memo(AppSidebar)
