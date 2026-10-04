import React from 'react'
import PropTypes from 'prop-types'
import {
  CModal,
  CModalHeader,
  CModalBody,
  CModalFooter,
  CForm,
  CFormLabel,
  CFormInput,
  CButton,
  CImage,
  CRow,
  CCol,
  CCard,
  CCardBody,
  CFormText,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilLocationPin, cilBuilding, cilImage, cilSave, cilX } from '@coreui/icons'

const PlaceDetailsModal = ({ visible, onClose, data, onChange, onFileChange, onSave }) => {
  return (
    <CModal
      visible={visible}
      onClose={onClose}
      alignment="center"
      size="lg"
      backdrop="static"
      className="modal-styled"
    >
      <CModalHeader className="bg-gradient-info text-white">
        <CIcon icon={cilBuilding} className="me-2" />
        {data?.placeName ? `Edit ${data.placeName}` : 'Add New Place'}
      </CModalHeader>
      <CModalBody className="p-4">
        <CCard className="shadow-sm mb-4">
          <CCardBody>
            <h5 className="mb-4 text-info">
              <CIcon icon={cilBuilding} className="me-2" />
              Basic Information
            </h5>

            <CRow className="mb-3">
              <CCol md={6}>
                <CFormLabel className="fw-bold">Place Name</CFormLabel>
                <CFormInput
                  type="text"
                  name="placeName"
                  placeholder="Enter place name"
                  value={data?.placeName || ''}
                  onChange={onChange}
                />
              </CCol>
              <CCol md={6}>
                <CFormLabel className="fw-bold">Phone Number</CFormLabel>
                <CFormInput
                  type="text"
                  name="phoneNumber"
                  placeholder="Enter phone number"
                  value={data?.phoneNumber || ''}
                  onChange={onChange}
                />
              </CCol>
            </CRow>

            <CRow className="mb-3">
              <CCol md={12}>
                <CFormLabel className="fw-bold">Address</CFormLabel>
                <CFormInput
                  type="text"
                  name="PlaceAddress"
                  placeholder="Enter full address"
                  value={data?.PlaceAddress || ''}
                  onChange={onChange}
                />
              </CCol>
            </CRow>
          </CCardBody>
        </CCard>

        <CCard className="shadow-sm mb-4">
          <CCardBody>
            <h5 className="mb-4 text-info">
              <CIcon icon={cilImage} className="me-2" />
              Media
            </h5>

            <CRow className="mb-3">
              <CCol md={6}>
                <CFormLabel className="fw-bold">Place Logo</CFormLabel>
                <CFormInput
                  type="file"
                  name="placeLogo"
                  onChange={(e) => onFileChange(e, 'logo')}
                  className="mb-2"
                />
                <CFormText>Recommended size: 200x200px</CFormText>
                {data?.logoPreview && (
                  <div className="mt-2 text-center">
                    <CImage
                      src={data.logoPreview}
                      alt="Logo preview"
                      height={100}
                      className="rounded border p-1 bg-light"
                    />
                  </div>
                )}
              </CCol>
              <CCol md={6}>
                <CFormLabel className="fw-bold">Place Picture</CFormLabel>
                <CFormInput
                  type="file"
                  name="placePicture"
                  onChange={(e) => onFileChange(e, 'place')}
                  className="mb-2"
                />
                <CFormText>Recommended size: 800x600px</CFormText>
                {data?.picturePreview && (
                  <div className="mt-2 text-center">
                    <CImage
                      src={data.picturePreview}
                      alt="Picture preview"
                      height={100}
                      className="rounded border p-1 bg-light"
                    />
                  </div>
                )}
              </CCol>
            </CRow>
          </CCardBody>
        </CCard>

        <CCard className="shadow-sm">
          <CCardBody>
            <h5 className="mb-4 text-info">
              <CIcon icon={cilLocationPin} className="me-2" />
              Location Details
            </h5>

            <CRow className="mb-3">
              <CCol md={4}>
                <CFormLabel className="fw-bold">Distance (m)</CFormLabel>
                <CFormInput
                  type="number"
                  name="distance"
                  placeholder="Enter distance"
                  value={data?.distance || ''}
                  onChange={onChange}
                />
              </CCol>
              <CCol md={4}>
                <CFormLabel className="fw-bold">Latitude</CFormLabel>
                <CFormInput
                  type="text"
                  name="lat"
                  placeholder="Enter latitude"
                  value={data?.lat || ''}
                  onChange={onChange}
                />
              </CCol>
              <CCol md={4}>
                <CFormLabel className="fw-bold">Longitude</CFormLabel>
                <CFormInput
                  type="text"
                  name="long"
                  placeholder="Enter longitude"
                  value={data?.long || ''}
                  onChange={onChange}
                />
              </CCol>
            </CRow>
          </CCardBody>
        </CCard>
      </CModalBody>

      <CModalFooter className="border-top-0">
        <CButton color="secondary" onClick={onClose} variant="outline" shape="rounded-pill">
          <CIcon icon={cilX} className="me-2" />
          Cancel
        </CButton>
        <CButton color="info" onClick={onSave} shape="rounded-pill">
          <CIcon icon={cilSave} className="me-2" />
          Save Place
        </CButton>
      </CModalFooter>
    </CModal>
  )
}

PlaceDetailsModal.propTypes = {
  visible: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
  onChange: PropTypes.func.isRequired,
  onFileChange: PropTypes.func.isRequired,
  data: PropTypes.shape({
    placeName: PropTypes.string,
    PlaceAddress: PropTypes.string,
    phoneNumber: PropTypes.string,
    distance: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    logoPreview: PropTypes.string,
    picturePreview: PropTypes.string,
    lat: PropTypes.string,
    long: PropTypes.string,
  }),
}

export default PlaceDetailsModal
