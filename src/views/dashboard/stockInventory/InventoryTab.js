import React, { useState, useEffect, useCallback } from 'react'
import { CButton, CModal, CFormInput, CFormSelect, CFormFeedback, CProgress } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import {
  cilPlus,
  cilTrash,
  cilPencil,
  cilSearch,
  cilHome,
  cilCheck,
  cilX,
  cilWarning,
  cilCheckCircle,
  cilReload,
} from '@coreui/icons'
import { fetchRawMaterials } from '../../../helpers/services'
import { useSelector } from 'react-redux'
import translations from '../../../app/Language'

const InventoryTab = ({ activeTab, apiCall, showAlert, reportCount }) => {
  const t = useSelector((state) => state.language)
  const Language = translations[t]

  const [inventory, setInventory] = useState([])
  const [rawMaterials, setRawMaterials] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(false)

  // Receive modal
  const [showReceiveModal, setShowReceiveModal] = useState(false)
  const [receiveForm, setReceiveForm] = useState({
    rawMaterialId: '',
    quantity: '',
  })
  const [receiveError, setReceiveError] = useState('')

  // Edit modal
  const [showEditModal, setShowEditModal] = useState(false)
  const [editForm, setEditForm] = useState({ id: null, quantity: '' })
  const [editError, setEditError] = useState('')

  /* ---------- data ---------- */
  const loadInventory = useCallback(async () => {
    try {
      setLoading(true)
      const data = await apiCall('/inventory')
      setInventory(data)
      reportCount?.(data.length)
    } catch (err) {
      showAlert(Language.inventoryLoadError || 'Failed to load inventory', 'danger')
    } finally {
      setLoading(false)
    }
  }, [apiCall, showAlert, Language, reportCount])

  const loadRawMaterials = useCallback(async () => {
    try {
      const data = await fetchRawMaterials(apiCall)
      setRawMaterials(data)
    } catch (err) {
      showAlert(Language.materialsLoadError || 'Failed to load materials', 'danger')
    }
  }, [apiCall, showAlert, Language])

  useEffect(() => {
    if (activeTab === 'inventory') {
      loadInventory()
      loadRawMaterials()
    }
  }, [activeTab, loadInventory, loadRawMaterials])

  /* ---------- derived ---------- */
  const lowStockRaw = inventory
    .filter((item) => item.rawMaterial && item.currentQuantity <= item.rawMaterial.reorderLevel)
    .map((item) => ({
      ...item,
      deficit: item.rawMaterial.reorderLevel - item.currentQuantity,
      percentage:
        item.rawMaterial.reorderLevel > 0
          ? Math.min(100, (item.currentQuantity / item.rawMaterial.reorderLevel) * 100)
          : 0,
    }))
    .sort((a, b) => b.deficit - a.deficit) // most urgent first

  const totalStockValue = inventory.reduce((sum, item) => {
    const unitCost = item.rawMaterial?.costPerUnit || 0
    return sum + (item.currentQuantity || 0) * unitCost
  }, 0)

  const filtered = inventory.filter((item) =>
    (item.rawMaterial?.name || '').toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const getStockColor = (item) => {
    const rl = item.rawMaterial?.reorderLevel || 0
    if (rl === 0) return 'success'
    const pct = (item.currentQuantity / rl) * 100
    if (pct <= 30) return 'danger'
    if (pct <= 60) return 'warning'
    return 'success'
  }

  /* ---------- receive ---------- */
  const openReceive = (prefilledId = '') => {
    setReceiveForm({ rawMaterialId: prefilledId, quantity: '' })
    setReceiveError('')
    setShowReceiveModal(true)
  }

  const closeReceive = () => {
    setShowReceiveModal(false)
    setReceiveForm({ rawMaterialId: '', quantity: '' })
    setReceiveError('')
  }

  const submitReceive = async () => {
    const { rawMaterialId, quantity } = receiveForm
    if (!rawMaterialId) {
      setReceiveError(Language.selectMaterial || 'Please select a material')
      return
    }
    const qty = parseFloat(quantity)
    if (isNaN(qty) || qty <= 0) {
      setReceiveError(Language.quantityMustBePositive || 'Quantity must be greater than 0')
      return
    }

    try {
      await apiCall('/inventory/receive', 'POST', {
        rawMaterialId,
        quantity: qty,
      })
      showAlert(Language.stockAdded || 'Stock added successfully')
      closeReceive()
      loadInventory()
    } catch (err) {
      setReceiveError(
        err.response?.data?.error || Language.stockAddError || 'Error receiving inventory',
      )
    }
  }

  /* ---------- edit ---------- */
  const openEdit = (item) => {
    setEditForm({ id: item._id, quantity: String(item.currentQuantity) })
    setEditError('')
    setShowEditModal(true)
  }

  const closeEdit = () => {
    setShowEditModal(false)
    setEditForm({ id: null, quantity: '' })
    setEditError('')
  }

  const submitEdit = async () => {
    const qty = parseFloat(editForm.quantity)
    if (isNaN(qty) || qty < 0) {
      setEditError(Language.invalidQuantity || 'Enter a valid quantity')
      return
    }
    try {
      await apiCall(`/inventory/${editForm.id}`, 'PUT', {
        currentQuantity: qty,
      })
      showAlert(Language.inventoryUpdated || 'Inventory updated')
      closeEdit()
      loadInventory()
    } catch (err) {
      setEditError(
        err.response?.data?.error || Language.inventoryUpdateError || 'Error updating inventory',
      )
    }
  }

  /* ---------- delete ---------- */
  const handleDelete = async (id) => {
    if (!window.confirm(Language.confirmDelete || 'Are you sure you want to delete this record?'))
      return
    try {
      await apiCall(`/inventory/${id}`, 'DELETE')
      showAlert(Language.recordDeleted || 'Record deleted')
      loadInventory()
    } catch (err) {
      showAlert(Language.deleteError || 'Error deleting record', 'danger')
    }
  }

  /* ---------- render ---------- */
  if (activeTab !== 'inventory') return null

  return (
    <>
      {/* ---- Section top strip ---- */}
      <div className="si-section-top">
        <div className="si-section-top-left">
          <h5 className="si-section-title">{Language.inventory || 'Inventory'}</h5>
          <div className="si-section-meta">
            <strong>{inventory.length}</strong>{' '}
            {inventory.length === 1 ? Language.item || 'item' : Language.items || 'items'}{' '}
            {Language.tracked || 'tracked'}
            {' · '}
            <strong>{lowStockRaw.length}</strong> {Language.lowStock || 'low stock'}
          </div>
        </div>

        <div className="si-section-top-right">
          <div className="si-search">
            <CIcon icon={cilSearch} className="si-search-icon" />
            <input
              type="text"
              placeholder={Language.searchInventory || 'Search inventory...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <CButton color="primary" onClick={() => openReceive()}>
            <CIcon icon={cilPlus} className="me-2" />
            {Language.receiveInventory || 'Receive stock'}
          </CButton>
        </div>
      </div>

      {/* ---- Stat strip ---- */}
      <div className="si-stats">
        <div className="si-stat">
          <div className="si-stat-label">{Language.totalItems || 'Items tracked'}</div>
          <div className="si-stat-value">{inventory.length}</div>
        </div>
        <div className="si-stat">
          <div className="si-stat-label">{Language.lowStockItems || 'Low stock'}</div>
          <div className={`si-stat-value ${lowStockRaw.length > 0 ? 'is-danger' : 'is-success'}`}>
            {lowStockRaw.length}
          </div>
        </div>
        <div className="si-stat">
          <div className="si-stat-label">{Language.stockValue || 'Stock value'}</div>
          <div className="si-stat-value">
            {totalStockValue.toFixed(2)} <small className="si-stat-unit">TND</small>
          </div>
        </div>
      </div>

      {/* ---- Two columns ---- */}
      <div className="si-inv-layout">
        {/* Current inventory */}
        <div>
          <div className="si-inv-col-title">{Language.currentInventory || 'Current inventory'}</div>

          {inventory.length === 0 && !loading ? (
            <div className="si-empty">
              <CIcon icon={cilHome} size="xl" />
              <div className="si-empty-title">
                {Language.noInventoryYet || 'No stock tracked yet'}
              </div>
              <div className="si-empty-body">
                {Language.noInventoryHint ||
                  'Receive stock to start tracking quantities and values.'}
              </div>
              <CButton color="primary" className="si-empty-cta" onClick={() => openReceive()}>
                <CIcon icon={cilPlus} className="me-2" />
                {Language.receiveInventory || 'Receive stock'}
              </CButton>
            </div>
          ) : filtered.length === 0 ? (
            <div className="si-empty">
              <CIcon icon={cilSearch} size="xl" />
              <div className="si-empty-title">{Language.noInventoryMatch || 'No items match'}</div>
              <div className="si-empty-body">
                {Language.noInventoryMatchHint || 'Try a different search.'}
              </div>
            </div>
          ) : (
            <div className="si-list">
              {filtered.map((item) => {
                const rl = item.rawMaterial?.reorderLevel || 0
                const pct = rl > 0 ? Math.min(100, (item.currentQuantity / rl) * 100) : 100
                return (
                  <div className="si-row" key={item._id}>
                    <div>
                      <p className="si-row-title">{item.rawMaterial?.name || 'Unnamed material'}</p>
                      <div className="si-row-meta">
                        <span>
                          On hand:{' '}
                          <strong>
                            {item.currentQuantity} {item.rawMaterial?.unit || ''}
                          </strong>
                        </span>
                        <span>
                          Reorder at{' '}
                          <strong>
                            {rl} {item.rawMaterial?.unit || ''}
                          </strong>
                        </span>
                        <span>
                          Cost{' '}
                          <strong>
                            {Number(item.rawMaterial?.costPerUnit || 0).toFixed(2)} TND /{' '}
                            {item.rawMaterial?.unit || ''}
                          </strong>
                        </span>
                      </div>
                      <div className="si-inv-progress">
                        <CProgress thin color={getStockColor(item)} value={pct} height={6} />
                      </div>
                    </div>

                    <div className="si-row-actions">
                      <CButton
                        color="secondary"
                        variant="outline"
                        size="sm"
                        onClick={() => openEdit(item)}
                        aria-label={Language.edit || 'Edit'}
                      >
                        <CIcon icon={cilPencil} />
                      </CButton>
                      <CButton
                        color="danger"
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(item._id)}
                        aria-label={Language.delete || 'Delete'}
                      >
                        <CIcon icon={cilTrash} />
                      </CButton>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Low stock alerts */}
        <div>
          <div className="si-inv-col-title">{Language.lowStockAlerts || 'Low stock alerts'}</div>

          {lowStockRaw.length === 0 ? (
            <div className="si-empty si-empty-success">
              <CIcon icon={cilCheckCircle} size="xl" />
              <div className="si-empty-title">
                {Language.allItemsWellStocked || 'All items well stocked'}
              </div>
              <div className="si-empty-body">
                {Language.allItemsWellStockedHint || 'Nothing below its reorder level right now.'}
              </div>
            </div>
          ) : (
            <div className="si-list">
              {lowStockRaw.map((item) => (
                <div className="si-row si-row-alert" key={item._id}>
                  <div>
                    <p className="si-row-title">
                      <CIcon icon={cilWarning} className="me-2" style={{ color: '#dc3545' }} />
                      {item.rawMaterial?.name}
                    </p>
                    <div className="si-row-meta">
                      <span>
                        Current:{' '}
                        <strong>
                          {item.currentQuantity} {item.rawMaterial?.unit || ''}
                        </strong>
                      </span>
                      <span className="si-row-tag is-danger">
                        {Language.deficit || 'Deficit'} {item.deficit}{' '}
                        {item.rawMaterial?.unit || ''}
                      </span>
                    </div>
                    <div className="si-inv-progress">
                      <CProgress thin color="danger" value={item.percentage} height={6} />
                    </div>
                  </div>

                  <div className="si-row-actions">
                    <CButton
                      color="primary"
                      size="sm"
                      onClick={() => openReceive(item.rawMaterial._id)}
                    >
                      <CIcon icon={cilReload} className="me-1" />
                      {Language.receive || 'Receive'}
                    </CButton>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ---- Receive modal ---- */}
      <CModal
        visible={showReceiveModal}
        onClose={closeReceive}
        backdrop="static"
        className="si-modal"
      >
        <div className="si-modal-header">
          <h5 className="si-modal-title">
            <CIcon icon={cilPlus} />
            {Language.receiveInventory || 'Receive stock'}
          </h5>
          <button
            className="si-modal-close"
            onClick={closeReceive}
            aria-label={Language.close || 'Close'}
            type="button"
          >
            &times;
          </button>
        </div>

        <div className="si-modal-body">
          <div className="si-field">
            <label htmlFor="inv-material">{Language.material || 'Material'}</label>
            <CFormSelect
              id="inv-material"
              value={receiveForm.rawMaterialId}
              onChange={(e) =>
                setReceiveForm({
                  ...receiveForm,
                  rawMaterialId: e.target.value,
                })
              }
            >
              <option value="">{Language.selectMaterial || 'Select a material'}</option>
              {rawMaterials.map((m) => (
                <option key={m._id} value={m._id}>
                  {m.name} ({m.unit})
                </option>
              ))}
            </CFormSelect>
          </div>

          <div className="si-field">
            <label htmlFor="inv-qty">{Language.quantity || 'Quantity'}</label>
            <CFormInput
              id="inv-qty"
              type="number"
              step="0.01"
              min="0"
              value={receiveForm.quantity}
              onChange={(e) =>
                setReceiveForm({
                  ...receiveForm,
                  quantity: e.target.value,
                })
              }
              placeholder="0.00"
            />
            {receiveError && (
              <CFormFeedback invalid className="d-block">
                {receiveError}
              </CFormFeedback>
            )}
          </div>
        </div>

        <div className="si-modal-footer">
          <CButton color="secondary" variant="outline" onClick={closeReceive}>
            <CIcon icon={cilX} className="me-2" />
            {Language.cancel || 'Cancel'}
          </CButton>
          <CButton color="primary" onClick={submitReceive}>
            <CIcon icon={cilCheck} className="me-2" />
            {Language.addStock || 'Add stock'}
          </CButton>
        </div>
      </CModal>

      {/* ---- Edit modal ---- */}
      <CModal visible={showEditModal} onClose={closeEdit} backdrop="static" className="si-modal">
        <div className="si-modal-header">
          <h5 className="si-modal-title">
            <CIcon icon={cilPencil} />
            {Language.editInventory || 'Edit inventory'}
          </h5>
          <button className="si-modal-close" onClick={closeEdit} aria-label="Close" type="button">
            &times;
          </button>
        </div>

        <div className="si-modal-body">
          <div className="si-field">
            <label htmlFor="inv-edit-qty">{Language.currentQuantity || 'Current quantity'}</label>
            <CFormInput
              id="inv-edit-qty"
              type="number"
              step="0.01"
              min="0"
              value={editForm.quantity}
              onChange={(e) => setEditForm({ ...editForm, quantity: e.target.value })}
            />
            {editError && (
              <CFormFeedback invalid className="d-block">
                {editError}
              </CFormFeedback>
            )}
          </div>
        </div>

        <div className="si-modal-footer">
          <CButton color="secondary" variant="outline" onClick={closeEdit}>
            <CIcon icon={cilX} className="me-2" />
            {Language.cancel || 'Cancel'}
          </CButton>
          <CButton color="primary" onClick={submitEdit}>
            <CIcon icon={cilCheck} className="me-2" />
            {Language.save || 'Save'}
          </CButton>
        </div>
      </CModal>
    </>
  )
}

export default InventoryTab
