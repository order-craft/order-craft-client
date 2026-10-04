// src/context/AuthContext.js
import React, { createContext, useContext, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { jwtDecode } from 'jwt-decode'

const AuthContext = createContext()

export const AuthProvider = ({ children }) => {
  const token = localStorage.getItem('token')
  const isAuthenticated = token ? true : false
  const navigate = useNavigate()

  const login = (token) => {
    localStorage.setItem('token', token)
    navigate('/admin') // Redirect to admin page
  }

  const logout = () => {
    localStorage.removeItem('token')
    navigate('/login') // Redirect to login page
    window.location.reload()
  }

  const checkTokenExpiration = () => {
    if (token) {
      const decodedToken = jwtDecode(token)
      const currentTime = Date.now() / 1000

      if (decodedToken.exp < currentTime) {
        logout()
      }
    }
  }

  useEffect(() => {
    checkTokenExpiration()
  }, [])

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
