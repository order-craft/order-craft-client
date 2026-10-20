import React from 'react'
import PropTypes from 'prop-types'
import { Link } from 'react-router-dom'
import { useSelector } from 'react-redux'
import CIcon from '@coreui/icons-react'
import { cilArrowLeft } from '@coreui/icons'
import translations from '../app/Language'

/**
 * Shared header for the hub-only sub-dashboards (Sales, Order Management,
 * Product/Employee Performance, Bill) — these pages have no sidebar entry
 * of their own and are only reached through the Dashboard hub, so they need
 * a title and a way back.
 */
const DashboardSectionHeader = ({ icon, title, subtitle, accent, backLabel }) => {
  const t = useSelector((state) => state.language)
  const Language = translations[t]

  return (
    <div className="oc-section-header">
      <Link to="/dashboard" className="oc-back-link">
        <CIcon icon={cilArrowLeft} />
        {backLabel || Language.dashboard}
      </Link>
      <div className="oc-section-header-row">
        {icon && (
          <span className="oc-section-icon" style={{ background: `${accent}1f`, color: accent }}>
            <CIcon icon={icon} size="lg" />
          </span>
        )}
        <div>
          <h4 className="oc-section-title">{title}</h4>
          {subtitle && <p className="oc-section-subtitle">{subtitle}</p>}
        </div>
      </div>
    </div>
  )
}

DashboardSectionHeader.propTypes = {
  icon: PropTypes.array,
  title: PropTypes.string.isRequired,
  subtitle: PropTypes.string,
  accent: PropTypes.string,
  backLabel: PropTypes.string,
}

DashboardSectionHeader.defaultProps = {
  accent: '#b5502b',
}

export default DashboardSectionHeader
