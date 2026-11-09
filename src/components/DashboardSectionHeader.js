import React from 'react'
import PropTypes from 'prop-types'
import CIcon from '@coreui/icons-react'

// Page heading for the Insights pages. They have their own sidebar entries
// now, so the header no longer needs a "back to dashboard" link.
const DashboardSectionHeader = ({ icon, title, subtitle, accent }) => (
  <div className="oc-section-header">
    <div className="oc-section-header-row">
      {icon && (
        <span className="oc-section-icon" style={{ background: `${accent}1a`, color: accent }}>
          <CIcon icon={icon} size="lg" />
        </span>
      )}
      <div>
        <h2 className="oc-section-title">{title}</h2>
        {subtitle && <p className="oc-section-subtitle">{subtitle}</p>}
      </div>
    </div>
  </div>
)

DashboardSectionHeader.propTypes = {
  icon: PropTypes.array,
  title: PropTypes.string.isRequired,
  subtitle: PropTypes.string,
  accent: PropTypes.string,
  backLabel: PropTypes.string,
}

DashboardSectionHeader.defaultProps = {
  accent: '#1a5a44',
}

export default DashboardSectionHeader
