import React, { useEffect, useState } from 'react'
import {
  CCard,
  CCardBody,
  CRow,
  CCol,
  CSpinner,
  CCardFooter,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
  CButton,
  CForm,
  CFormInput,
  CBadge,
} from '@coreui/react'
import { useNavigate, useParams } from 'react-router-dom'
import axios from 'axios'
import { cilPencil, cilTrash, cilList } from '@coreui/icons'
import CIcon from '@coreui/icons-react'
import { BaseUrl } from '../../../helpers/BaseUrl'
import { useSelector } from 'react-redux'
import translations from '../../../app/Language'

const SectionDetails = () => {
  //language
  const t = useSelector((state) => state.language)
  const Language = translations[t]

  const { sectionId } = useParams() // Get sectionId from URL params
  const [categories, setCategories] = useState(null)
  const [loadingCategories, setLoadingCategories] = useState(false)
  const [error, setError] = useState('')
  const [showEditModal, setShowEditModal] = useState(false)
  const [categoryToEdit, setCategoryToEdit] = useState(null)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false)
  const navigate = useNavigate()

  // Fetch categories for the section
  const fetchCategories = async () => {
    setLoadingCategories(true)
    try {
      const token = localStorage.getItem('token')
      const response = await axios.get(`${BaseUrl}/sections/${sectionId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      setCategories(response.data.categories) // Store the categories of the section
    } catch (err) {
      setError('Error fetching categories')
      console.error(err)
    }
    setLoadingCategories(false)
  }

  useEffect(() => {
    if (sectionId) {
      fetchCategories() // Fetch categories when sectionId is available
    }
  }, [sectionId])

  const handleEditCategory = (category) => {
    setCategoryToEdit(category)
    setNewCategoryName(category.name)
    setShowEditModal(true)
  }

  const handleSaveCategory = async () => {
    try {
      const token = localStorage.getItem('token')
      await axios.put(
        `${BaseUrl}/categories/${categoryToEdit._id}`,
        { name: newCategoryName },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      )
      setShowEditModal(false)
      fetchCategories() // Refresh categories after update
    } catch (err) {
      console.error('Error updating category', err)
    }
  }

  const handleDeleteCategory = async (categoryId) => {
    if (window.confirm('Are you sure you want to delete this category and products within it?')) {
      try {
        const token = localStorage.getItem('token')
        await axios.delete(`${BaseUrl}/categories/${categoryId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
        fetchCategories() // Refresh categories after deletion
      } catch (err) {
        console.error('Error deleting category', err)
      }
    }
  }
  // Add this utility function somewhere in your code
  const getRandomGradient = () => {
    const gradients = [
      '#667eea, #764ba2',
      '#ff758c, #ff7eb3',
      '#4facfe, #00f2fe',
      '#43e97b, #38f9d7',
      '#a18cd1, #fbc2eb',
      '#ffc3a0, #ffafbd',
      '#96fbc4, #f9f586',
    ]
    return gradients[Math.floor(Math.random() * gradients.length)]
  }
  const handleAddCategory = async () => {
    try {
      const token = localStorage.getItem('token')
      await axios.post(
        `${BaseUrl}/categories`,
        { name: newCategoryName, sectionId }, // Send sectionId when adding new category
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      )
      setShowAddCategoryModal(false)
      fetchCategories() // Refresh categories after adding new category
    } catch (err) {
      console.error('Error adding category', err)
    }
  }

  const filteredCategories = categories?.filter((category) =>
    category.name.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  // BaseHub for colors display
  if (loadingCategories) return <CSpinner color="primary" />

  if (error) return <div>{error}</div>

  return (
    <>
      {/* Search Bar and Add Category Button */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-center mb-4 gap-2">
        {/* Search Bar */}
        <CFormInput
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={Language.searchCategories}
          className="mb-2 mb-md-0"
          style={{ width: '100%', maxWidth: '300px' }}
        />

        {/* Add Category Button */}
        <CButton
          color="primary"
          className="btn-sm"
          style={{ width: 'auto' }}
          onClick={() => setShowAddCategoryModal(true)}
        >
          {Language.addNewCategory}
        </CButton>
      </div>

      <CRow className="g-4">
        {filteredCategories?.map((category, index) => (
          <CCol key={index} xs={12} sm={6} md={4} lg={3} className="mb-4">
            <CCard
              className="category-card h-100 border-0"
              onClick={() => navigate(`/menu/categories/${category._id}`)}
            >
              {/* Optional category image placeholder - you can replace with actual image */}
              <div
                className="category-image-placeholder"
                style={{
                  background: `linear-gradient(135deg, ${getRandomGradient()})`,
                  height: '120px',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {category.image ? (
                  <img
                    src={category.image}
                    alt={category.name}
                    className="img-fluid h-100 w-100 object-fit-cover"
                  />
                ) : (
                  <CIcon
                    icon={cilList}
                    size="xxl"
                    className="text-white opacity-25"
                    style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                    }}
                  />
                )}
              </div>

              <CCardBody className="position-relative">
                <h5 className="category-title mb-0">{category.name}</h5>
                <div className="category-badge">
                  <CBadge color="light" className="text-dark small">
                    {category.products.length || 0} {Language.products}
                  </CBadge>
                </div>
                {category.description && (
                  <p className="category-description text-muted small mt-2 mb-0">
                    {category.description}
                  </p>
                )}
              </CCardBody>

              <CCardFooter className="bg-transparent border-0 pt-0">
                <div className="d-flex justify-content-between align-items-center">
                  <div className="category-tags">
                    {category.tags?.slice(0, 2).map((tag, i) => (
                      <CBadge key={i} color="light" className="text-dark me-1 small">
                        #{tag}
                      </CBadge>
                    ))}
                    {category.tags?.length > 2 && (
                      <CBadge color="light" className="text-dark small">
                        +{category.tags.length - 2}
                      </CBadge>
                    )}
                  </div>
                  <div className="action-buttons">
                    <CIcon
                      cursor="pointer"
                      icon={cilPencil}
                      className="text-secondary me-2 action-icon"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleEditCategory(category)
                      }}
                    />
                    <CIcon
                      cursor="pointer"
                      icon={cilTrash}
                      className="text-danger action-icon"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteCategory(category._id)
                      }}
                    />
                  </div>
                </div>
              </CCardFooter>
            </CCard>
          </CCol>
        ))}
      </CRow>

      {/* Edit Category Modal */}
      {showEditModal && (
        <CModal visible={showEditModal} onClose={() => setShowEditModal(false)}>
          <CModalHeader>
            <CModalTitle>{Language.editCategory}</CModalTitle>
          </CModalHeader>
          <CModalBody>
            <CForm>
              <CFormInput
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder={Language.enterNewCategoryName}
              />
            </CForm>
          </CModalBody>
          <CModalFooter>
            <CButton color="secondary" onClick={() => setShowEditModal(false)}>
              {Language.cancel}
            </CButton>
            <CButton color="primary" onClick={handleSaveCategory}>
              {Language.saveChanges}
            </CButton>
          </CModalFooter>
        </CModal>
      )}

      {/* Add Category Modal */}
      {showAddCategoryModal && (
        <CModal visible={showAddCategoryModal} onClose={() => setShowAddCategoryModal(false)}>
          <CModalHeader>
            <CModalTitle>{Language.AddNewCategory}</CModalTitle>
          </CModalHeader>
          <CModalBody>
            <CForm>
              <CFormInput
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder={Language.enterNewCategoryName}
              />
            </CForm>
          </CModalBody>
          <CModalFooter>
            <CButton color="secondary" onClick={() => setShowAddCategoryModal(false)}>
              {Language.cancel}
            </CButton>
            <CButton color="primary" onClick={handleAddCategory}>
              {Language.addCategory}
            </CButton>
          </CModalFooter>
        </CModal>
      )}
    </>
  )
}

export default SectionDetails
