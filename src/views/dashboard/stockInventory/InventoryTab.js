import React, { useState, useEffect, useCallback } from 'react'
import {
  CTabPane,
  CCardBody,
  CRow,
  CCol,
  CCard,
  CCardHeader,
  CFormSelect,
  CFormInput,
  CButton,
  CListGroup,
  CListGroupItem,
  CBadge,
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CSpinner,
  CProgress,
  CTooltip,
  CInputGroup,
  CInputGroupText,
} from '@coreui/react'
import { fetchRawMaterials } from '../../../helpers/services'
import { GetToken } from '../../../helpers/GetToken'
import { useSelector } from 'react-redux'
import translations from '../../../app/Language'
import CIcon from '@coreui/icons-react'
import { cilPlus, cilTrash, cilPencil, cilWarning, cilCheckCircle, cilHome } from '@coreui/icons'

const InventoryTab = ({ activeTab, apiCall, showAlert }) => {
  const t = useSelector((state) => state.language)
  const Language = translations[t]
  const [inventory, setInventory] = useState([])
  const [lowStock, setLowStock] = useState([])
  const [rawMaterials, setRawMaterials] = useState([])
  const [invForm, setInvForm] = useState({ rawMaterialId: '', quantity: '' })
  const [showEditModal, setShowEditModal] = useState(false)
  const [editForm, setEditForm] = useState({ id: null, quantity: '' })
  const [loading, setLoading] = useState(false)
  const token = GetToken()

  const loadInventory = async () => {
    try {
      setLoading(true)
      const data = await apiCall('/inventory')
      setInventory(data)

      const low = data.filter((item) => item.currentQuantity <= item.rawMaterial.reorderLevel)
      setLowStock(
        low.map((item) => ({
          ...item,
          deficit: item.rawMaterial.reorderLevel - item.currentQuantity,
          percentage: Math.min(100, (item.currentQuantity / item.rawMaterial.reorderLevel) * 100),
        })),
      )
    } catch (err) {
      console.error(err)
      showAlert(Language.inventoryLoadError || 'Failed to load inventory', 'danger')
    } finally {
      setLoading(false)
    }
  }

  const loadRawMaterials = useCallback(async () => {
    try {
      const data = await fetchRawMaterials(apiCall)
      setRawMaterials(data)
    } catch (err) {
      console.error(err)
      showAlert(Language.materialsLoadError || 'Failed to load materials', 'danger')
    }
  }, [apiCall])

  const receiveInventory = async () => {
    const { rawMaterialId, quantity } = invForm
    if (!rawMaterialId || !quantity) {
      showAlert(Language.fillAllFields || 'Select material and enter quantity', 'danger')
      return
    }
    try {
      await apiCall('/inventory/receive', 'POST', {
        rawMaterialId,
        quantity: parseFloat(quantity),
      })
      showAlert(Language.stockAdded || 'Stock added successfully')
      setInvForm({ rawMaterialId: '', quantity: '' })
      loadInventory()
    } catch (err) {
      console.error(err)
      showAlert(Language.stockAddError || 'Error receiving inventory', 'danger')
    }
  }

  const deleteInventory = async (id) => {
    if (!window.confirm(Language.confirmDelete || 'Are you sure you want to delete this record?'))
      return
    try {
      await apiCall(`/inventory/${id}`, 'DELETE')
      showAlert(Language.recordDeleted || 'Record deleted')
      loadInventory()
    } catch (err) {
      console.error(err)
      showAlert(Language.deleteError || 'Error deleting record', 'danger')
    }
  }

  const openEditModal = (item) => {
    setEditForm({ id: item._id, quantity: item.currentQuantity.toString() })
    setShowEditModal(true)
  }
  const submitEdit = async () => {
    const { id, quantity } = editForm
    if (!quantity) {
      showAlert('Enter quantity', 'danger')
      return
    }
    try {
      await apiCall(
        `/inventory/${id}`,
        'PUT',
        { currentQuantity: parseFloat(quantity) },
        { Authorization: `Bearer ${token}` },
      )
      showAlert('Inventory updated')
      setShowEditModal(false)
      loadInventory()
    } catch (err) {
      console.error(err)
      showAlert('Error updating inventory', 'danger')
    }
  }

  useEffect(() => {
    if (activeTab === 'inventory') {
      loadInventory()
      loadRawMaterials()
    }
  }, [activeTab])

  const getStockStatus = (item) => {
    const percentage = (item.currentQuantity / item.rawMaterial.reorderLevel) * 100
    if (percentage <= 30) return 'danger'
    if (percentage <= 60) return 'warning'
    return 'success'
  }

  return (
    <CTabPane visible={activeTab === 'inventory'}>
      <CCardBody>
        <CRow className="mb-4">
          <CCol md={6}>
            <CCard className="text-black bg-gradient-primary">
              <CCardBody className="pb-0 d-flex justify-content-between align-items-start">
                <div>
                  <h4>{inventory.length}</h4>
                  <p className="mb-0">{Language.totalItems || 'Total Items'}</p>
                </div>
                <CIcon icon={cilCheckCircle} height={40} />
              </CCardBody>
            </CCard>
          </CCol>
          <CCol md={6}>
            <CCard
              className={`text-black ${lowStock.length > 0 ? 'bg-gradient-danger' : 'bg-gradient-success'}`}
            >
              <CCardBody className="pb-0 d-flex justify-content-between align-items-start">
                <div>
                  <h4>{lowStock.length}</h4>
                  <p className="mb-0">{Language.lowStockItems}</p>
                </div>
                <CIcon icon={lowStock.length > 0 ? cilWarning : cilCheckCircle} height={40} />
              </CCardBody>
            </CCard>
          </CCol>
        </CRow>

        <CCard className="mb-4">
          <CCardHeader>
            <h5 className="mb-0">
              <CIcon icon={cilPlus} className="me-2" />
              {Language.receiveInventory}
            </h5>
          </CCardHeader>
          <CCardBody>
            <CRow className="g-3 align-items-end">
              <CCol md={5}>
                <CInputGroup>
                  <CInputGroupText>
                    <CIcon icon={cilHome} />
                  </CInputGroupText>
                  <CFormSelect
                    value={invForm.rawMaterialId}
                    onChange={(e) => setInvForm({ ...invForm, rawMaterialId: e.target.value })}
                  >
                    <option value="">{Language.selectMaterial}</option>
                    {rawMaterials.map((mat) => (
                      <option key={mat._id} value={mat._id}>
                        {mat.name} ({mat.unit})
                      </option>
                    ))}
                  </CFormSelect>
                </CInputGroup>
              </CCol>
              <CCol md={4}>
                <CInputGroup>
                  <CInputGroupText>{Language.quantity}</CInputGroupText>
                  <CFormInput
                    type="number"
                    step="0.01"
                    min="0"
                    value={invForm.quantity}
                    onChange={(e) => setInvForm({ ...invForm, quantity: e.target.value })}
                  />
                </CInputGroup>
              </CCol>
              <CCol md={3}>
                <CButton color="success" onClick={receiveInventory} disabled={loading}>
                  {loading ? <CSpinner size="sm" /> : Language.addStock}
                </CButton>
              </CCol>
            </CRow>
          </CCardBody>
        </CCard>

        <CRow>
          <CCol lg={6}>
            <CCard className="mb-4">
              <CCardHeader>
                <h5 className="mb-0">{Language.currentInventory}</h5>
              </CCardHeader>
              <CListGroup flush>
                {inventory.map((item) => (
                  <CListGroupItem
                    key={item._id}
                    className="d-flex justify-content-between align-items-center"
                  >
                    <div className="w-100">
                      <div className="d-flex justify-content-between mb-2">
                        <strong>{item.rawMaterial?.name}</strong>
                        <span>
                          {item.currentQuantity} {item.rawMaterial?.unit}
                        </span>
                      </div>
                      <CProgress
                        thin
                        color={getStockStatus(item)}
                        value={(item.currentQuantity / item.rawMaterial.reorderLevel) * 100}
                        className="mb-2"
                      />
                      <div className="d-flex justify-content-between small text-muted">
                        <span>
                          {Language.reorderLevel}: {item.rawMaterial?.reorderLevel}{' '}
                          {item.rawMaterial?.unit}
                        </span>
                        <span>
                          {Language.cost}: {item.rawMaterial?.costPerUnit} TND/
                          {item.rawMaterial?.unit}
                        </span>
                      </div>
                    </div>
                    <div className="d-flex ms-3">
                      <CTooltip content={Language.edit}>
                        <CButton
                          color="warning"
                          variant="outline"
                          size="sm"
                          className="me-2"
                          onClick={() => openEditModal(item)}
                        >
                          <CIcon icon={cilPencil} />
                        </CButton>
                      </CTooltip>
                      <CTooltip content={Language.delete}>
                        <CButton
                          color="danger"
                          variant="outline"
                          size="sm"
                          onClick={() => deleteInventory(item._id)}
                        >
                          <CIcon icon={cilTrash} />
                        </CButton>
                      </CTooltip>
                    </div>
                  </CListGroupItem>
                ))}
              </CListGroup>
            </CCard>
          </CCol>

          <CCol lg={6}>
            <CCard>
              <CCardHeader
                className={`bg-${lowStock.length > 0 ? 'danger' : 'success'} text-white`}
              >
                <h5 className="mb-0">{Language.lowStockAlerts}</h5>
              </CCardHeader>
              <CListGroup flush>
                {lowStock.length === 0 ? (
                  <CListGroupItem className="text-center py-4">
                    <CIcon icon={cilCheckCircle} className="text-success me-2" size="xl" />
                    <h5 className="text-success mb-0">{Language.allItemsWellStocked}</h5>
                  </CListGroupItem>
                ) : (
                  lowStock.map((item) => (
                    <CListGroupItem key={item._id} className="border-start border-danger border-4">
                      <div className="d-flex justify-content-between align-items-center">
                        <div>
                          <strong>
                            <CIcon icon={cilWarning} className="text-danger me-2" />
                            {item.rawMaterial.name}
                          </strong>
                          <div className="mt-1">
                            <CBadge color="danger" className="me-2">
                              {Language.current}: {item.currentQuantity} {item.rawMaterial.unit}
                            </CBadge>
                            <CBadge color="danger">
                              {Language.deficit}: {item.deficit} {item.rawMaterial.unit}
                            </CBadge>
                          </div>
                        </div>
                        <CProgress
                          thin
                          color="danger"
                          value={item.percentage}
                          style={{ width: '100px' }}
                        />
                      </div>
                    </CListGroupItem>
                  ))
                )}
              </CListGroup>
            </CCard>
          </CCol>
        </CRow>
      </CCardBody>

      <CModal visible={showEditModal} onClose={() => setShowEditModal(false)}>
        <CModalHeader closeButton>
          <CModalTitle>{Language.editInventory}</CModalTitle>
        </CModalHeader>
        <CModalBody>
          <CInputGroup className="mb-3">
            <CInputGroupText>{Language.quantity}</CInputGroupText>
            <CFormInput
              type="number"
              step="0.01"
              min="0"
              value={editForm.quantity}
              onChange={(e) => setEditForm({ ...editForm, quantity: e.target.value })}
            />
          </CInputGroup>
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={() => setShowEditModal(false)}>
            {Language.cancel}
          </CButton>
          <CButton
            color="primary"
            onClick={async () => {
              await submitEdit()
              setShowEditModal(false)
            }}
          >
            {Language.save}
          </CButton>
        </CModalFooter>
      </CModal>
    </CTabPane>
  )
}

export default InventoryTab
