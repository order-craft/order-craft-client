import { useState, useCallback } from 'react'
import { CContainer, CCard, CCardBody, CSpinner } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilHome, cilList, cilRestaurant } from '@coreui/icons'
import RecipesTab from './RecipesTab'
import RawMaterialsTab from './RawMaterialsTab'
import InventoryTab from './InventoryTab'
import { BaseUrl } from '../../../helpers/BaseUrl'
import { GetToken } from '../../../helpers/GetToken'
import { useSelector } from 'react-redux'
import translations from '../../../app/Language'
import axios from 'axios'
import './StockInventory.css'
import { useToast } from '../../../components/toast/ToastProvider'
const StockInventory = () => {
  const t = useSelector((state) => state.language)
  const Language = translations[t]
  const [activeTab, setActiveTab] = useState('raw-materials')
  const [loading, setLoading] = useState(false)
  const token = GetToken()

  // Live tab counts, reported by each child tab
  const [counts, setCounts] = useState({
    'raw-materials': null,
    inventory: null,
    recipes: null,
  })
  const reportCount = useCallback((key, n) => {
    setCounts((prev) => (prev[key] === n ? prev : { ...prev, [key]: n }))
  }, [])

  // Shared toast provider
  const { showToast } = useToast()
  const showAlert = useCallback(
    (msg, color = 'success') => {
      showToast(msg, color)
    },
    [showToast],
  )

  // Stable — depends only on token and showAlert, both stable
  const apiCall = useCallback(
    async (endpoint, method = 'GET', data = null, headers = {}) => {
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
    },
    [token, showAlert],
  )
  const reportRawCount = useCallback((n) => reportCount('raw-materials', n), [reportCount])
  const reportInventoryCount = useCallback((n) => reportCount('inventory', n), [reportCount])
  const reportRecipeCount = useCallback((n) => reportCount('recipes', n), [reportCount])

  const tabs = [
    { key: 'raw-materials', title: Language.rawMaterials || 'Raw Materials', icon: cilHome },
    { key: 'inventory', title: Language.inventory || 'Inventory', icon: cilList },
    { key: 'recipes', title: Language.recipes || 'Recipes', icon: cilRestaurant },
  ]

  return (
    <CContainer fluid className="py-4">
      <CCard className="mb-4">
        <div className="si-header">
          <div className="si-header-top">
            <div>
              <h5 className="si-title">
                <CIcon icon={cilHome} />
                {Language.stockInventory || 'Stock Inventory'}
              </h5>
              <div className="si-subtitle">
                Manage your raw materials, track stock, and build recipes.
              </div>
            </div>
          </div>

          <div className="si-tabs" role="tablist">
            {tabs.map(({ key, title, icon }) => (
              <button
                key={key}
                type="button"
                role="tab"
                className={`si-tab ${activeTab === key ? 'is-active' : ''}`}
                onClick={() => setActiveTab(key)}
              >
                <CIcon icon={icon} />
                {title}
                {counts[key] != null && <span className="si-tab-count">{counts[key]}</span>}
              </button>
            ))}
          </div>
        </div>

        <CCardBody>
          {loading && (
            <div className="text-center p-4">
              <CSpinner color="primary" size="sm" />
            </div>
          )}

          {activeTab === 'raw-materials' && (
            <RawMaterialsTab
              activeTab={activeTab}
              apiCall={apiCall}
              showAlert={showAlert}
              reportCount={reportRawCount}
            />
          )}
          {activeTab === 'inventory' && (
            <InventoryTab
              activeTab={activeTab}
              apiCall={apiCall}
              showAlert={showAlert}
              reportCount={reportInventoryCount}
            />
          )}
          {activeTab === 'recipes' && (
            <RecipesTab
              activeTab={activeTab}
              apiCall={apiCall}
              showAlert={showAlert}
              reportCount={reportRecipeCount}
            />
          )}
        </CCardBody>
      </CCard>
    </CContainer>
  )
}

export default StockInventory
