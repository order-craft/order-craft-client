import React from 'react'
import { useNavigate } from 'react-router-dom'
import CIcon from '@coreui/icons-react'
import {
  cilChartLine,
  cilFastfood,
  cilListRich,
  cilPeople,
  cilWallet,
  cilHouse,
} from '@coreui/icons'
import { useSelector } from 'react-redux'
import translations from '../../app/Language'
import './CSS/Dashboard.css'

const Dashboard = () => {
  const navigate = useNavigate()
  const t = useSelector((state) => state.language)
  const Language = translations[t]

  const sections = [
    {
      title: Language.salesStatistic || 'Sales & revenue',
      subtitle: Language.salesStatisticHint || 'Revenue, payments and profit',
      color: '#0d6efd',
      tint: '#e7f1ff',
      icon: cilChartLine,
      path: '/sales',
    },
    {
      title: Language.productPerformance || 'Product performance',
      subtitle: Language.productPerformanceHint || 'Rankings, ratings and margins',
      color: '#6f42c1',
      tint: '#f3e8ff',
      icon: cilFastfood,
      path: '/product-performance',
    },
    {
      title: Language.orderManagement || 'Order management',
      subtitle: Language.orderManagementHint || 'Live orders and processing efficiency',
      color: '#d63384',
      tint: '#fce7f3',
      icon: cilListRich,
      path: '/order-management',
    },
    {
      title: Language.EmployeePerformance || 'Employee performance',
      subtitle: Language.EmployeePerformanceHint || 'Waiters, shifts and rankings',
      color: '#0891b2',
      tint: '#cffafe',
      icon: cilPeople,
      path: '/employee-performance',
    },
    {
      title: Language.bills || 'Bill',
      subtitle: Language.billsHint || 'Invoices and payments history',
      color: '#198754',
      tint: '#dcfce7',
      icon: cilWallet,
      path: '/bill',
    },
    {
      title: Language.stockInventory || 'Stock & inventory',
      subtitle: Language.stockInventoryHint || 'Raw materials, stock and recipes',
      color: '#6c757d',
      tint: '#f1f3f5',
      icon: cilHouse,
      path: '/stock-inventory',
    },
  ]

  return (
    <div className="db-page">
      <div className="db-page-header">
        <h1 className="db-page-title">{Language.dashboard || 'Dashboard'}</h1>
        <p className="db-page-subtitle">
          {Language.dashboardHint || 'Choose a section to explore your business.'}
        </p>
      </div>

      <div className="db-grid">
        {sections.map((section) => {
          const Icon = section.icon
          return (
            <button
              type="button"
              key={section.path}
              className="db-card"
              onClick={() => navigate(section.path)}
            >
              <div
                className="db-card-icon"
                style={{
                  background: section.tint,
                  color: section.color,
                }}
              >
                <CIcon icon={Icon} size="xl" />
              </div>
              <div className="db-card-text">
                <div className="db-card-title">{section.title}</div>
                <div className="db-card-subtitle">{section.subtitle}</div>
              </div>
              <div className="db-card-accent" style={{ background: section.color }} />
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default Dashboard
