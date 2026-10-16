import React, { useCallback, useEffect, useState } from 'react'
import { CButton, CSpinner } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilArrowTop, cilArrowBottom, cilWarning, cilReload, cilListRich } from '@coreui/icons'
import axios from 'axios'
import { format } from 'date-fns'
import { BaseUrl } from '../../../helpers/BaseUrl'
import { GetToken } from '../../../helpers/GetToken'
import { useSelector } from 'react-redux'
import translations from '../../../app/Language'
import './bill.css'

const TransactionsCards = () => {
  const token = GetToken()
  const t = useSelector((state) => state.language)
  const Language = translations[t]

  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchTransactions = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await axios.get(`${BaseUrl}/bills/current`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const list = (response.data?.transactions || []).map((tx) => ({
        description: tx.description || 'Transaction',
        date: tx.date,
        amount: Number(tx.amount) || 0,
      }))
      // most recent first
      list.sort((a, b) => new Date(b.date) - new Date(a.date))
      setTransactions(list)
    } catch (err) {
      console.error('Error fetching transactions:', err)
      setError(Language.fetchError || 'Error fetching transactions. Please try again later.')
    } finally {
      setLoading(false)
    }
  }, [token, Language])

  useEffect(() => {
    fetchTransactions()
  }, [fetchTransactions])

  /* ---------- derived ---------- */
  const totals = transactions.reduce(
    (acc, tx) => {
      if (tx.amount > 0) acc.credits += tx.amount
      else acc.debits += Math.abs(tx.amount)
      return acc
    },
    { credits: 0, debits: 0 },
  )
  const net = totals.credits - totals.debits

  const fmtTND = (v) =>
    new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
    }).format(Number(v) || 0)

  const fmtDate = (d) => {
    try {
      return format(new Date(d), 'PPP p')
    } catch {
      return '—'
    }
  }

  const isEmpty = !loading && !error && transactions.length === 0

  /* ---------- render ---------- */
  return (
    <div className="bill-card">
      {/* ---------- Header ---------- */}
      <div className="bill-card-header">
        <div className="bill-card-header-left">
          <h5 className="bill-card-title">
            <CIcon icon={cilListRich} />
            {Language.transactions || 'Transactions'}
          </h5>
          <div className="bill-card-subtitle">
            {Language.transactionsHint || 'Credit and debit history for the current bill'}
          </div>
        </div>

        <div className="bill-card-header-right">
          <CButton
            color="secondary"
            variant="outline"
            onClick={fetchTransactions}
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
          <div className="bill-skeleton-row" />
          <div className="bill-skeleton-row" />
        </div>
      ) : error ? (
        <div className="bill-info bill-info-danger">
          <CIcon icon={cilWarning} />
          <div style={{ flex: 1 }}>{error}</div>
          <CButton size="sm" color="danger" onClick={fetchTransactions}>
            {Language.Retry || 'Retry'}
          </CButton>
        </div>
      ) : isEmpty ? (
        <div className="bill-empty">
          <CIcon icon={cilListRich} size="xl" />
          <div className="bill-empty-title">{Language.noTransactions || 'No transactions yet'}</div>
          <div className="bill-empty-body">
            {Language.noTransactionsHint || 'Credits and debits on your bill will appear here.'}
          </div>
        </div>
      ) : (
        <>
          {/* ---------- Summary ---------- */}
          <div className="bill-tx-summary">
            <div className="bill-tx-cell">
              <div className="bill-tx-label">{Language.credits || 'Credits'}</div>
              <div className="bill-tx-value is-credit">
                {fmtTND(totals.credits)}
                <span className="unit">TND</span>
              </div>
            </div>
            <div className="bill-tx-cell">
              <div className="bill-tx-label">{Language.debits || 'Debits'}</div>
              <div className="bill-tx-value is-debit">
                {fmtTND(totals.debits)}
                <span className="unit">TND</span>
              </div>
            </div>
            <div className="bill-tx-cell">
              <div className="bill-tx-label">{Language.net || 'Net'}</div>
              <div className={`bill-tx-value ${net >= 0 ? 'is-credit' : 'is-debit'}`}>
                {fmtTND(net)}
                <span className="unit">TND</span>
              </div>
            </div>
          </div>

          {/* ---------- List ---------- */}
          <div className="bill-tx-list">
            {transactions.map((tx, i) => {
              const isCredit = tx.amount > 0
              return (
                <div className="bill-tx-row" key={`${tx.date}-${i}`}>
                  <div className={`bill-tx-icon ${isCredit ? 'is-credit' : 'is-debit'}`}>
                    <CIcon icon={isCredit ? cilArrowTop : cilArrowBottom} />
                  </div>
                  <div className="bill-tx-main">
                    <div className="bill-tx-title">{tx.description}</div>
                    <div className="bill-tx-meta">{fmtDate(tx.date)}</div>
                  </div>
                  <div className={`bill-tx-amount ${isCredit ? 'is-credit' : 'is-debit'}`}>
                    {isCredit ? '+' : '−'}
                    {fmtTND(Math.abs(tx.amount))} TND
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

export default TransactionsCards
