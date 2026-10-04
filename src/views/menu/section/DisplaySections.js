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
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { cilPencil, cilTrash, cilFolderOpen } from '@coreui/icons'
import CIcon from '@coreui/icons-react'
import { BaseUrl } from '../../../helpers/BaseUrl'
import { useSelector } from 'react-redux'
import translations from '../../../app/Language'
import './section.css'
const Menu = () => {
  const [menu, setMenu] = useState(null)
  const [loadingMenu, setLoadingMenu] = useState(false)
  const [error, setError] = useState('')
  const [showEditModal, setShowEditModal] = useState(false)
  const [sectionToEdit, setSectionToEdit] = useState(null)
  const [newSectionName, setNewSectionName] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [showAddSectionModal, setShowAddSectionModal] = useState(false)
  //language
  const t = useSelector((state) => state.language)
  const Language = translations[t]
  //navigation
  const navigate = useNavigate()

  const fetchMenu = async () => {
    setLoadingMenu(true)
    try {
      const token = localStorage.getItem('token')
      const response = await axios.get(`${BaseUrl}/menu/admin`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      setMenu(response.data)
    } catch (err) {
      setError('Error fetching menu')
      console.error(err)
    }
    setLoadingMenu(false)
  }

  useEffect(() => {
    fetchMenu()
  }, [])

  const handleEditSection = (section) => {
    setSectionToEdit(section)
    setNewSectionName(section.name)
    setShowEditModal(true)
  }

  const handleSaveSection = async () => {
    try {
      const token = localStorage.getItem('token')
      await axios.put(
        `${BaseUrl}/sections/${sectionToEdit._id}`,
        { name: newSectionName },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      )
      setShowEditModal(false)
      fetchMenu()
    } catch (err) {
      console.error('Error updating section', err)
    }
  }

  const handleDeleteSection = async (sectionId) => {
    if (window.confirm('Are you sure you want to delete this section and products within it?')) {
      try {
        const token = localStorage.getItem('token')
        await axios.delete(`${BaseUrl}/sections/${sectionId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
        fetchMenu()
      } catch (err) {
        console.error('Error deleting section', err)
      }
    }
  }

  const handleAddSection = async () => {
    try {
      const token = localStorage.getItem('token')
      await axios.post(
        `${BaseUrl}/sections`,
        { name: newSectionName },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      )
      setShowAddSectionModal(false)
      fetchMenu()
    } catch (err) {
      console.error('Error adding section', err)
    }
  }

  const filteredSections = menu?.sections?.filter((section) =>
    section.name.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  if (loadingMenu) return <CSpinner color="primary" />

  if (error) return <div>{error}</div>

  return (
    <>
      {/* Search Bar and Add Section Button */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-center mb-4">
        {/* Search Bar */}
        <CFormInput
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={Language.search + ' ' + Language.sections}
          className="mb-2 mb-md-0 me-md-2"
          style={{ width: '100%', maxWidth: '300px' }}
        />

        {/* Add Section Button */}
        <CButton
          color="primary"
          className="btn-sm"
          style={{ width: 'auto' }}
          onClick={() => setShowAddSectionModal(true)}
        >
          {Language.newSection}
        </CButton>
      </div>

      {/* Sections display */}
      <CRow className="g-4">
        {filteredSections?.map((section, index) => (
          <CCol key={index} xs={12} sm={6} md={4} lg={3} className="mb-4">
            <CCard
              className="section-card h-100"
              onClick={() => navigate(`/menu/sections/${section._id}`)}
            >
              <CCardBody className="d-flex flex-column justify-content-center">
                <div className="section-icon mb-3">
                  {/* You can replace this with a dynamic icon based on section type */}
                  <CIcon icon={cilFolderOpen} size="xl" className="text-primary" />
                </div>
                <h5 className="section-title">{section.name}</h5>
                {section.description && (
                  <p className="section-description text-muted mb-0">{section.description}</p>
                )}
              </CCardBody>
              <CCardFooter className="bg-transparent border-top-0">
                <div className="d-flex justify-content-between align-items-center">
                  <CBadge color="light" className="text-dark">
                    {section?.categories?.length || 0} {Language.categories}
                  </CBadge>
                  <div className="action-buttons">
                    <CIcon
                      cursor="pointer"
                      icon={cilPencil}
                      className="text-secondary me-2"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleEditSection(section)
                      }}
                    />
                    <CIcon
                      cursor="pointer"
                      icon={cilTrash}
                      className="text-danger"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteSection(section._id)
                      }}
                    />
                  </div>
                </div>
              </CCardFooter>
            </CCard>
          </CCol>
        ))}
      </CRow>

      {/* Edit Section Modal */}
      {showEditModal && (
        <CModal visible={showEditModal} onClose={() => setShowEditModal(false)}>
          <CModalHeader>
            <CModalTitle>{Language.edit + ' ' + Language.section}</CModalTitle>
          </CModalHeader>
          <CModalBody>
            <CForm>
              <CFormInput
                type="text"
                value={newSectionName}
                onChange={(e) => setNewSectionName(e.target.value)}
                placeholder={Language.enterNewSectionName}
              />
            </CForm>
          </CModalBody>
          <CModalFooter>
            <CButton color="secondary" onClick={() => setShowEditModal(false)}>
              {Language.cancel}
            </CButton>
            <CButton color="primary" onClick={handleSaveSection}>
              {Language.save}
            </CButton>
          </CModalFooter>
        </CModal>
      )}

      {/* Add Section Modal */}
      {showAddSectionModal && (
        <CModal visible={showAddSectionModal} onClose={() => setShowAddSectionModal(false)}>
          <CModalHeader>
            <CModalTitle>{Language.AddNewSection}</CModalTitle>
          </CModalHeader>
          <CModalBody>
            <CForm>
              <CFormInput
                type="text"
                value={newSectionName}
                onChange={(e) => setNewSectionName(e.target.value)}
                placeholder={Language.enterNewSectionName}
              />
            </CForm>
          </CModalBody>
          <CModalFooter>
            <CButton color="secondary" onClick={() => setShowAddSectionModal(false)}>
              {Language.cancel}
            </CButton>
            <CButton color="primary" onClick={handleAddSection}>
              {Language.addSection}
            </CButton>
          </CModalFooter>
        </CModal>
      )}
    </>
  )
}

export default Menu
