import React, { useState, useEffect, useCallback } from 'react'
import { CButton, CModal, CFormInput, CFormSelect, CFormFeedback } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import {
  cilPlus,
  cilTrash,
  cilPencil,
  cilSearch,
  cilRestaurant,
  cilCheck,
  cilX,
} from '@coreui/icons'
import RecipeListComponent from './RecipeListComponent'
import { fetchRawMaterials } from '../../../helpers/services'
import { useSelector } from 'react-redux'
import translations from '../../../app/Language'

const emptyForm = {
  productId: '',
  rawMaterials: [{ rawMaterialId: '', quantityPerUnit: '' }],
}

const RecipesTab = ({ activeTab, apiCall, showAlert, reportCount }) => {
  const t = useSelector((state) => state.language)
  const Language = translations[t]

  const [products, setProducts] = useState([])
  const [rawMaterials, setRawMaterials] = useState([])
  const [recipes, setRecipes] = useState([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  const [modalMode, setModalMode] = useState(null) // 'add' | 'edit' | null
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [errors, setErrors] = useState({})

  /* ---------- data ---------- */
  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const [productsData, rawMaterialsData, recipesData] = await Promise.all([
        apiCall('/products'),
        fetchRawMaterials(apiCall),
        apiCall('/recipes'),
      ])
      setProducts(productsData)
      setRawMaterials(rawMaterialsData)
      setRecipes(recipesData)
      reportCount?.(recipesData.length)
    } catch (err) {
      showAlert(Language.dataLoadError || 'Failed to load data', 'danger')
    } finally {
      setLoading(false)
    }
  }, [apiCall, showAlert, Language, reportCount])

  useEffect(() => {
    if (activeTab === 'recipes') loadData()
  }, [activeTab, loadData])

  /* ---------- modal ---------- */
  const openAdd = () => {
    setForm(emptyForm)
    setEditingId(null)
    setErrors({})
    setModalMode('add')
  }

  const openEdit = (recipe) => {
    setForm({
      productId: recipe.product?._id || '',
      rawMaterials: recipe.rawMaterials.map((rm) => ({
        rawMaterialId: rm.rawMaterial?._id || '',
        quantityPerUnit: String(rm.quantityPerUnit ?? ''),
      })),
    })
    setEditingId(recipe._id)
    setErrors({})
    setModalMode('edit')
  }

  const closeModal = () => {
    setModalMode(null)
    setEditingId(null)
    setForm(emptyForm)
    setErrors({})
  }

  /* ---------- form row helpers ---------- */
  const addRow = () => {
    setForm((prev) => ({
      ...prev,
      rawMaterials: [...prev.rawMaterials, { rawMaterialId: '', quantityPerUnit: '' }],
    }))
  }

  const removeRow = (idx) => {
    setForm((prev) => ({
      ...prev,
      rawMaterials: prev.rawMaterials.filter((_, i) => i !== idx),
    }))
  }

  const changeRow = (idx, field, value) => {
    setForm((prev) => ({
      ...prev,
      rawMaterials: prev.rawMaterials.map((row, i) =>
        i === idx ? { ...row, [field]: value } : row,
      ),
    }))
  }

  /* ---------- validation ---------- */
  const validate = () => {
    const e = {}
    if (!form.productId) e.productId = Language.selectProductRequired || 'Please select a product'
    if (form.rawMaterials.length === 0)
      e.rawMaterials = Language.addAtLeastOneIngredient || 'Add at least one ingredient'

    const perRow = form.rawMaterials.map((row) => {
      const r = {}
      if (!row.rawMaterialId) r.rawMaterialId = Language.required || 'Required'
      const qty = parseFloat(row.quantityPerUnit)
      if (isNaN(qty) || qty <= 0)
        r.quantityPerUnit = Language.mustBeGreaterThanZero || 'Must be > 0'
      return r
    })

    if (perRow.some((r) => Object.keys(r).length > 0)) e.perRow = perRow

    setErrors(e)
    return Object.keys(e).length === 0
  }

  /* ---------- submit ---------- */
  const handleSubmit = async () => {
    if (!validate()) return

    const payload = {
      productId: form.productId,
      rawMaterials: form.rawMaterials.map((rm) => ({
        rawMaterialId: rm.rawMaterialId,
        quantityPerUnit: parseFloat(rm.quantityPerUnit),
      })),
    }

    try {
      if (modalMode === 'edit' && editingId) {
        await apiCall(`/recipes/${editingId}`, 'PUT', payload)
        showAlert(Language.recipeUpdated || 'Recipe updated successfully')
      } else {
        await apiCall('/recipes', 'POST', payload)
        showAlert(Language.recipeAdded || 'Recipe added successfully')
      }
      closeModal()
      loadData()
    } catch (err) {
      showAlert(
        err.response?.data?.error || Language.recipeSaveError || 'Failed to save recipe',
        'danger',
      )
    }
  }

  /* ---------- delete ---------- */
  const handleDelete = async (id) => {
    if (
      !window.confirm(
        Language.confirmDeleteRecipe || 'Are you sure you want to delete this recipe?',
      )
    )
      return
    try {
      await apiCall(`/recipes/${id}`, 'DELETE')
      showAlert(Language.recipeDeleted || 'Recipe deleted successfully')
      loadData()
    } catch (err) {
      showAlert(Language.deleteError || 'Failed to delete recipe', 'danger')
    }
  }

  /* ---------- derived ---------- */
  const filtered = recipes.filter((recipe) =>
    (recipe.product?.name || '').toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const totalIngredients = recipes.reduce((sum, r) => sum + (r.rawMaterials?.length || 0), 0)

  const productsWithoutRecipe = products.filter(
    (p) => !recipes.some((r) => r.product?._id === p._id),
  ).length

  /* ---------- render ---------- */
  if (activeTab !== 'recipes') return null

  return (
    <>
      {/* ---- Section top strip ---- */}
      <div className="si-section-top">
        <div className="si-section-top-left">
          <h5 className="si-section-title">{Language.recipes || 'Recipes'}</h5>
          <div className="si-section-meta">
            <strong>{recipes.length}</strong>{' '}
            {recipes.length === 1 ? Language.recipe || 'recipe' : Language.recipes || 'recipes'}
            {' · '}
            <strong>{totalIngredients}</strong> {Language.ingredients || 'ingredients'}
            {' · '}
            <strong>{productsWithoutRecipe}</strong>{' '}
            {Language.productsWithoutRecipe || 'products without recipe'}
          </div>
        </div>

        <div className="si-section-top-right">
          <div className="si-search">
            <CIcon icon={cilSearch} className="si-search-icon" />
            <input
              type="text"
              placeholder={Language.searchRecipes || 'Search recipes...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <CButton color="primary" onClick={openAdd}>
            <CIcon icon={cilPlus} className="me-2" />
            {Language.addRecipe || 'Add recipe'}
          </CButton>
        </div>
      </div>

      {recipes.length === 0 && !loading ? (
        <div className="si-empty">
          <CIcon icon={cilRestaurant} size="xl" />
          <div className="si-empty-title">{Language.noRecipesFound || 'No recipes yet'}</div>
          <div className="si-empty-body">
            {Language.createYourFirstRecipe ||
              'Add a recipe to calculate product cost and track ingredients.'}
          </div>
          <CButton color="primary" className="si-empty-cta" onClick={openAdd}>
            <CIcon icon={cilPlus} className="me-2" />
            {Language.addRecipe || 'Add recipe'}
          </CButton>
        </div>
      ) : filtered.length === 0 ? (
        <div className="si-empty">
          <CIcon icon={cilSearch} size="xl" />
          <div className="si-empty-title">{Language.noRecipesMatch || 'No recipes match'}</div>
          <div className="si-empty-body">
            {Language.noRecipesMatchHint || 'Try a different search.'}
          </div>
        </div>
      ) : (
        <RecipeListComponent
          recipes={filtered}
          rawMaterials={rawMaterials}
          onEdit={openEdit}
          onDelete={handleDelete}
          loading={loading && recipes.length === 0}
        />
      )}

      {/* ---- Add / Edit modal ---- */}
      <CModal
        visible={!!modalMode}
        onClose={closeModal}
        size="lg"
        backdrop="static"
        className="si-modal"
      >
        <div className="si-modal-header">
          <h5 className="si-modal-title">
            <CIcon icon={modalMode === 'edit' ? cilPencil : cilPlus} />
            {modalMode === 'edit'
              ? Language.editRecipe || 'Edit recipe'
              : Language.addRecipe || 'Add recipe'}
          </h5>
          <button
            className="si-modal-close"
            onClick={closeModal}
            aria-label={Language.close || 'Close'}
            type="button"
          >
            &times;
          </button>
        </div>

        <div className="si-modal-body">
          <div className="si-field">
            <label htmlFor="rec-product">{Language.product || 'Product'}</label>
            <CFormSelect
              id="rec-product"
              value={form.productId}
              onChange={(e) => setForm({ ...form, productId: e.target.value })}
              invalid={!!errors.productId}
            >
              <option value="">{Language.selectProduct || 'Select a product'}</option>
              {products.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name}
                </option>
              ))}
            </CFormSelect>
            {errors.productId && (
              <CFormFeedback invalid className="d-block">
                {errors.productId}
              </CFormFeedback>
            )}
          </div>

          <div className="si-rec-rows-header">
            <span className="si-field-label">{Language.ingredients || 'Ingredients'}</span>
            <CButton color="secondary" variant="outline" size="sm" onClick={addRow}>
              <CIcon icon={cilPlus} className="me-1" />
              {Language.addIngredient || 'Add ingredient'}
            </CButton>
          </div>

          <div className="si-rec-rows">
            {form.rawMaterials.map((row, idx) => {
              const rowErr = errors.perRow?.[idx] || {}
              const raw = rawMaterials.find((m) => m._id === row.rawMaterialId)
              return (
                <div className="si-rec-row" key={idx}>
                  <div className="si-rec-row-select">
                    <CFormSelect
                      value={row.rawMaterialId}
                      onChange={(e) => changeRow(idx, 'rawMaterialId', e.target.value)}
                      invalid={!!rowErr.rawMaterialId}
                    >
                      <option value="">{Language.selectRawMaterial || 'Select material'}</option>
                      {rawMaterials.map((m) => (
                        <option key={m._id} value={m._id}>
                          {m.name} ({m.unit})
                        </option>
                      ))}
                    </CFormSelect>
                  </div>

                  <div className="si-rec-row-qty">
                    <CFormInput
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder={Language.quantityPerUnit || 'Qty per unit'}
                      value={row.quantityPerUnit}
                      onChange={(e) => changeRow(idx, 'quantityPerUnit', e.target.value)}
                      invalid={!!rowErr.quantityPerUnit}
                    />
                    {raw && <span className="si-rec-row-unit">{raw.unit}</span>}
                  </div>

                  <CButton
                    color="danger"
                    variant="outline"
                    size="sm"
                    onClick={() => removeRow(idx)}
                    disabled={form.rawMaterials.length <= 1}
                    aria-label={Language.removeIngredient || 'Remove ingredient'}
                  >
                    <CIcon icon={cilTrash} />
                  </CButton>
                </div>
              )
            })}
          </div>

          {errors.rawMaterials && (
            <CFormFeedback invalid className="d-block">
              {errors.rawMaterials}
            </CFormFeedback>
          )}
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
              : Language.addRecipe || 'Add recipe'}
          </CButton>
        </div>
      </CModal>
    </>
  )
}

export default RecipesTab
