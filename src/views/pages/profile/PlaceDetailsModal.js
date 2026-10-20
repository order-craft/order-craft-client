import React from 'react'
import PropTypes from 'prop-types'
import { useSelector } from 'react-redux'
import translations from '../../../app/Language'
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
  CFormSwitch,
  CFormSelect,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilLocationPin, cilBuilding, cilImage, cilSave, cilX } from '@coreui/icons'

const PlaceDetailsModal = ({ visible, onClose, data, onChange, onFileChange, onSave }) => {
  const t = useSelector((state) => state.language)
  const Language = translations[t]
  // When status tracking is off, every order is already born "completed"
  // regardless of preparationMode (see createOrder) — the setting has no
  // effect, so disable it instead of letting the admin pick a no-op value.
  const statusFlowOn = data?.statusFlowEnabled === undefined ? true : data.statusFlowEnabled
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
            <h5 className="mb-4 text-info">Brand color</h5>
            <CRow className="align-items-center">
              <CCol md={4}>
                <CFormInput
                  type="color"
                  name="brandColor"
                  value={data?.brandColor || '#8B5A2B'}
                  onChange={onChange}
                  style={{ height: 48, padding: 4, cursor: 'pointer' }}
                />
              </CCol>
              <CCol md={8}>
                <CFormText>
                  This is the accent color shown to your customers in the ordering app (section
                  tiles, highlights). Pick something that matches your brand.
                </CFormText>
                <div
                  style={{
                    marginTop: 8,
                    fontSize: '0.85rem',
                    color: '#6c757d',
                  }}
                >
                  Current: <strong>{data?.brandColor || '#8B5A2B'}</strong>
                </div>
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
        <CCard className="shadow-sm mt-4">
          <CCardBody>
            <h5 className="mb-3 text-info">Order Workflow</h5>
            <div className="d-flex justify-content-between align-items-center">
              <div className="pe-3">
                <div className="fw-bold">Enable order status tracking</div>
                <CFormText>
                  When on, orders go through Pending → Preparing → Completed. When off, orders are
                  placed directly as &quot;Placed&quot; and the staff only handle payment.
                </CFormText>
              </div>
              <CFormSwitch
                id="statusFlowEnabledSwitch"
                checked={data?.statusFlowEnabled === undefined ? true : data.statusFlowEnabled}
                onChange={(e) =>
                  onChange({
                    target: {
                      name: 'statusFlowEnabled',
                      value: e.target.checked,
                    },
                  })
                }
              />
            </div>

            <hr className="my-4" />

            <div className="pe-3 mb-2">
              <div className="fw-bold">Order delivery mode</div>
              <CFormText>
                <strong>Existing Workflow</strong> keeps today&apos;s behavior — a ready order is
                delivered by its assigned table server (or an admin).{' '}
                <strong>Shared Delivery Workflow</strong> lets any active, service-enabled staff
                member claim a ready order regardless of table assignment — first to accept it owns
                the delivery.
              </CFormText>
            </div>
            <CFormSelect
              id="orderWorkflowModeSelect"
              value={data?.orderWorkflowMode || 'existing'}
              onChange={(e) =>
                onChange({
                  target: {
                    name: 'orderWorkflowMode',
                    value: e.target.value,
                  },
                })
              }
            >
              <option value="existing">Existing Workflow (currently active by default)</option>
              <option value="shared_delivery">Shared Delivery Workflow</option>
            </CFormSelect>
            <div className="mt-2" style={{ fontSize: '0.85rem', color: '#6c757d' }}>
              Active mode:{' '}
              <strong>
                {data?.orderWorkflowMode === 'shared_delivery'
                  ? 'Shared Delivery Workflow'
                  : 'Existing Workflow'}
              </strong>
            </div>

            <hr className="my-4" />

            <div className="pe-3 mb-2">
              <div className="fw-bold">
                {Language?.preparationWorkflow || 'Preparation Workflow'}
              </div>
              <CFormText>
                {Language?.preparationModeHint ||
                  'Preparation Required keeps the kitchen workflow — preparation staff mark orders ready before service staff are notified. Direct Service skips that step: orders become eligible for service the moment they are placed.'}
              </CFormText>
              {!statusFlowOn && (
                <CFormText className="d-block mt-1" style={{ color: '#a06a1f' }}>
                  Disabled while &quot;Enable order status tracking&quot; is off — every order is
                  already placed directly, so this setting has no effect.
                </CFormText>
              )}
            </div>
            <CFormSelect
              id="preparationModeSelect"
              value={data?.preparationMode || 'required'}
              disabled={!statusFlowOn}
              onChange={(e) =>
                onChange({
                  target: {
                    name: 'preparationMode',
                    value: e.target.value,
                  },
                })
              }
            >
              <option value="required">
                {Language?.preparationRequired || 'Preparation Required'}
              </option>
              <option value="direct_service">
                {Language?.directService || 'Direct Service (No Preparation Step)'}
              </option>
            </CFormSelect>
            <div className="mt-2" style={{ fontSize: '0.85rem', color: '#6c757d' }}>
              Active mode:{' '}
              <strong>
                {!statusFlowOn
                  ? Language?.placed || 'Placed'
                  : data?.preparationMode === 'direct_service'
                    ? Language?.directService || 'Direct Service (No Preparation Step)'
                    : Language?.preparationRequired || 'Preparation Required'}
              </strong>
            </div>
          </CCardBody>
        </CCard>

        <CCard className="shadow-sm mt-4">
          <CCardBody>
            <h5 className="mb-3 text-info">Staff Participation</h5>
            <div className="d-flex justify-content-between align-items-center">
              <div className="pe-3">
                <div className="fw-bold">Notify me like staff</div>
                <CFormText>
                  When on, you&apos;ll be notified for &quot;need something&quot; requests from
                  tables assigned to you, and for new-order/order-ready alerts on those tables, the
                  same way a staff member is.
                </CFormText>
              </div>
              <CFormSwitch
                id="participatesInServiceSwitch"
                checked={!!data?.participatesInService}
                onChange={(e) =>
                  onChange({
                    target: {
                      name: 'participatesInService',
                      value: e.target.checked,
                    },
                  })
                }
              />
            </div>
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
    statusFlowEnabled: PropTypes.bool,
    brandColor: PropTypes.string,
    participatesInService: PropTypes.bool,
    orderWorkflowMode: PropTypes.string,
    preparationMode: PropTypes.string,
  }),
}

export default PlaceDetailsModal
