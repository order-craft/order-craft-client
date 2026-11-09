import React, { useState } from 'react'
import { CSpinner } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilWarning } from '@coreui/icons'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { useAuth } from '../../../context/AuthContext'
import { BaseUrl } from '../../../helpers/BaseUrl'
import logo from '../../../assets/images/logo-.png'
import './Login.css'

// Illustrative tickets for the brand panel — they show what the product
// does (orders moving from table to kitchen), not anyone's real data.
const TICKETS = [
  {
    table: 'Table 4',
    time: '12:41',
    items: ['2× Cappuccino', '1× Croissant'],
    status: 'pending',
    label: 'Waiting',
  },
  {
    table: 'Table 9',
    time: '12:38',
    items: ['1× Espresso', '2× Pain au chocolat'],
    status: 'preparing',
    label: 'Preparing',
  },
  {
    table: 'To-go #18',
    time: '12:33',
    items: ['3× Iced latte'],
    status: 'completed',
    label: 'Ready',
  },
]

const Login = () => {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [revealed, setRevealed] = useState(false)

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    try {
      setLoading(true)
      const response = await axios.post(`${BaseUrl}/auth/login`, { email, password })
      const { token } = response.data
      localStorage.setItem('token', token)
      login(token)
      setLoading(false)
      navigate('/')
    } catch (err) {
      setLoading(false)
      // Report what actually happened instead of always blaming the
      // password: a 401 from the server really is wrong credentials, but a
      // network/certificate failure (err.request, no err.response) is not —
      // and was being shown as "wrong password" either way.
      if (err.response) {
        setError(err.response.data?.error || 'That email and password don’t match an account.')
      } else if (err.request) {
        setError('Can’t reach the server. Check your connection (and, on a new device, that you’ve accepted the server’s security certificate).')
      } else {
        setError('Something went wrong. Please try again.')
      }
      console.error(err)
    }
  }

  return (
    <div className="lg">
      <section className="lg-brand" aria-hidden="true">
        <div className="lg-mark">
          <img src={logo} alt="" />
          <span>Order Craft</span>
        </div>

        <div className="lg-pitch">
          <h1>Every order, from table to kitchen, in one calm view.</h1>
          <p>Live orders, tables, bills and stock for cafés and restaurants.</p>
        </div>

        <div className="lg-rail">
          {TICKETS.map((tk, i) => (
            <article key={tk.table} className={`lg-ticket lg-ticket-${i}`}>
              <header>
                <strong>{tk.table}</strong>
                <span>{tk.time}</span>
              </header>
              <ul>
                {tk.items.map((it) => (
                  <li key={it}>{it}</li>
                ))}
              </ul>
              <span className={`oc-status is-${tk.status}`}>{tk.label}</span>
            </article>
          ))}
        </div>

        <footer className="lg-foot">© {new Date().getFullYear()} Order Craft</footer>
      </section>

      <main className="lg-form-side">
        <form className="lg-form" onSubmit={handleLogin} noValidate={false}>
          <div className="lg-form-mark">
            <img src={logo} alt="" />
            <span>Order Craft</span>
          </div>

          <h2 className="lg-title">Sign in</h2>
          <p className="lg-sub">Use the email and password your restaurant was set up with.</p>

          {error && (
            <div className="lg-error" role="alert">
              <CIcon icon={cilWarning} />
              <span>{error}</span>
            </div>
          )}

          <label className="lg-label" htmlFor="login-email">
            Email
          </label>
          <input
            id="login-email"
            className="form-control lg-input"
            type="email"
            placeholder="you@restaurant.com"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <div className="lg-label-row">
            <label className="lg-label" htmlFor="login-password">
              Password
            </label>
            <button
              type="button"
              className="lg-reveal"
              onClick={() => setRevealed((v) => !v)}
              aria-controls="login-password"
            >
              {revealed ? 'Hide' : 'Show'}
            </button>
          </div>
          <input
            id="login-password"
            className="form-control lg-input"
            type={revealed ? 'text' : 'password'}
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <button type="submit" className="btn btn-primary lg-submit" disabled={loading}>
            {loading ? (
              <>
                <CSpinner size="sm" className="me-2" /> Signing in…
              </>
            ) : (
              'Sign in'
            )}
          </button>
        </form>
      </main>
    </div>
  )
}

export default Login
