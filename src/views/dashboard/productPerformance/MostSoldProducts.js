import {
  CCard,
  CCardBody,
  CCardFooter,
  CCardHeader,
  CCol,
  CProgress,
  CRow,
  CSpinner,
  CBadge,
} from '@coreui/react'
import axios from 'axios'
import { BaseUrl } from '../../../helpers/BaseUrl'
import { GetToken } from '../../../helpers/GetToken'
import { useEffect, useState, React } from 'react'
import { useSelector } from 'react-redux'
import translations from '../../../app/Language'
import CIcon from '@coreui/icons-react'
import { cilStar } from '@coreui/icons'

const MostSoldProducts = () => {
  const [loading, setLoading] = useState(false)
  const [mostSold, setMostSold] = useState([])
  const token = GetToken()

  // language
  const t = useSelector((state) => state.language)
  const Language = translations[t]

  const getMostSoldProducts = async () => {
    setLoading(true)
    try {
      const response = await axios.get(`${BaseUrl}/dashboard/most-sold-products`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setMostSold(response.data)
    } catch (err) {
      console.error('Error fetching most sold products:', err)
    }
    setLoading(false)
  }

  useEffect(() => {
    getMostSoldProducts()
  }, [])

  // Color variants for different ranks
  const getRankColor = (index) => {
    if (index === 0) return 'danger' // Gold for 1st place
    if (index === 1) return 'warning' // Silver for 2nd place
    if (index === 2) return 'info' // Bronze for 3rd place
    return 'primary' // Default for others
  }

  // Progress bar color based on sales percentage
  const getProgressColor = (percentage) => {
    if (percentage > 75) return 'success'
    if (percentage > 50) return 'info'
    if (percentage > 25) return 'warning'
    return 'danger'
  }

  if (loading) {
    return (
      <div className="text-center py-5">
        <CSpinner color="primary" />
        <p className="mt-2">{Language.loading}...</p>
      </div>
    )
  }

  return (
    <CCard className="dashboard-card">
      <CCardHeader className="dashboard-card-header">
        <div className="d-flex justify-content-between align-items-center">
          <h3 className="dashboard-title">
            <CIcon icon={cilStar} className="me-2" />
            {Language.mostSoldProducts}
          </h3>
          <CBadge color="primary">
            {mostSold.length} {Language.products}
          </CBadge>
        </div>
      </CCardHeader>
      <CCardBody>
        <CRow className="mb-3">
          {mostSold?.slice(0, 3).map((product, index) => (
            <CCol md={4} key={product._id} className="mb-3">
              <div className="top-product-card text-center p-3">
                <CBadge
                  color={getRankColor(index)}
                  shape="rounded-pill"
                  className="mb-2"
                  style={{
                    width: '30px',
                    height: '30px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1rem',
                  }}
                >
                  {index + 1}
                </CBadge>
                <h5 className="product-name mb-1">{product.productName}</h5>
                <div className="sales-count fw-bold">
                  {product.totalSold} {Language.sold}
                </div>
                <CProgress
                  className="mt-3"
                  color={getProgressColor((product.totalSold / mostSold[0]?.totalSold) * 100)}
                  value={(product.totalSold / mostSold[0]?.totalSold) * 100}
                  height={10}
                />
              </div>
            </CCol>
          ))}
        </CRow>
      </CCardBody>
      <CCardFooter className="bg-transparent">
        <h6 className="mb-3 text-center">{Language.otherTopProducts}</h6>
        <CRow
          xs={{ cols: 1, gutter: 3 }}
          sm={{ cols: 2 }}
          lg={{ cols: 3 }}
          xl={{ cols: 4 }}
          className="mb-2"
        >
          {mostSold?.slice(3).map((product, index) => (
            <CCol key={product._id}>
              <div className="product-item p-2">
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <span className="text-truncate" style={{ maxWidth: '150px' }}>
                    {product.productName}
                  </span>
                  <span className="fw-semibold">{product.totalSold}</span>
                </div>
                <CProgress
                  thin
                  color={getProgressColor((product.totalSold / mostSold[0]?.totalSold) * 100)}
                  value={(product.totalSold / mostSold[0]?.totalSold) * 100}
                  height={6}
                />
              </div>
            </CCol>
          ))}
        </CRow>
      </CCardFooter>

      <style>{`
        .dashboard-card {
          border-radius: 15px;
          box-shadow: 0 0.15rem 1.75rem 0 rgba(58, 59, 69, 0.15);
          border: none;
          overflow: hidden;
          margin-bottom:20px;
        }
        .dashboard-card-header {
          background: linear-gradient(135deg, #4e73df 0%, #224abe 100%);
          color: white;
          border-bottom: none;
          padding: 1.5rem;
        }
        .dashboard-title {
          margin: 0;
          font-weight: 600;
          color: white;
        }
        .top-product-card {
          background: white;
          border-radius: 10px;
          box-shadow: 0 0.125rem 0.25rem rgba(0, 0, 0, 0.075);
          border: 1px solid #e3e6f0;
          height: 100%;
          transition: transform 0.2s;
        }
        .top-product-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.1);
        }
        .product-name {
          color: #4e73df;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .sales-count {
          color: #2e59d9;
          font-size: 1.2rem;
        }
        .product-item {
          background: white;
          border-radius: 8px;
          box-shadow: 0 0.125rem 0.25rem rgba(0, 0, 0, 0.05);
          border: 1px solid #e3e6f0;
          transition: all 0.2s;
        }
        .product-item:hover {
          background-color: #f8f9fa;
        }
      `}</style>
    </CCard>
  )
}

export default MostSoldProducts
