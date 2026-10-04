import React from 'react'
import PropTypes from 'prop-types'
import { CCard, CCardHeader } from '@coreui/react'
const ShiftReports = (props) => {
  return (
    <CCard className="mb-4">
      <CCardHeader>This service will be available soon.</CCardHeader>
    </CCard>
  )
}

ShiftReports.propTypes = {
  className: PropTypes.string,
}

export default ShiftReports
