import React, { useCallback, useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import { CButton, CSpinner } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilWallet, cilWarning, cilReload } from '@coreui/icons'
import axios from 'axios'
import { BaseUrl } from '../../../helpers/BaseUrl'
import { GetToken } from '../../../helpers/GetToken'
import { useSelector } from 'react-redux'
import translations from '../../../app/Language'
import './bill.css'

const BillForCurrentUser = ({ className }) => {
  const token = GetToken()
  const t = useSelector((state) => state.language)
  const Language = translations[t]

  const [bill, setBill] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const getBillForCurrentUser = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await axios.get(`${BaseUrl}/bills/current`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setBill(response.data)
    } catch (err) {
      console.error('Error fetching the bill:', err)
      setError(Language.fetchError || 'Error fetching the bill. Please try again later.')
    } finally {
      setLoading(false)
    }
  }, [token, Language])

  useEffect(() => {
    getBillForCurrentUser()
  }, [getBillForCurrentUser])

  /* ---------- derived ---------- */
  const totalAmount = Number(bill?.totalAmount) || 0
  const amountPaid = Number(bill?.amountPaid) || 0
  const balance = Number(bill?.balance) || 0
  const paidPct = totalAmount > 0 ? (amountPaid / totalAmount) * 100 : 0

  const fmtTND = (v) =>
    new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
    }).format(Number(v) || 0)

  const isEmpty = !loading && !error && !bill

  /* ---------- render ---------- */
  return (
    <div className={`bill-card ${className || ''}`}>
      {/* ---------- Header ---------- */}
      <div className="bill-card-header">
        <div className="bill-card-header-left">
          <h5 className="bill-card-title">
            <CIcon icon={cilWallet} />
            {Language.currentBill || 'Current bill'}
          </h5>
          <div className="bill-card-subtitle">
            {Language.currentBillHint || 'Outstanding balance for the current billing cycle'}
          </div>
        </div>

        <div className="bill-card-header-right">
          <CButton
            color="secondary"
            variant="outline"
            onClick={getBillForCurrentUser}
            disabled={loading}
            aria-label={Language.Refresh || 'Refresh'}
          >
            <CIcon icon={cilReload} />
          </CButton>
        </div>
      </div>

      {/* ---------- Body ---------- */}
      {loading ? (
        <div className="bill-skeleton">
          <div className="bill-skeleton-row" style={{ height: 100 }} />
        </div>
      ) : error ? (
        <div className="bill-info bill-info-danger">
          <CIcon icon={cilWarning} />
          <div style={{ flex: 1 }}>{error}</div>
          <CButton size="sm" color="danger" onClick={getBillForCurrentUser}>
            {Language.Retry || 'Retry'}
          </CButton>
        </div>
      ) : isEmpty ? (
        <div className="bill-empty">
          <CIcon icon={cilWallet} size="xl" />
          <div className="bill-empty-title">{Language.noBill || 'No bill yet'}</div>
          <div className="bill-empty-body">
            {Language.noBillHint || 'A bill will be created once your first order is paid.'}
          </div>
        </div>
      ) : (
        <>
          {/* Balance hero */}
          <div className="bill-balance-hero">
            <div className="bill-balance-label">{Language.balance || 'Balance'}</div>
            <div className={`bill-balance-value ${balance <= 0 ? 'is-clear' : ''}`}>
              {fmtTND(balance)}
              <span className="unit">TND</span>
            </div>
            <div className="bill-balance-hint">
              {balance <= 0
                ? Language.allPaid || 'All paid up'
                : Language.balanceDueHint || 'Outstanding balance on the current bill'}
            </div>
          </div>

          {/* Summary */}
          <div className="bill-tx-summary">
            <div className="bill-tx-cell">
              <div className="bill-tx-label">{Language.totalAmount || 'Total'}</div>
              <div className="bill-tx-value">
                {fmtTND(totalAmount)}
                <span className="unit">TND</span>
              </div>
            </div>
            <div className="bill-tx-cell">
              <div className="bill-tx-label">{Language.amountPaid || 'Paid'}</div>
              <div className="bill-tx-value is-credit">
                {fmtTND(amountPaid)}
                <span className="unit">TND</span>
              </div>
            </div>
            <div className="bill-tx-cell">
              <div className="bill-tx-label">{Language.progress || 'Progress'}</div>
              <div className="bill-tx-value">{paidPct.toFixed(0)}%</div>
              <div className="bill-tx-progress-track">
                <div
                  className="bill-tx-progress-fill"
                  style={{
                    width: `${Math.min(paidPct, 100)}%`,
                    background: paidPct >= 100 ? '#198754' : '#0d6efd',
                  }}
                />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

BillForCurrentUser.propTypes = {
  className: PropTypes.string,
}

export default BillForCurrentUser
