import React from 'react'
import { CFooter } from '@coreui/react'
import './AppFooter.css'

const AppFooter = () => {
  const year = new Date().getFullYear()

  return (
    <CFooter className="app-footer">
      <div className="app-footer-left">
        <span>© {year} Order Craft</span>
        <span className="app-footer-dot">·</span>
        <span>All rights reserved</span>
      </div>

      <div className="app-footer-right ms-auto">
        <span>Built by</span>
        <a href="https://ordercraft.netlify.app/" target="_blank" rel="noopener noreferrer">
          Order Craft
        </a>
      </div>
    </CFooter>
  )
}

export default React.memo(AppFooter)
