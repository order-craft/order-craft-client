import React, { useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import { CSpinner, CAlert } from '@coreui/react'
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
      setError('The bill couldn’t be loaded. Refresh the page to try again.')
      console.error(err)
    }
    setLoading(false)
  }

  useEffect(() => {
    getBillForCurrentUser()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (loading) {
    return (
      <div className={`oc-empty ${props.className || ''}`}>
        <CSpinner color="primary" size="sm" />
      </div>
    )
  }
  if (error) return <CAlert color="danger">{error}</CAlert>
  if (!bill) return <CAlert color="info">There is no bill for this account yet.</CAlert>

  const total = Number(bill.totalAmount) || 0
  const paid = Number(bill.amountPaid) || 0
  const balance = Number(bill.balance) || 0
  const paidPct = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0

  return (
    <div className={`bl-summary ${props.className || ''}`}>
      <div className="bl-due">
        <span className="bl-label">{balance > 0 ? 'Balance due' : 'Balance'}</span>
        <span className={`bl-amount ${balance > 0 ? 'is-due' : 'is-clear'}`}>
          {balance.toFixed(2)}
          <small>TND</small>
        </span>
        {balance <= 0 && <span className="bl-clear">Fully paid</span>}
      </div>
      <div className="bl-figures">
        <div>
          <span className="bl-label">Total billed</span>
          <span className="bl-figure">{total.toFixed(2)} TND</span>
        </div>
        <div>
          <span className="bl-label">Paid so far</span>
          <span className="bl-figure">{paid.toFixed(2)} TND</span>
        </div>
        <div className="bl-progress" aria-label={`${paidPct}% paid`}>
          <span style={{ width: `${paidPct}%` }} />
        </div>
      </div>
    </div>
  )
}

BillForCurrentUser.propTypes = {
  className: PropTypes.string,
}

export default BillForCurrentUser
