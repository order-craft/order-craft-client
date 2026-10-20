import React, { useState } from 'react'
import {
  CCard,
  CCardBody,
  CCardHeader,
  CRow,
  CCol,
  CButton,
  CBadge,
  CCollapse,
  CTable,
  CTableHead,
  CTableRow,
  CTableHeaderCell,
  CTableBody,
  CTableDataCell,
  CSpinner,
  CTooltip,
} from '@coreui/react'
import { useSelector } from 'react-redux'
import translations from '../../../app/Language'
import CIcon from '@coreui/icons-react'
import { cilPencil, cilTrash, cilInfo, cilRestaurant } from '@coreui/icons'

const RecipeListComponent = ({ recipes, rawMaterials = [], onEdit, onDelete, loading }) => {
  const t = useSelector((state) => state.language)
  const Language = translations[t]
  const [expandedRecipes, setExpandedRecipes] = useState(new Set())

  const toggleExpand = (recipeId) => {
    setExpandedRecipes((prev) => {
      const next = new Set(prev)
      if (next.has(recipeId)) next.delete(recipeId)
      else next.add(recipeId)
      return next
    })
  }

  const isExpanded = (recipeId) => expandedRecipes.has(recipeId)

  const unitCostOf = (recipe) => {
    let total = 0
    let anyPriceMissing = false
    for (const entry of recipe.rawMaterials || []) {
      // Prefer the populated object; fall back to the raw list from the parent
      const populated = entry.rawMaterial
      const fallback = rawMaterials.find((m) => m._id === (populated?._id || populated))
      const cost = populated?.costPerUnit ?? fallback?.costPerUnit
      if (typeof cost !== 'number') {
        anyPriceMissing = true
        continue
      }
      total += cost * (entry.quantityPerUnit || 0)
    }
    return { total, anyPriceMissing }
  }

  if (loading) {
    return (
      <div className="text-center py-5">
        <CSpinner color="primary" size="sm" />
        <p className="mt-3">{Language.loadingRecipes || 'Loading recipes...'}</p>
      </div>
    )
  }

  if (recipes.length === 0) return null

  return (
    <CRow className="g-3">
      {recipes.map((recipe) => {
        const expanded = isExpanded(recipe._id)
        const { total: unitCost, anyPriceMissing } = unitCostOf(recipe)
        const ingredientsCount = recipe.rawMaterials?.length || 0

        return (
          <CCol key={recipe._id} xs={12} lg={6} xl={4}>
            <CCard className="si-rec-card">
              <CCardHeader className="si-rec-card-header">
                <div className="si-rec-card-title-wrap">
                  <div className="si-rec-card-title">
                    {recipe.product?.name || 'Unknown product'}
                  </div>
                  <div className="si-rec-card-title">
                    {recipe.product?.name || Language.unknownProduct || 'Unknown product'}
                  </div>
                  <div className="si-rec-card-sub">
                    {ingredientsCount}{' '}
                    {ingredientsCount === 1
                      ? Language.ingredient || 'ingredient'
                      : Language.ingredients || 'ingredients'}
                    {unitCost > 0 && (
                      <>
                        {' · '}
                        <span className="si-rec-cost">
                          {unitCost.toFixed(2)} TND / {Language.unit || 'unit'}
                        </span>
                      </>
                    )}
                    {anyPriceMissing && (
                      <span className="si-rec-cost-missing">
                        {' '}
                        ({Language.somePricesMissing || 'some prices missing'})
                      </span>
                    )}
                  </div>
                </div>
                <div className="si-rec-card-actions">
                  <CTooltip content={Language.edit || 'Edit'}>
                    <CButton
                      color="secondary"
                      variant="outline"
                      size="sm"
                      onClick={() => onEdit(recipe)}
                    >
                      <CIcon icon={cilPencil} />
                    </CButton>
                  </CTooltip>
                  <CTooltip content={Language.delete || 'Delete'}>
                    <CButton
                      color="danger"
                      variant="outline"
                      size="sm"
                      onClick={() => onDelete(recipe._id)}
                    >
                      <CIcon icon={cilTrash} />
                    </CButton>
                  </CTooltip>
                </div>
              </CCardHeader>

              <CCardBody className="si-rec-card-body">
                <div className="si-rec-preview">
                  {recipe.rawMaterials.slice(0, 3).map((rm, idx) => (
                    <div className="si-rec-preview-line" key={idx}>
                      <span className="si-rec-preview-name">
                        {rm.rawMaterial?.name || Language.unknown || 'Unknown'}
                      </span>
                      <span className="si-rec-preview-qty">
                        {rm.quantityPerUnit} {rm.rawMaterial?.unit || ''}
                      </span>
                    </div>
                  ))}
                  {ingredientsCount > 3 && !expanded && (
                    <div className="si-rec-more">
                      +{ingredientsCount - 3} {Language.more || 'more'}
                    </div>
                  )}
                </div>

                {ingredientsCount > 3 && (
                  <CButton
                    color="link"
                    size="sm"
                    className="si-rec-expand-btn"
                    onClick={() => toggleExpand(recipe._id)}
                  >
                    <CIcon icon={cilInfo} className="me-1" />
                    {expanded
                      ? Language.hideDetails || 'Hide details'
                      : Language.showAllIngredients || 'Show all'}
                  </CButton>
                )}

                <CCollapse visible={expanded}>
                  <CTable small responsive className="si-rec-table mt-2 mb-0">
                    <CTableHead>
                      <CTableRow>
                        <CTableHeaderCell>{Language.ingredient || 'Ingredient'}</CTableHeaderCell>
                        <CTableHeaderCell className="text-end">
                          {Language.quantity || 'Quantity'}
                        </CTableHeaderCell>
                      </CTableRow>
                    </CTableHead>
                    <CTableBody>
                      {recipe.rawMaterials.map((rm, idx) => (
                        <CTableRow key={idx}>
                          <CTableDataCell>
                            {rm.rawMaterial?.name || Language.unknown || 'Unknown'}
                          </CTableDataCell>{' '}
                          <CTableDataCell className="text-end">
                            {rm.quantityPerUnit} {rm.rawMaterial?.unit || ''}
                          </CTableDataCell>
                        </CTableRow>
                      ))}
                    </CTableBody>
                  </CTable>
                </CCollapse>
              </CCardBody>
            </CCard>
          </CCol>
        )
      })}
    </CRow>
  )
}

export default RecipeListComponent
