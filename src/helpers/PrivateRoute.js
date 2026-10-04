// src/components/PrivateRoute.js
import React from 'react'
import PropTypes from 'prop-types'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const PrivateRoute = ({ element: Component, ...rest }) => {
  const { isAuthenticated } = useAuth()

  return isAuthenticated ? <Component {...rest} /> : <Navigate to="/login" replace />
}

PrivateRoute.propTypes = {
  element: PropTypes.elementType.isRequired, // car tu attends un composant React (ex: Dashboard)
}

export default PrivateRoute
