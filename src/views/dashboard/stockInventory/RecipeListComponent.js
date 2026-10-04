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
import { cilPencil, cilTrash, cilInfo, cilPlus, cilRestaurant } from '@coreui/icons'

const RecipeListComponent = ({ recipes, onEdit, onDelete, loading }) => {
  const t = useSelector((state) => state.language)
  const Language = translations[t]
  const [expandedRecipes, setExpandedRecipes] = useState(new Set())

  const toggleExpand = (recipeId) => {
    setExpandedRecipes((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(recipeId)) {
        newSet.delete(recipeId)
      } else {
        newSet.add(recipeId)
      }
      return newSet
    })
  }

  const isExpanded = (recipeId) => expandedRecipes.has(recipeId)

  if (loading) {
    return (
      <div className="text-center py-5">
        <CSpinner color="primary" size="sm" />
        <p className="mt-3">{Language.loadingRecipes}</p>
      </div>
    )
  }

  if (recipes.length === 0) {
    return (
      <CCard className="text-center">
        <CCardBody className="py-5">
          <CIcon icon={cilRestaurant} size="xl" className="text-muted mb-3" />
          <h5 className="text-muted">{Language.noRecipesFound}</h5>
          <p className="text-muted">{Language.createYourFirstRecipe}</p>
        </CCardBody>
      </CCard>
    )
  }

  return (
    <CRow className="g-3">
      {recipes.map((recipe) => (
        <CCol key={recipe._id} xs={12} lg={6} xl={4}>
          <CCard className="h-100 shadow-sm">
            <CCardHeader className="d-flex justify-content-between align-items-center">
              <div className="d-flex align-items-center">
                <h6 className="mb-0 fw-bold text-truncate" style={{ maxWidth: '200px' }}>
                  {recipe.product?.name}
                </h6>
                <CBadge color="info" className="ms-2">
                  {recipe.rawMaterials.length} {Language.ingredients}
                </CBadge>
              </div>
              <div className="d-flex gap-2">
                <CTooltip content={Language.edit}>
                  <CButton color="warning" variant="ghost" size="sm" onClick={() => onEdit(recipe)}>
                    <CIcon icon={cilPencil} />
                  </CButton>
                </CTooltip>
                <CTooltip content={Language.delete}>
                  <CButton
                    color="danger"
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(recipe._id)}
                  >
                    <CIcon icon={cilTrash} />
                  </CButton>
                </CTooltip>
              </div>
            </CCardHeader>

            <CCardBody>
              <div className="mb-3">
                {recipe.rawMaterials.slice(0, 2).map((rm, idx) => (
                  <div key={idx} className="d-flex justify-content-between mb-2">
                    <span className="fw-medium">{rm.rawMaterial?.name}</span>
                    <span className="text-muted">
                      {rm.quantityPerUnit} {rm.rawMaterial?.unit}
                    </span>
                  </div>
                ))}
                {recipe.rawMaterials.length > 2 && !isExpanded(recipe._id) && (
                  <div className="text-center text-muted small">
                    +{recipe.rawMaterials.length - 2} {Language.moreIngredients}
                  </div>
                )}
              </div>

              <CButton
                color="link"
                size="sm"
                className="p-0 d-flex align-items-center"
                onClick={() => toggleExpand(recipe._id)}
              >
                <CIcon icon={cilInfo} className="me-1" />
                {isExpanded(recipe._id) ? Language.hideDetails : Language.showAllIngredients}
              </CButton>

              <CCollapse visible={isExpanded(recipe._id)}>
                <CTable small responsive className="mt-3">
                  <CTableHead>
                    <CTableRow>
                      <CTableHeaderCell>{Language.ingredient}</CTableHeaderCell>
                      <CTableHeaderCell className="text-end">{Language.quantity}</CTableHeaderCell>
                    </CTableRow>
                  </CTableHead>
                  <CTableBody>
                    {recipe.rawMaterials.map((rm, idx) => (
                      <CTableRow key={idx}>
                        <CTableDataCell>{rm.rawMaterial?.name}</CTableDataCell>
                        <CTableDataCell className="text-end">
                          {rm.quantityPerUnit} {rm.rawMaterial?.unit}
                        </CTableDataCell>
                      </CTableRow>
                    ))}
                  </CTableBody>
                </CTable>
              </CCollapse>
            </CCardBody>
          </CCard>
        </CCol>
      ))}
    </CRow>
  )
}

export default RecipeListComponent
