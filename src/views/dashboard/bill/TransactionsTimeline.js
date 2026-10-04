import React, { useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import {
  CSpinner,
  CCard,
  CCardBody,
  CCardHeader,
  CContainer,
  CRow,
  CCol,
  CAlert,
  CBadge,
} from '@coreui/react'
import axios from 'axios'
import { BaseUrl } from '../../../helpers/BaseUrl'
import { GetToken } from '../../../helpers/GetToken'
import { format } from 'date-fns'

const TransactionsCards = () => {
  const token = GetToken()
  const [loading, setLoading] = useState(false)
  const [transactions, setTransactions] = useState([])
  const [error, setError] = useState(null)

  const fetchTransactions = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await axios.get(`${BaseUrl}/bills/current`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      const { transactions } = response.data
      setTransactions(transactions)
    } catch (err) {
      setError('Error fetching transactions. Please try again later.')
      console.error(err)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchTransactions()
  }, [])

  return (
    <CContainer>
      {loading ? (
        <CSpinner color="primary" style={{ width: '3rem', height: '3rem' }} />
      ) : error ? (
        <CAlert color="danger">{error}</CAlert>
      ) : transactions.length > 0 ? (
        <CRow className="gy-4">
          {transactions.map((transaction, index) => (
            <CCol xs={12} md={6} lg={4} key={index}>
              <CCard
                className={`shadow-sm border-0 ${
                  transaction.amount > 0 ? 'bg-success text-white' : 'bg-danger text-white'
                }`}
              >
                <CCardHeader className="d-flex justify-content-between align-items-center">
                  <h6 className="mb-0">
                    {transaction.description || 'Transaction'}
                  </h6>
                  <CBadge
                    color={transaction.amount > 0 ? 'light' : 'dark'}
                    textColor={transaction.amount > 0 ? 'dark' : 'light'}
                  >
                    {transaction.amount > 0 ? 'Credit' : 'Debit'}
                  </CBadge>
                </CCardHeader>
                <CCardBody>
                  <p className="fs-6 mb-1">
                    <strong>Date:</strong>{' '}
                    {format(new Date(transaction.date), 'PPPpp')}
                  </p>
                  <p className="fs-6 mb-0">
                    <strong>Amount:</strong>{' '}
                    <CBadge
                      color="light"
                      className="fs-6"
                      textColor={transaction.amount > 0 ? 'success' : 'danger'}
                    >
                      {transaction.amount.toFixed(2)} TND
                    </CBadge>
                  </p>
                </CCardBody>
              </CCard>
            </CCol>
          ))}
        </CRow>
      ) : (
        <CAlert color="info">No transactions found for this bill.</CAlert>
      )}
    </CContainer>
  )
}

export default TransactionsCards
