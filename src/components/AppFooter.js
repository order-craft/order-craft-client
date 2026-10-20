import React from 'react'
import { CFooter } from '@coreui/react'
import { useSelector } from 'react-redux'
import translations from '../app/Language'
import './AppFooter.css'

const AppFooter = () => {
  const t = useSelector((state) => state.language)
  const Language = translations[t]
  const year = new Date().getFullYear()

  return (
    <CFooter className="app-footer">
      <div className="app-footer-left">
        <span>
          © {year} {Language.footerBrand}
        </span>
        <span className="app-footer-dot">·</span>
        <span>{Language.footerRights}</span>
      </div>

      <div className="app-footer-right ms-auto">
        <span>{Language.footerBuiltBy}</span>
        <a href="https://ordercraft.netlify.app/" target="_blank" rel="noopener noreferrer">
          {Language.footerBrand}
        </a>
      </div>
    </CFooter>
  )
}

export default React.memo(AppFooter)
