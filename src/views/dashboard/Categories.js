import React from 'react'
import { useNavigate } from 'react-router-dom'
import './CSS/Dashboard.css' // Import the CSS file for styling
import salesImage from '../../assets/images/categories/sales-.png'
import products from '../../assets/images/categories/products-.png'
import OrderManagement from '../../assets/images/categories/OrderManagement-.png'
// import CustomerInsights from '../../assets/images/categories/CustomerInsights-.png'
import EmployeePerformance from '../../assets/images/categories/Employee-Performance.png'
import StockInventory from '../../assets/images/categories/StockInventory.png'


// import RevenueAnalysis from '../../assets/images/categories/RevenueAnalysis-.png'
// import InventoryOverview from '../../assets/images/categories/InventoryOverview-.png'
import Bill from '../../assets/images/categories/bill.png'
import { useSelector } from 'react-redux'
import translations from '../../app/Language'

const Dashboard = () => {
  const navigate = useNavigate()
  const t = useSelector((state) => state.language)
  const Language = translations[t]
  const categories = [
    {
      name: Language.salesStatistic,
      color: '#4A7CA2',
      path: '/sales',
      image: salesImage, // Replace with your image path
    },
    {
      name: Language.productPerformance,
      color: '#8A77A3',
      path: '/product-performance',
      image: products, // Replace with your image path
    },
    {
      name: Language.orderManagement,
      color: '#D88299',
      path: '/order-management',
      image: OrderManagement, // Replace with your image path
    },
    // {
    //   name: Language.CustomerInsights,
    //   color: '#3BBFA5',
    //   path: '/customer-insights',
    //   image: CustomerInsights, // Replace with your image path
    // },
    {
      name: Language.EmployeePerformance,
      color: '#3AAFB5',
      path: '/employee-performance',
      image: EmployeePerformance, // Replace with your image path
    },
    // {
    //   name: Language.revenueAnalysis,
    //   color: '#F08866',
    //   path: '/revenue-analysis',
    //   image: RevenueAnalysis, // Replace with your image path
    // },
    // {
    //   name: Language.inventoryOverview,
    //   color: '#336D86',
    //   path: '/inventory-overview',
    //   image: InventoryOverview, // Replace with your image path
    // },
    {
      name: Language.bills,
      color: '#336D56',
      path: '/bill',
      image: Bill, // Replace with your image path
    },
    {
      name: Language.stockInventory,
      color: '#696d33',
      path: '/stock-inventory',
      image: StockInventory, // Replace with your image path
    },
  ]

  return (
    <div className="dashboard-grid">
      {categories.map((category, index) => (
        <div
          key={index}
          className="dashboard-item"
          style={{ backgroundColor: category.color }}
          onClick={() => navigate(category.path)}
        >
          <div className="dashboard-item-content">
            <img
              src={category.image}
              alt={`${category.name} icon`}
              className="dashboard-item-image"
            />
            <h3>{category.name}</h3>
          </div>
        </div>
      ))}
    </div>
  )
}

export default Dashboard
