import React from 'react'
import { NavLink } from 'react-router-dom'
import PropTypes from 'prop-types'

import SimpleBar from 'simplebar-react'
import 'simplebar-react/dist/simplebar.min.css'

import { CBadge, CNavLink, CSidebarNav } from '@coreui/react'

export const AppSidebarNav = ({ items }) => {
  const navLink = (name, icon, badge, indent = false) => (
    <>
      {icon
        ? icon
        : indent && (
            <span className="nav-icon">
              <span className="nav-icon-bullet"></span>
            </span>
          )}
      {name && <span className="nav-label">{name}</span>}
      {badge && (
        <CBadge color={badge.color} className="ms-auto">
          {badge.text}
        </CBadge>
      )}
    </>
  )

  const navItem = (item, index, indent = false) => {
    const { component, name, badge, icon, ...rest } = item
    const Component = component
    return (
      <Component as="div" key={index}>
        {rest.to || rest.href ? (
          <CNavLink
            {...(rest.to && { as: NavLink })}
            title={typeof name === 'string' ? name : undefined}
            {...rest}
          >
            {navLink(name, icon, badge, indent)}
          </CNavLink>
        ) : (
          navLink(name, icon, badge, indent)
        )}
      </Component>
    )
  }

  const navGroup = (item, index) => {
    const { component, name, icon, items, to, ...rest } = item
    const Component = component
    return (
      <Component compact as="div" key={index} toggler={navLink(name, icon)} {...rest}>
        {item.items?.map((child, i) =>
          child.items ? navGroup(child, i) : navItem(child, i, true),
        )}
      </Component>
    )
  }

  const render = (node, index) => {
    if (node.label && Array.isArray(node.items)) {
      return (
        <React.Fragment key={`section-${index}`}>
          <div className="nav-section-label">{node.label}</div>
          {node.items.map((child, i) => (child.items ? navGroup(child, i) : navItem(child, i)))}
        </React.Fragment>
      )
    }
    return node.items ? navGroup(node, index) : navItem(node, index)
  }

  return (
    <CSidebarNav as={SimpleBar}>
      {items && items.map((node, index) => render(node, index))}
    </CSidebarNav>
  )
}

AppSidebarNav.propTypes = {
  items: PropTypes.arrayOf(PropTypes.any).isRequired,
}
