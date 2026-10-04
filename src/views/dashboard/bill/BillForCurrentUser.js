import React, { useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import { CRow, CCol, CWidgetStatsA, CSpinner, CAlert } from '@coreui/react'
import axios from 'axios'
import { BaseUrl } from '../../../helpers/BaseUrl'
import { GetToken } from '../../../helpers/GetToken'

const BillForCurrentUser = (props) => {
  const token = GetToken()
  const [loading, setLoading] = useState(false)
  const [bill, setBill] = useState(null)
  const [error, setError] = useState(null)

  const getBillForCurrentUser = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await axios.get(`${BaseUrl}/bills/current`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      setBill(response.data)
    } catch (err) {
      setError('Error fetching the bill. Please try again later.')
      console.error(err)
    }
    setLoading(false)
  }

  useEffect(() => {
    getBillForCurrentUser()
  }, [])

  return (
    <CRow className={props.className} xs={{ gutter: 4 }}>
      <CCol>
        {loading ? (
          <CSpinner color="primary" style={{ width: '3rem', height: '3rem' }} />
        ) : error ? (
          <CAlert color="danger">{error}</CAlert>
        ) : bill ? (
          <CWidgetStatsA
            color="success"
            value={`Balance: ${bill.balance.toFixed(2)} TND`}
            title={`Total Amount: ${bill.totalAmount.toFixed(2)} TND | Paid: ${bill.amountPaid.toFixed(2)} TND`}
          />
        ) : (
          <CAlert color="info">No bill available for the current user.</CAlert>
        )}
      </CCol>
    </CRow>
  )
}

BillForCurrentUser.propTypes = {
  className: PropTypes.string,
}

export default BillForCurrentUser
