import React, { useState, useEffect, useCallback } from 'react'
import { CButton, CModal, CFormInput, CFormSelect, CFormFeedback } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import {
  cilPlus,
  cilTrash,
  cilPencil,
  cilSearch,
  cilHome,
  cilCheck,
  cilX,
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
  const [stockFilter, setStockFilter] = useState('all')
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

  // 'out' and 'low' together are exactly the items lowStockRaw counts
  // (quantity at or below the reorder level), so the filter count and the
  // rows it shows always agree.
  const stockState = (item) => {
    const isLow = item.rawMaterial && item.currentQuantity <= item.rawMaterial.reorderLevel
    if (!isLow) return 'ok'
    return (Number(item.currentQuantity) || 0) <= 0 ? 'out' : 'low'
  }
  const RANK = { out: 0, low: 1, ok: 2 }
  const outOfStock = inventory.filter((item) => stockState(item) === 'out').length
  const shownStock = filtered
    .filter((item) => stockFilter === 'all' || stockState(item) !== 'ok')
    .sort((a, b) => {
      const r = RANK[stockState(a)] - RANK[stockState(b)]
      if (r !== 0) return r
      const ratio = (it) =>
        (Number(it.currentQuantity) || 0) / (Number(it.rawMaterial?.reorderLevel) || 1)
      return (
        ratio(a) - ratio(b) || (a.rawMaterial?.name || '').localeCompare(b.rawMaterial?.name || '')
      )
    })

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
      {/* ---- Readings ---- */}
      <section className="iv-strip">
        <div className="iv-cell">
          <span className="iv-value">{inventory.length}</span>
          <span className="iv-label">{Language.totalItems || 'Items tracked'}</span>
        </div>
        <div className={`iv-cell ${lowStockRaw.length ? 'is-alert' : 'is-ok'}`}>
          <span className="iv-value">{lowStockRaw.length}</span>
          <span className="iv-label">
            {Language.ivAtOrBelow || 'at or below reorder level'}
            {outOfStock > 0 && (
              <>
                {' · '}
                <b>
                  {outOfStock} {Language.ivOut || 'out of stock'}
                </b>
              </>
            )}
          </span>
        </div>
        <div className="iv-cell">
          <span className="iv-value">
            {totalStockValue.toFixed(2)}
            <small>TND</small>
          </span>
          <span className="iv-label">{Language.stockValue || 'Stock value on hand'}</span>
        </div>
      </section>

      {/* ---- Toolbar ---- */}
      <div className="oc-toolbar">
        <div className="oc-toolbar-group">
          <div className="oc-seg" role="group" aria-label="Filter stock">
            <button
              type="button"
              className={stockFilter === 'all' ? 'is-active' : ''}
              onClick={() => setStockFilter('all')}
            >
              {Language.tlAll || 'All'}
              <span className="oc-seg-count">{inventory.length}</span>
            </button>
            <button
              type="button"
              className={stockFilter === 'low' ? 'is-active' : ''}
              onClick={() => setStockFilter('low')}
            >
              {Language.ivNeedsRestock || 'Needs restock'}
              <span className="oc-seg-count">{lowStockRaw.length}</span>
            </button>
          </div>
          <label className="oc-search">
            <CIcon icon={cilSearch} width={15} />
            <input
              type="text"
              placeholder={Language.searchInventory || 'Search inventory…'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              aria-label="Search inventory"
            />
          </label>
        </div>
        <CButton color="primary" onClick={() => openReceive()}>
          <CIcon icon={cilPlus} className="me-2" />
          {Language.receiveInventory || 'Receive stock'}
        </CButton>
      </div>

      {/* ---- Stock table ---- */}
      <div className="oc-panel iv-panel">
        {inventory.length === 0 && !loading ? (
          <div className="oc-empty">
            <span className="oc-empty-icon">
              <CIcon icon={cilHome} />
            </span>
            <span className="oc-empty-title">
              {Language.noInventoryYet || 'No stock tracked yet'}
            </span>
            <span className="oc-empty-body">
              {Language.noInventoryHint || 'Receive stock to start tracking quantities and values.'}
            </span>
            <CButton color="primary" className="mt-2" onClick={() => openReceive()}>
              <CIcon icon={cilPlus} className="me-2" />
              {Language.receiveInventory || 'Receive stock'}
            </CButton>
          </div>
        ) : shownStock.length === 0 ? (
          <div className="oc-empty">
            <span className="oc-empty-icon">
              <CIcon icon={stockFilter === 'low' ? cilCheckCircle : cilSearch} />
            </span>
            <span className="oc-empty-title">
              {stockFilter === 'low' && !searchTerm
                ? Language.allItemsWellStocked || 'Everything is well stocked'
                : Language.noInventoryMatch || 'No items match'}
            </span>
            <span className="oc-empty-body">
              {stockFilter === 'low' && !searchTerm
                ? Language.allItemsWellStockedHint || 'Nothing is at or below its reorder level.'
                : Language.noInventoryMatchHint || 'Try a different search.'}
            </span>
          </div>
        ) : (
          <div className="iv-table" role="table">
            <div className="iv-head" role="row">
              <span role="columnheader">{Language.ivMaterial || 'Material'}</span>
              <span role="columnheader">{Language.ivLevel || 'On hand vs. reorder level'}</span>
              <span role="columnheader">{Language.ivStatus || 'Status'}</span>
              <span role="columnheader" className="iv-num">
                {Language.ivUnitCost || 'Unit cost'}
              </span>
              <span role="columnheader" />
            </div>
            {shownStock.map((item) => {
              const unit = item.rawMaterial?.unit || ''
              const rl = Number(item.rawMaterial?.reorderLevel) || 0
              const qty = Number(item.currentQuantity) || 0
              const state = stockState(item)
              // Scale: the reorder level sits at 50% of the track, so "how far
              // above it" is as readable as "how far below".
              const scaleMax = Math.max(rl * 2, qty, 1)
              const fill = Math.min(100, (qty / scaleMax) * 100)
              const marker = rl > 0 ? Math.min(100, (rl / scaleMax) * 100) : null
              return (
                <div className={`iv-row is-${state}`} key={item._id} role="row">
                  <div className="iv-name" role="cell">
                    {item.rawMaterial?.name || Language.ivUnnamed || 'Unnamed material'}
                  </div>
                  <div className="iv-level" role="cell">
                    <span className="iv-qty">
                      <b>{qty}</b> {unit}
                      {rl > 0 && (
                        <span className="iv-qty-rl">
                          {' / '}
                          {rl} {unit}
                        </span>
                      )}
                    </span>
                    <span className="iv-gauge" aria-hidden="true">
                      <span className="iv-gauge-fill" style={{ width: `${fill}%` }} />
                      {marker != null && (
                        <span className="iv-gauge-marker" style={{ left: `${marker}%` }} />
                      )}
                    </span>
                  </div>
                  <div role="cell">
                    <span className={`iv-status is-${state}`}>
                      {state === 'out'
                        ? Language.ivOutShort || 'Out of stock'
                        : state === 'low'
                          ? Language.ivLow || 'Restock'
                          : Language.ivOk || 'OK'}
                    </span>
                  </div>
                  <div className="iv-num" role="cell">
                    {Number(item.rawMaterial?.costPerUnit || 0).toFixed(2)} TND
                    <span className="iv-per"> / {unit}</span>
                  </div>
                  <div className="iv-actions" role="cell">
                    {item.rawMaterial?._id && (
                      <CButton
                        color={state === 'ok' ? 'secondary' : 'primary'}
                        variant={state === 'ok' ? 'outline' : undefined}
                        size="sm"
                        onClick={() => openReceive(item.rawMaterial._id)}
                      >
                        <CIcon icon={cilReload} className="me-1" />
                        {Language.receive || 'Receive'}
                      </CButton>
                    )}
                    <button
                      type="button"
                      className="oc-icon-btn iv-icon"
                      onClick={() => openEdit(item)}
                      aria-label={Language.ivAdjust || 'Adjust quantity'}
                      title={Language.ivAdjust || 'Adjust quantity'}
                    >
                      <CIcon icon={cilPencil} width={14} />
                    </button>
                    <button
                      type="button"
                      className="oc-icon-btn iv-icon is-danger"
                      onClick={() => handleDelete(item._id)}
                      aria-label={Language.delete || 'Delete'}
                      title={Language.delete || 'Delete'}
                    >
                      <CIcon icon={cilTrash} width={14} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
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
            aria-label="Close"
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
