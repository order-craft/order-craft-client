import React, { useState, useEffect, useCallback } from 'react'
import {
  CTabPane,
  CCardBody,
  CCard,
  CCardHeader,
  CRow,
  CCol,
  CFormInput,
  CButton,
  CListGroup,
  CListGroupItem,
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CBadge,
  CInputGroup,
  CInputGroupText,
  CTooltip,
  CSpinner,
} from '@coreui/react'
import { fetchRawMaterials } from '../../../helpers/services'
import { useSelector } from 'react-redux'
import translations from '../../../app/Language'
import CIcon from '@coreui/icons-react'
import { cilPlus, cilTrash, cilPencil, cilSearch, cilHome } from '@coreui/icons'

const RawMaterialsTab = ({ activeTab, apiCall, showAlert }) => {
  const t = useSelector((state) => state.language)
  const Language = translations[t]
  const [rawMaterials, setRawMaterials] = useState([])
  const [rmForm, setRmForm] = useState({
    name: '',
    unit: '',
    costPerUnit: '',
    reorderLevel: '',
  })
  const [showEditModal, setShowEditModal] = useState(false)
  const [editForm, setEditForm] = useState({
    id: null,
    name: '',
    unit: '',
    costPerUnit: '',
    reorderLevel: '',
  })
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(false)

  const loadRawMaterials = useCallback(async () => {
    try {
      setLoading(true)
      const data = await fetchRawMaterials(apiCall)
      setRawMaterials(data)
    } catch (err) {
      console.error(err)
      showAlert(Language.materialsLoadError || 'Failed to load materials', 'danger')
    } finally {
      setLoading(false)
    }
  }, [apiCall, showAlert])

  const addRawMaterial = async () => {
    const { name, unit, costPerUnit, reorderLevel } = rmForm
    if (!name || !unit || !costPerUnit || !reorderLevel) {
      showAlert(Language.fillAllFields || 'Please fill all fields', 'danger')
      return
    }
    try {
      await apiCall('/raw-materials', 'POST', {
        name,
        unit,
        costPerUnit: parseFloat(costPerUnit),
        reorderLevel: parseFloat(reorderLevel),
      })
      showAlert(Language.materialAdded || 'Material added successfully')
      setRmForm({ name: '', unit: '', costPerUnit: '', reorderLevel: '' })
      loadRawMaterials()
    } catch (err) {
      console.error(err)
      showAlert(Language.materialAddError || 'Error adding material', 'danger')
    }
  }

  const deleteRawMaterial = async (id) => {
    if (!window.confirm(Language.confirmDelete || 'Are you sure you want to delete this material?'))
      return
    try {
      await apiCall(`/raw-materials/${id}`, 'DELETE')
      showAlert(Language.materialDeleted || 'Material deleted')
      loadRawMaterials()
    } catch (err) {
      console.error(err)
      showAlert(Language.materialDeleteError || 'Error deleting material', 'danger')
    }
  }

  const openEditModal = (material) => {
    setEditForm({
      id: material._id,
      name: material.name,
      unit: material.unit,
      costPerUnit: material.costPerUnit.toString(),
      reorderLevel: material.reorderLevel.toString(),
    })
    setShowEditModal(true)
  }

  const submitEdit = async () => {
    const { id, name, unit, costPerUnit, reorderLevel } = editForm
    if (!name || !unit || !costPerUnit || !reorderLevel) {
      showAlert(Language.fillAllFields || 'Please fill all fields', 'danger')
      return
    }
    try {
      await apiCall(`/raw-materials/${id}`, 'PUT', {
        name,
        unit,
        costPerUnit: parseFloat(costPerUnit),
        reorderLevel: parseFloat(reorderLevel),
      })
      showAlert(Language.materialUpdated || 'Material updated successfully')
      setShowEditModal(false)
      loadRawMaterials()
    } catch (err) {
      console.error(err)
      showAlert(Language.materialUpdateError || 'Error updating material', 'danger')
    }
  }

  const filteredMaterials = rawMaterials.filter((material) =>
    material.name.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  useEffect(() => {
    if (activeTab === 'raw-materials') loadRawMaterials()
  }, [activeTab])

  return (
    <CTabPane visible={activeTab === 'raw-materials'}>
      <CCardBody>
        <CRow className="mb-4">
          <CCol md={8}>
            <CInputGroup>
              <CInputGroupText>
                <CIcon icon={cilSearch} />
              </CInputGroupText>
              <CFormInput
                placeholder={Language.searchMaterials}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </CInputGroup>
          </CCol>
          <CCol md={4} className="d-flex justify-content-end">
            <CBadge color="primary" className="fs-6 p-2">
              {filteredMaterials.length} {Language.items}
            </CBadge>
          </CCol>
        </CRow>

        <CCard className="mb-4">
          <CCardHeader>
            <h5 className="mb-0">
              <CIcon icon={cilPlus} className="me-2" />
              {Language.addRawMaterial}
            </h5>
          </CCardHeader>
          <CCardBody>
            <CRow className="g-3">
              <CCol md={3}>
                <CInputGroup>
                  <CInputGroupText>{Language.name}</CInputGroupText>
                  <CFormInput
                    placeholder={Language.materialName}
                    value={rmForm.name}
                    onChange={(e) => setRmForm({ ...rmForm, name: e.target.value })}
                  />
                </CInputGroup>
              </CCol>
              <CCol md={2}>
                <CInputGroup>
                  <CInputGroupText>{Language.unit}</CInputGroupText>
                  <CFormInput
                    placeholder={Language.unit}
                    value={rmForm.unit}
                    onChange={(e) => setRmForm({ ...rmForm, unit: e.target.value })}
                  />
                </CInputGroup>
              </CCol>
              <CCol md={2}>
                <CInputGroup>
                  <CInputGroupText>{Language.cost}</CInputGroupText>
                  <CFormInput
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder={Language.costPerUnit}
                    value={rmForm.costPerUnit}
                    onChange={(e) => setRmForm({ ...rmForm, costPerUnit: e.target.value })}
                  />
                </CInputGroup>
              </CCol>
              <CCol md={2}>
                <CInputGroup>
                  <CInputGroupText>{Language.reorder}</CInputGroupText>
                  <CFormInput
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder={Language.reorderLevel}
                    value={rmForm.reorderLevel}
                    onChange={(e) => setRmForm({ ...rmForm, reorderLevel: e.target.value })}
                  />
                </CInputGroup>
              </CCol>
              <CCol md={3} className="d-flex align-items-end">
                <CButton color="success" onClick={addRawMaterial} disabled={loading}>
                  {loading ? <CSpinner size="sm" /> : Language.addRawMaterial}
                </CButton>
              </CCol>
            </CRow>
          </CCardBody>
        </CCard>

        {loading && filteredMaterials.length === 0 ? (
          <div className="text-center py-5">
            <CSpinner color="primary" size="sm" />
            <p className="mt-3">{Language.loading}</p>
          </div>
        ) : filteredMaterials.length === 0 ? (
          <CCard>
            <CCardBody className="text-center py-5">
              <CIcon icon={cilHome} size="xl" className="text-muted mb-3" />
              <h5 className="text-muted">{Language.noMaterialsFound}</h5>
            </CCardBody>
          </CCard>
        ) : (
          <CListGroup>
            {filteredMaterials.map((material) => (
              <CListGroupItem
                key={material._id}
                className="d-flex justify-content-between align-items-center"
              >
                <div>
                  <strong>{material.name}</strong>
                  <div className="small text-muted">
                    {Language.cost}: {material.costPerUnit} TND/{material.unit} |{' '}
                    {Language.reorderLevel}: {material.reorderLevel} {material.unit}
                  </div>
                </div>
                <div>
                  <CTooltip content={Language.edit}>
                    <CButton
                      color="warning"
                      variant="outline"
                      size="sm"
                      className="me-2"
                      onClick={() => openEditModal(material)}
                    >
                      <CIcon icon={cilPencil} />
                    </CButton>
                  </CTooltip>
                  <CTooltip content={Language.delete}>
                    <CButton
                      color="danger"
                      variant="outline"
                      size="sm"
                      onClick={() => deleteRawMaterial(material._id)}
                    >
                      <CIcon icon={cilTrash} />
                    </CButton>
                  </CTooltip>
                </div>
              </CListGroupItem>
            ))}
          </CListGroup>
        )}
      </CCardBody>

      <CModal visible={showEditModal} onClose={() => setShowEditModal(false)}>
        <CModalHeader closeButton>
          <CModalTitle>{Language.editRawMaterial}</CModalTitle>
        </CModalHeader>
        <CModalBody>
          <CRow className="g-3">
            <CCol md={12}>
              <CInputGroup>
                <CInputGroupText>{Language.name}</CInputGroupText>
                <CFormInput
                  placeholder={Language.materialName}
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                />
              </CInputGroup>
            </CCol>
            <CCol md={6}>
              <CInputGroup>
                <CInputGroupText>{Language.unit}</CInputGroupText>
                <CFormInput
                  placeholder={Language.unit}
                  value={editForm.unit}
                  onChange={(e) => setEditForm({ ...editForm, unit: e.target.value })}
                />
              </CInputGroup>
            </CCol>
            <CCol md={6}>
              <CInputGroup>
                <CInputGroupText>{Language.cost}</CInputGroupText>
                <CFormInput
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder={Language.costPerUnit}
                  value={editForm.costPerUnit}
                  onChange={(e) => setEditForm({ ...editForm, costPerUnit: e.target.value })}
                />
              </CInputGroup>
            </CCol>
            <CCol md={12}>
              <CInputGroup>
                <CInputGroupText>{Language.reorder}</CInputGroupText>
                <CFormInput
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder={Language.reorderLevel}
                  value={editForm.reorderLevel}
                  onChange={(e) => setEditForm({ ...editForm, reorderLevel: e.target.value })}
                />
              </CInputGroup>
            </CCol>
          </CRow>
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={() => setShowEditModal(false)}>
            {Language.cancel}
          </CButton>
          <CButton color="primary" onClick={submitEdit}>
            {Language.save}
          </CButton>
        </CModalFooter>
      </CModal>
    </CTabPane>
  )
}

export default RawMaterialsTab
