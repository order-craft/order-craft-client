import React from 'react'
import PropTypes from 'prop-types'
import { CCard, CCardHeader } from '@coreui/react'
const EmployeeRatings = (props) => {
  return (
    <CCard className="mb-4">
      <CCardHeader>This service will be available soon.</CCardHeader>
    </CCard>
  )
}

EmployeeRatings.propTypes = {
  className: PropTypes.string,
}

export default EmployeeRatings
