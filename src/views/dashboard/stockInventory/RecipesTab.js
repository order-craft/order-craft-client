import React, { useState, useEffect, useCallback } from 'react'
import {
  CTabPane,
  CCardBody,
  CCard,
  CCardHeader,
  CRow,
  CCol,
  CFormSelect,
  CFormInput,
  CButton,
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CSpinner,
  CBadge,
  CInputGroup,
  CInputGroupText,
  CTooltip,
} from '@coreui/react'
import RecipeListComponent from './RecipeListComponent'
import { fetchRawMaterials } from '../../../helpers/services'
import { useSelector } from 'react-redux'
import translations from '../../../app/Language'
import { GetToken } from '../../../helpers/GetToken'
import CIcon from '@coreui/icons-react'
import { cilPlus, cilSearch, cilRestaurant, cilPencil, cilTrash } from '@coreui/icons'

const RecipesTab = ({ showAlert, apiCall, activeTab }) => {
  const t = useSelector((state) => state.language)
  const Language = translations[t]
  const token = GetToken()
  const [products, setProducts] = useState([])
  const [rawMaterials, setRawMaterials] = useState([])
  const [recipes, setRecipes] = useState([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

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
    } catch (err) {
      console.error(err)
      showAlert(Language.dataLoadError || 'Failed to load data', 'danger')
    } finally {
      setLoading(false)
    }
  }, [apiCall, showAlert])

  const deleteRecipe = async (id) => {
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
      console.error(err)
      showAlert(Language.deleteError || 'Failed to delete recipe', 'danger')
    }
  }

  useEffect(() => {
    if (activeTab === 'recipes') {
      loadData()
    }
  }, [activeTab])

  const [recipeForm, setRecipeForm] = useState({
    productId: '',
    rawMaterials: [{ rawMaterialId: '', quantityPerUnit: '' }],
  })

  const [showEditModal, setShowEditModal] = useState(false)
  const [editRecipeId, setEditRecipeId] = useState(null)
  const [editForm, setEditForm] = useState({
    productId: '',
    rawMaterials: [{ rawMaterialId: '', quantityPerUnit: '' }],
  })

  const filteredRecipes = recipes.filter((recipe) =>
    recipe.product?.name.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const handleProductChange = (e) => {
    setRecipeForm({ ...recipeForm, productId: e.target.value })
  }

  const handleRawMaterialChange = (idx, field, val) => {
    const updated = recipeForm.rawMaterials.map((entry, i) =>
      i === idx ? { ...entry, [field]: val } : entry,
    )
    setRecipeForm({ ...recipeForm, rawMaterials: updated })
  }

  const addRawMaterialRow = () => {
    setRecipeForm({
      ...recipeForm,
      rawMaterials: [...recipeForm.rawMaterials, { rawMaterialId: '', quantityPerUnit: '' }],
    })
  }

  const removeRawMaterialRow = (idx) => {
    if (recipeForm.rawMaterials.length <= 1) return
    setRecipeForm({
      ...recipeForm,
      rawMaterials: recipeForm.rawMaterials.filter((_, i) => i !== idx),
    })
  }

  const addRecipe = async () => {
    if (
      !recipeForm.productId ||
      recipeForm.rawMaterials.some((rm) => !rm.rawMaterialId || !rm.quantityPerUnit)
    ) {
      showAlert(Language.fillAllFields || 'Please fill all fields', 'danger')
      return
    }

    try {
      const payload = {
        productId: recipeForm.productId,
        rawMaterials: recipeForm.rawMaterials.map((rm) => ({
          rawMaterialId: rm.rawMaterialId,
          quantityPerUnit: parseFloat(rm.quantityPerUnit),
        })),
      }

      await apiCall('/recipes', 'POST', payload)
      showAlert(Language.recipeAdded || 'Recipe added successfully')
      setRecipeForm({
        productId: '',
        rawMaterials: [{ rawMaterialId: '', quantityPerUnit: '' }],
      })
      loadData()
    } catch (err) {
      console.error(err)
      showAlert(Language.recipeAddError || 'Failed to add recipe', 'danger')
    }
  }

  const openEditModal = (recipe) => {
    setEditRecipeId(recipe._id)
    setEditForm({
      productId: recipe.product._id,
      rawMaterials: recipe.rawMaterials.map((rm) => ({
        rawMaterialId: rm.rawMaterial._id,
        quantityPerUnit: String(rm.quantityPerUnit),
      })),
    })
    setShowEditModal(true)
  }

  const updateRecipe = async () => {
    if (
      !editForm.productId ||
      editForm.rawMaterials.some((rm) => !rm.rawMaterialId || !rm.quantityPerUnit)
    ) {
      showAlert(Language.fillAllFields || 'Please fill all fields', 'danger')
      return
    }

    try {
      const payload = {
        productId: editForm.productId,
        rawMaterials: editForm.rawMaterials.map((rm) => ({
          rawMaterialId: rm.rawMaterialId,
          quantityPerUnit: parseFloat(rm.quantityPerUnit),
        })),
      }

      await apiCall(`/recipes/${editRecipeId}`, 'PUT', payload)
      showAlert(Language.recipeUpdated || 'Recipe updated successfully')
      setShowEditModal(false)
      loadData()
    } catch (err) {
      console.error(err)
      showAlert(Language.recipeUpdateError || 'Failed to update recipe', 'danger')
    }
  }

  return (
    <CTabPane visible={activeTab === 'recipes'}>
      <CCardBody>
        <CRow className="mb-4">
          <CCol md={8}>
            <CInputGroup>
              <CInputGroupText>
                <CIcon icon={cilSearch} />
              </CInputGroupText>
              <CFormInput
                placeholder={Language.searchRecipes}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </CInputGroup>
          </CCol>
          <CCol md={4} className="d-flex justify-content-end">
            <CBadge color="primary" className="fs-6 p-2">
              {filteredRecipes.length} {Language.recipes}
            </CBadge>
          </CCol>
        </CRow>

        <CCard className="mb-4">
          <CCardHeader>
            <h5 className="mb-0">
              <CIcon icon={cilPlus} className="me-2" />
              {Language.addRecipe}
            </h5>
          </CCardHeader>
          <CCardBody>
            <CRow className="g-3 mb-3">
              <CCol md={4}>
                <CInputGroup>
                  <CInputGroupText>
                    <CIcon icon={cilRestaurant} />
                  </CInputGroupText>
                  <CFormSelect value={recipeForm.productId} onChange={handleProductChange}>
                    <option value="">{Language.selectProduct}</option>
                    {products.map((p) => (
                      <option key={p._id} value={p._id}>
                        {p.name}
                      </option>
                    ))}
                  </CFormSelect>
                </CInputGroup>
              </CCol>
              <CCol md={8}>
                <CTooltip content={Language.addIngredient}>
                  <CButton color="info" onClick={addRawMaterialRow}>
                    <CIcon icon={cilPlus} className="me-2" />
                    {Language.addRawMaterial}
                  </CButton>
                </CTooltip>
              </CCol>
            </CRow>

            {recipeForm.rawMaterials.map((rm, idx) => (
              <CRow className="g-3 align-items-center mb-2" key={`add-${idx}`}>
                <CCol md={5}>
                  <CInputGroup>
                    <CInputGroupText>
                      <CIcon icon={cilPencil} />
                    </CInputGroupText>
                    <CFormSelect
                      value={rm.rawMaterialId}
                      onChange={(e) =>
                        handleRawMaterialChange(idx, 'rawMaterialId', e.target.value)
                      }
                    >
                      <option value="">{Language.selectRawMaterial}</option>
                      {rawMaterials.map((mat) => (
                        <option key={mat._id} value={mat._id}>
                          {mat.name}
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
                      placeholder={Language.quantityPerUnit}
                      step="0.01"
                      min="0"
                      value={rm.quantityPerUnit}
                      onChange={(e) =>
                        handleRawMaterialChange(idx, 'quantityPerUnit', e.target.value)
                      }
                    />
                  </CInputGroup>
                </CCol>
                <CCol md={3}>
                  <CTooltip content={Language.removeIngredient}>
                    <CButton
                      color="danger"
                      size="sm"
                      disabled={recipeForm.rawMaterials.length <= 1}
                      onClick={() => removeRawMaterialRow(idx)}
                    >
                      <CIcon icon={cilTrash} />
                    </CButton>
                  </CTooltip>
                </CCol>
              </CRow>
            ))}

            <CRow className="mt-4">
              <CCol>
                <CButton color="success" onClick={addRecipe} disabled={loading}>
                  {loading ? <CSpinner size="sm" /> : Language.createRecipe}
                </CButton>
              </CCol>
            </CRow>
          </CCardBody>
        </CCard>

        <RecipeListComponent
          recipes={filteredRecipes}
          onEdit={openEditModal}
          onDelete={deleteRecipe}
          loading={loading && filteredRecipes.length === 0}
        />
      </CCardBody>

      <CModal size="lg" visible={showEditModal} onClose={() => setShowEditModal(false)}>
        <CModalHeader closeButton>
          <CModalTitle>{Language.editRecipe}</CModalTitle>
        </CModalHeader>
        <CModalBody>
          <CRow className="g-3 mb-3">
            <CCol md={6}>
              <CInputGroup>
                <CInputGroupText>
                  <CIcon icon={cilRestaurant} />
                </CInputGroupText>
                <CFormSelect
                  value={editForm.productId}
                  onChange={(e) => setEditForm({ ...editForm, productId: e.target.value })}
                >
                  <option value="">{Language.selectProduct}</option>
                  {products.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.name}
                    </option>
                  ))}
                </CFormSelect>
              </CInputGroup>
            </CCol>
            <CCol md={6}>
              <CTooltip content={Language.addIngredient}>
                <CButton
                  color="info"
                  onClick={() =>
                    setEditForm({
                      ...editForm,
                      rawMaterials: [
                        ...editForm.rawMaterials,
                        { rawMaterialId: '', quantityPerUnit: '' },
                      ],
                    })
                  }
                >
                  <CIcon icon={cilPlus} className="me-2" />
                  {Language.addRawMaterial}
                </CButton>
              </CTooltip>
            </CCol>
          </CRow>

          {editForm.rawMaterials.map((rm, idx) => (
            <CRow className="g-3 align-items-center mb-2" key={`edit-${idx}`}>
              <CCol md={5}>
                <CInputGroup>
                  <CInputGroupText>
                    <CIcon icon={cilPencil} />
                  </CInputGroupText>
                  <CFormSelect
                    value={rm.rawMaterialId}
                    onChange={(e) => {
                      const updated = [...editForm.rawMaterials]
                      updated[idx].rawMaterialId = e.target.value
                      setEditForm({ ...editForm, rawMaterials: updated })
                    }}
                  >
                    <option value="">{Language.selectRawMaterial}</option>
                    {rawMaterials.map((mat) => (
                      <option key={mat._id} value={mat._id}>
                        {mat.name}
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
                    placeholder={Language.quantityPerUnit}
                    step="0.01"
                    min="0"
                    value={rm.quantityPerUnit}
                    onChange={(e) => {
                      const updated = [...editForm.rawMaterials]
                      updated[idx].quantityPerUnit = e.target.value
                      setEditForm({ ...editForm, rawMaterials: updated })
                    }}
                  />
                </CInputGroup>
              </CCol>
              <CCol md={3}>
                <CTooltip content={Language.removeIngredient}>
                  <CButton
                    color="danger"
                    size="sm"
                    disabled={editForm.rawMaterials.length <= 1}
                    onClick={() => {
                      const updated = editForm.rawMaterials.filter((_, i) => i !== idx)
                      setEditForm({ ...editForm, rawMaterials: updated })
                    }}
                  >
                    <CIcon icon={cilTrash} />
                  </CButton>
                </CTooltip>
              </CCol>
            </CRow>
          ))}
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={() => setShowEditModal(false)}>
            {Language.cancel}
          </CButton>
          <CButton color="primary" onClick={updateRecipe}>
            {Language.saveChanges}
          </CButton>
        </CModalFooter>
      </CModal>
    </CTabPane>
  )
}

export default RecipesTab
