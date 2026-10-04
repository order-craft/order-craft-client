import React, { useState } from 'react'
import {
  CContainer,
  CNav,
  CNavItem,
  CNavLink,
  CTabContent,
  CSpinner,
  CToaster,
  CToast,
  CToastHeader,
  CToastBody,
  CBadge,
  CRow,
  CCol,
  CCard,
  CCardBody,
} from '@coreui/react'
import RecipesTab from './RecipesTab'
import RawMaterialsTab from './RawMaterialsTab'
import InventoryTab from './InventoryTab'
import { BaseUrl } from '../../../helpers/BaseUrl'
import { GetToken } from '../../../helpers/GetToken'
import { useSelector } from 'react-redux'
import translations from '../../../app/Language'
import CIcon from '@coreui/icons-react'
import { cilHome, cilList, cilRestaurant, cilInfo } from '@coreui/icons'
import axios from 'axios'

const StockInventory = () => {
  const t = useSelector((state) => state.language)
  const Language = translations[t]
  const [activeTab, setActiveTab] = useState('raw-materials')
  const [loading, setLoading] = useState(false)
  const [toasts, setToasts] = useState([])
  const token = GetToken()

  const apiCall = async (endpoint, method = 'GET', data = null, headers = {}) => {
    try {
      setLoading(true)
      const config = {
        method,
        url: `${BaseUrl}${endpoint}`,
        headers: { Authorization: `Bearer ${token}`, ...headers },
      }
      if (data) config.data = data
      const response = await axios(config)
      return response.data
    } catch (error) {
      showAlert(error.response?.data?.error || error.message, 'danger')
      throw error
    } finally {
      setLoading(false)
    }
  }

  const showAlert = (msg, color = 'success') => {
    const id = Date.now()
    setToasts((prev) => [...prev, { id, msg, color }])
  }

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }

  const tabData = {
    'raw-materials': {
      title: Language.rawMaterials,
      icon: cilHome,
      badgeColor: 'primary',
    },
    inventory: {
      title: Language.inventory,
      icon: cilList,
      badgeColor: 'info',
    },
    recipes: {
      title: Language.recipes,
      icon: cilRestaurant,
      badgeColor: 'success',
    },
  }

  return (
    <CContainer fluid className="py-4">
      <CToaster position="top-end">
        {toasts.map(({ id, msg, color }) => (
          <CToast
            key={id}
            autohide
            delay={5000}
            color={color}
            visible
            onClose={() => removeToast(id)}
          >
            <CToastHeader closeButton>
              <CIcon icon={cilInfo} className="me-2" />
              Notification
            </CToastHeader>
            <CToastBody>{msg}</CToastBody>
          </CToast>
        ))}
      </CToaster>

      <CCard className="mb-4">
        <CCardBody>
          <CRow className="mb-4">
            <CCol>
              <h3 className="mb-0">
                <CIcon icon={cilHome} className="me-2" />
                {Language.stockInventory}
              </h3>
            </CCol>
          </CRow>

          <CNav variant="pills" className="mb-4">
            {Object.entries(tabData).map(([key, data]) => (
              <CNavItem key={key}>
                <CNavLink
                  active={activeTab === key}
                  onClick={() => setActiveTab(key)}
                  className="d-flex align-items-center"
                >
                  <CIcon icon={data.icon} className="me-2" />
                  {data.title}
                </CNavLink>
              </CNavItem>
            ))}
          </CNav>

          {loading && (
            <div className="text-center p-5">
              <CSpinner color="primary" size="sm" />
              <p className="mt-3">{Language.loading}</p>
            </div>
          )}

          <CTabContent>
            <RawMaterialsTab activeTab={activeTab} apiCall={apiCall} showAlert={showAlert} />
            <InventoryTab activeTab={activeTab} apiCall={apiCall} showAlert={showAlert} />
            <RecipesTab activeTab={activeTab} apiCall={apiCall} showAlert={showAlert} />
          </CTabContent>
        </CCardBody>
      </CCard>
    </CContainer>
  )
}

export default StockInventory
