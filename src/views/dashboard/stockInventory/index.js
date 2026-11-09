import React, { useState, useCallback } from 'react'
import { CToaster, CToast, CToastHeader, CToastBody, CSpinner } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilHome, cilList, cilRestaurant, cilInfo } from '@coreui/icons'
import RecipesTab from './RecipesTab'
import RawMaterialsTab from './RawMaterialsTab'
import InventoryTab from './InventoryTab'
import { BaseUrl } from '../../../helpers/BaseUrl'
import { GetToken } from '../../../helpers/GetToken'
import { useSelector } from 'react-redux'
import translations from '../../../app/Language'
import axios from 'axios'
import './StockInventory.css'

const StockInventory = () => {
  const t = useSelector((state) => state.language)
  const Language = translations[t]
  const [activeTab, setActiveTab] = useState('inventory')
  const [loading, setLoading] = useState(false)
  const [toasts, setToasts] = useState([])
  const token = GetToken()

  // Live tab counts, reported by each child tab
  const [counts, setCounts] = useState({
    'raw-materials': null,
    inventory: null,
    recipes: null,
  })
  // Stable — setState functional form means no deps are needed
  const reportCount = useCallback((key, n) => {
    setCounts((prev) => (prev[key] === n ? prev : { ...prev, [key]: n }))
  }, [])

  // Stable — token is a plain string
  const showAlert = useCallback((msg, color = 'success') => {
    const id = Date.now() + Math.random()
    setToasts((prev) => [...prev, { id, msg, color }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((x) => x.id !== id))
    }, 5000)
  }, [])

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
  const removeToast = (id) => {
    setToasts((prev) => prev.filter((x) => x.id !== id))
  }

  const tabs = [
    { key: 'inventory', title: Language.ivStockLevels || 'Stock levels', icon: cilList },
    { key: 'raw-materials', title: Language.rawMaterials || 'Raw Materials', icon: cilHome },
    { key: 'recipes', title: Language.recipes || 'Recipes', icon: cilRestaurant },
  ]

  return (
    <>
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
              {color === 'danger' ? 'Error' : 'Notification'}
            </CToastHeader>
            <CToastBody>{msg}</CToastBody>
          </CToast>
        ))}
      </CToaster>

      <div className="oc-stack">
        <div className="oc-toolbar">
          <div
            className="oc-seg si-switch"
            role="tablist"
            aria-label={Language.stockInventory || 'Stock'}
          >
            {tabs.map(({ key, title, icon }) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={activeTab === key}
                className={activeTab === key ? 'is-active' : ''}
                onClick={() => setActiveTab(key)}
              >
                <CIcon icon={icon} width={15} />
                {title}
                {counts[key] != null && <span className="oc-seg-count">{counts[key]}</span>}
              </button>
            ))}
          </div>
          {loading && <CSpinner color="primary" size="sm" />}
        </div>

        {activeTab === 'raw-materials' && (
          <div className="oc-panel si-tab-panel">
            <RawMaterialsTab
              activeTab={activeTab}
              apiCall={apiCall}
              showAlert={showAlert}
              reportCount={reportRawCount}
            />
          </div>
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
          <div className="oc-panel si-tab-panel">
            <RecipesTab
              activeTab={activeTab}
              apiCall={apiCall}
              showAlert={showAlert}
              reportCount={reportRecipeCount}
            />
          </div>
        )}
      </div>
    </>
  )
}

export default StockInventory
