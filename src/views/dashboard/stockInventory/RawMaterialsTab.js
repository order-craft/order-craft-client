import React, { useState, useEffect, useCallback } from 'react'
import { CButton, CModal, CFormInput, CFormFeedback } from '@coreui/react'
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
} from '@coreui/icons'
import { fetchRawMaterials } from '../../../helpers/services'
import { useSelector } from 'react-redux'
import translations from '../../../app/Language'

const emptyForm = { name: '', unit: '', costPerUnit: '', reorderLevel: '' }

const RawMaterialsTab = ({ activeTab, apiCall, showAlert, reportCount }) => {
  const t = useSelector((state) => state.language)
  const Language = translations[t]

  const [rawMaterials, setRawMaterials] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(false)

  const [modalMode, setModalMode] = useState(null) // 'add' | 'edit' | null
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [errors, setErrors] = useState({})

  /* ---------- data ---------- */
  const loadRawMaterials = useCallback(async () => {
    try {
      setLoading(true)
      const data = await fetchRawMaterials(apiCall)
      setRawMaterials(data)
      reportCount?.(data.length)
    } catch (err) {
      showAlert(Language.materialsLoadError || 'Failed to load materials', 'danger')
    } finally {
      setLoading(false)
    }
  }, [apiCall, showAlert, Language, reportCount])

  useEffect(() => {
    if (activeTab === 'raw-materials') loadRawMaterials()
  }, [activeTab, loadRawMaterials])

  /* ---------- modal ---------- */
  const openAdd = () => {
    setForm(emptyForm)
    setEditing(null)
    setErrors({})
    setModalMode('add')
  }

  const openEdit = (material) => {
    setForm({
      name: material.name || '',
      unit: material.unit || '',
      costPerUnit: String(material.costPerUnit ?? ''),
      reorderLevel: String(material.reorderLevel ?? ''),
    })
    setEditing(material)
    setErrors({})
    setModalMode('edit')
  }

  const closeModal = () => {
    setModalMode(null)
    setEditing(null)
    setForm(emptyForm)
    setErrors({})
  }

  const validate = () => {
    const e = {}
    if (!form.name.trim()) e.name = Language.nameRequired || 'Name is required'
    if (!form.unit.trim()) e.unit = Language.unitRequired || 'Unit is required'
    const cost = parseFloat(form.costPerUnit)
    if (isNaN(cost) || cost < 0)
      e.costPerUnit = Language.costMustBePositive || 'Cost must be a positive number'
    const reorder = parseFloat(form.reorderLevel)
    if (isNaN(reorder) || reorder < 0)
      e.reorderLevel =
        Language.reorderLevelMustBePositive || 'Reorder level must be a positive number'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return

    const payload = {
      name: form.name.trim(),
      unit: form.unit.trim(),
      costPerUnit: parseFloat(form.costPerUnit),
      reorderLevel: parseFloat(form.reorderLevel),
    }

    try {
      if (modalMode === 'edit' && editing) {
        await apiCall(`/raw-materials/${editing._id}`, 'PUT', payload)
        showAlert(Language.materialUpdated || 'Material updated successfully')
      } else {
        await apiCall('/raw-materials', 'POST', payload)
        showAlert(Language.materialAdded || 'Material added successfully')
      }
      closeModal()
      loadRawMaterials()
    } catch (err) {
      // apiCall already toasts on error, but keep a fallback
      showAlert(
        err.response?.data?.error || Language.materialSaveError || 'Error saving material',
        'danger',
      )
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm(Language.confirmDelete || 'Are you sure you want to delete this material?'))
      return
    try {
      await apiCall(`/raw-materials/${id}`, 'DELETE')
      showAlert(Language.materialDeleted || 'Material deleted')
      loadRawMaterials()
    } catch (err) {
      showAlert(
        err.response?.data?.error || Language.materialDeleteError || 'Error deleting material',
        'danger',
      )
    }
  }

  /* ---------- derived ---------- */
  const filtered = rawMaterials.filter((m) =>
    m.name.toLowerCase().includes(searchTerm.toLowerCase()),
  )
  const withCost = rawMaterials.filter(
    (m) => typeof m.costPerUnit === 'number' && m.costPerUnit > 0,
  ).length
  const usedInRecipes = rawMaterials.filter((m) => m.usedInRecipes > 0).length

  /* ---------- render ---------- */
  if (activeTab !== 'raw-materials') return null

  return (
    <>
      <div className="si-section-top">
        <div className="si-section-top-left">
          <h5 className="si-section-title">{Language.rawMaterials || 'Raw Materials'}</h5>
          <div className="si-section-meta">
            <strong>{rawMaterials.length}</strong>{' '}
            {rawMaterials.length === 1
              ? Language.material || 'material'
              : Language.materials || 'materials'}
            {' · '}
            <strong>{withCost}</strong> {Language.withCostSet || 'with cost set'}
            {' · '}
            <strong>{usedInRecipes}</strong> {Language.usedInRecipes || 'used in recipes'}
          </div>
        </div>

        <div className="si-section-top-right">
          <div className="si-search">
            <CIcon icon={cilSearch} className="si-search-icon" />
            <input
              type="text"
              placeholder={Language.searchMaterials || 'Search raw materials...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <CButton color="primary" onClick={openAdd}>
            <CIcon icon={cilPlus} className="me-2" />
            {Language.addRawMaterial || 'Add material'}
          </CButton>
        </div>
      </div>

      {rawMaterials.length === 0 && !loading ? (
        <div className="si-empty">
          <CIcon icon={cilHome} size="xl" />
          <div className="si-empty-title">{Language.noRawMaterials || 'No raw materials yet'}</div>
          <div className="si-empty-body">
            {Language.noRawMaterialsHint ||
              'Add the ingredients and packaging you purchase to track stock and cost.'}
          </div>
          <CButton color="primary" onClick={openAdd} className="si-empty-cta">
            <CIcon icon={cilPlus} className="me-2" />
            {Language.addRawMaterial || 'Add material'}
          </CButton>
        </div>
      ) : filtered.length === 0 ? (
        <div className="si-empty">
          <CIcon icon={cilSearch} size="xl" />
          <div className="si-empty-title">{Language.noMaterialsFound || 'No materials match'}</div>
          <div className="si-empty-body">
            {Language.noMaterialsFoundHint || 'Try a different search.'}
          </div>
        </div>
      ) : (
        <div className="si-list">
          {filtered.map((material) => (
            <div className="si-row" key={material._id}>
              <div>
                <p className="si-row-title">{material.name}</p>
                <div className="si-row-meta">
                  <span>
                    Cost:{' '}
                    <strong>
                      {Number(material.costPerUnit).toFixed(2)} TND / {material.unit}
                    </strong>
                  </span>
                  <span>
                    Reorder at{' '}
                    <strong>
                      {material.reorderLevel} {material.unit}
                    </strong>
                  </span>
                  {material.usedInRecipes > 0 ? (
                    <span className="si-row-tag is-used">
                      {Language.usedIn || 'Used in'} {material.usedInRecipes}{' '}
                      {material.usedInRecipes === 1
                        ? Language.recipe || 'recipe'
                        : Language.recipes || 'recipes'}
                    </span>
                  ) : (
                    <span className="si-row-tag">{Language.notUsed || 'Not used'}</span>
                  )}
                </div>
              </div>

              <div className="si-row-actions">
                <CButton
                  color="secondary"
                  variant="outline"
                  size="sm"
                  onClick={() => openEdit(material)}
                  aria-label={Language.edit || 'Edit'}
                >
                  <CIcon icon={cilPencil} />
                </CButton>
                <CButton
                  color="danger"
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(material._id)}
                  disabled={material.usedInRecipes > 0}
                  aria-label={Language.delete || 'Delete'}
                >
                  <CIcon icon={cilTrash} />
                </CButton>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ---------- Add / Edit modal ---------- */}
      <CModal visible={!!modalMode} onClose={closeModal} backdrop="static" className="si-modal">
        <div className="si-modal-header">
          <h5 className="si-modal-title">
            <CIcon icon={modalMode === 'edit' ? cilPencil : cilPlus} />
            {modalMode === 'edit'
              ? Language.editRawMaterial || 'Edit raw material'
              : Language.addRawMaterial || 'Add raw material'}
          </h5>
          <button className="si-modal-close" onClick={closeModal} aria-label="Close" type="button">
            &times;
          </button>
        </div>

        <div className="si-modal-body">
          <div className="si-field">
            <label htmlFor="rm-name">{Language.name || 'Name'}</label>
            <CFormInput
              id="rm-name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder={Language.materialName || 'e.g. Coffee beans'}
              invalid={!!errors.name}
            />
            {errors.name && (
              <CFormFeedback invalid className="d-block">
                {errors.name}
              </CFormFeedback>
            )}
          </div>

          <div className="si-field">
            <label htmlFor="rm-unit">{Language.unit || 'Unit'}</label>
            <CFormInput
              id="rm-unit"
              value={form.unit}
              onChange={(e) => setForm({ ...form, unit: e.target.value })}
              placeholder="kg, g, L, pcs"
              invalid={!!errors.unit}
            />
            {errors.unit && (
              <CFormFeedback invalid className="d-block">
                {errors.unit}
              </CFormFeedback>
            )}
          </div>

          <div className="si-row-2">
            <div className="si-field">
              <label htmlFor="rm-cost">{Language.costPerUnit || 'Cost per unit (TND)'}</label>
              <CFormInput
                id="rm-cost"
                type="number"
                step="0.01"
                min="0"
                value={form.costPerUnit}
                onChange={(e) => setForm({ ...form, costPerUnit: e.target.value })}
                invalid={!!errors.costPerUnit}
              />
              {errors.costPerUnit && (
                <CFormFeedback invalid className="d-block">
                  {errors.costPerUnit}
                </CFormFeedback>
              )}
            </div>
            <div className="si-field">
              <label htmlFor="rm-reorder">{Language.reorderLevel || 'Reorder level'}</label>
              <CFormInput
                id="rm-reorder"
                type="number"
                step="0.01"
                min="0"
                value={form.reorderLevel}
                onChange={(e) => setForm({ ...form, reorderLevel: e.target.value })}
                invalid={!!errors.reorderLevel}
              />
              {errors.reorderLevel && (
                <CFormFeedback invalid className="d-block">
                  {errors.reorderLevel}
                </CFormFeedback>
              )}
            </div>
          </div>
        </div>

        <div className="si-modal-footer">
          <CButton color="secondary" variant="outline" onClick={closeModal}>
            <CIcon icon={cilX} className="me-2" />
            {Language.cancel || 'Cancel'}
          </CButton>
          <CButton color="primary" onClick={handleSubmit}>
            <CIcon icon={cilCheck} className="me-2" />
            {modalMode === 'edit'
              ? Language.saveChanges || 'Save changes'
              : Language.addRawMaterial || 'Add material'}
          </CButton>
        </div>
      </CModal>
    </>
  )
}

export default RawMaterialsTab
