import React from 'react'
import { CFooter } from '@coreui/react'

const AppFooter = () => {
  return (
    <CFooter className="px-4">
      <div>
        <a href="https://ordercraft.netlify.app/" target="_blank" rel="noopener noreferrer">
          Order Craft
        </a>
        <span className="ms-1">&copy; 2024 Order Craft.</span>
      </div>
      <div className="ms-auto">
        <span className="me-1">Powered with&#x1F9E1;By</span>
        <a href="https://ordercraft.netlify.app/" target="_blank" rel="noopener noreferrer">
          Order Craft
        </a>
      </div>
    </CFooter>
  )
}

export default React.memo(AppFooter)
