import React, { useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import { CButton, CFormInput, CFormSwitch, CModal, CModalBody, CModalFooter } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilBuilding, cilLocationPin, cilImage, cilSave, cilX, cilCheck } from '@coreui/icons'
import './profile.css'

const PlaceDetailsModal = ({ visible, onClose, data, onChange, onFileChange, onSave }) => {
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (visible) setSaving(false)
  }, [visible])

  const brandColor = data?.brandColor || '#8B5A2B'
  const statusFlow = data?.statusFlowEnabled === undefined ? true : data.statusFlowEnabled

  const handleSave = async () => {
    setSaving(true)
    try {
      await onSave()
    } finally {
      setSaving(false)
    }
  }

  return (
    <CModal
      visible={visible}
      onClose={onClose}
      alignment="center"
      size="lg"
      backdrop="static"
      className="pf-modal"
    >
      {/* ---------- Header ---------- */}
      <div className="pf-modal-header">
        <h5 className="pf-modal-title">
          <CIcon icon={cilBuilding} />
          {data?.placeName ? `Edit ${data.placeName}` : 'Business details'}
        </h5>
        <button type="button" className="pf-modal-close" onClick={onClose} aria-label="Close">
          &times;
        </button>
      </div>

      {/* ---------- Body ---------- */}
      <CModalBody className="pf-modal-body">
        {/* Basic info */}
        <div className="pf-section">
          <div className="pf-section-title">Basic information</div>

          <div className="pf-grid-2">
            <div>
              <label className="pf-field-label" htmlFor="pf-place-name">
                Place name
              </label>
              <CFormInput
                id="pf-place-name"
                type="text"
                name="placeName"
                placeholder="e.g. The Corner Cafe"
                value={data?.placeName || ''}
                onChange={onChange}
              />
            </div>
            <div>
              <label className="pf-field-label" htmlFor="pf-place-phone">
                Phone number
              </label>
              <CFormInput
                id="pf-place-phone"
                type="text"
                name="phoneNumber"
                placeholder="e.g. +216 71 123 456"
                value={data?.phoneNumber || ''}
                onChange={onChange}
              />
            </div>
          </div>

          <label className="pf-field-label" htmlFor="pf-place-address" style={{ marginTop: 14 }}>
            Address
          </label>
          <CFormInput
            id="pf-place-address"
            type="text"
            name="PlaceAddress"
            placeholder="Street, city, postcode"
            value={data?.PlaceAddress || ''}
            onChange={onChange}
          />
        </div>

        {/* Brand color */}
        <div className="pf-section">
          <div className="pf-section-title">Brand color</div>
          <div className="pf-color-row">
            <div className="pf-color-preview-wrap">
              <div className="pf-color-preview" style={{ background: brandColor }} />
              <div className="pf-color-hex">{brandColor}</div>
            </div>
            <div className="pf-color-input-wrap">
              <input
                type="color"
                name="brandColor"
                value={brandColor}
                onChange={onChange}
                className="pf-color-input"
                aria-label="Brand color"
              />
              <div className="pf-color-hint">
                Shown to your customers in the ordering app — section tiles, price highlights,
                buttons.
              </div>
            </div>
          </div>
        </div>

        {/* Media */}
        <div className="pf-section">
          <div className="pf-section-title">Media</div>
          <div className="pf-grid-2">
            <div className="pf-media-cell">
              <label className="pf-field-label" htmlFor="pf-logo-upload">
                Place logo
              </label>
              <input
                id="pf-logo-upload"
                type="file"
                accept="image/*"
                onChange={(e) => onFileChange(e, 'logo')}
                style={{ display: 'none' }}
              />
              <label htmlFor="pf-logo-upload" className="pf-upload-area">
                {data?.logoPreview ? (
                  <img
                    src={data.logoPreview}
                    alt="Logo preview"
                    className="pf-upload-preview is-square"
                  />
                ) : (
                  <>
                    <CIcon icon={cilImage} className="pf-upload-icon" />
                    <span className="pf-upload-text">Click to upload</span>
                  </>
                )}
              </label>
              <div className="pf-upload-hint">Square, ideally 200×200px.</div>
            </div>

            <div className="pf-media-cell">
              <label className="pf-field-label" htmlFor="pf-picture-upload">
                Place picture
              </label>
              <input
                id="pf-picture-upload"
                type="file"
                accept="image/*"
                onChange={(e) => onFileChange(e, 'place')}
                style={{ display: 'none' }}
              />
              <label htmlFor="pf-picture-upload" className="pf-upload-area">
                {data?.picturePreview ? (
                  <img
                    src={data.picturePreview}
                    alt="Place preview"
                    className="pf-upload-preview"
                  />
                ) : (
                  <>
                    <CIcon icon={cilImage} className="pf-upload-icon" />
                    <span className="pf-upload-text">Click to upload</span>
                  </>
                )}
              </label>
              <div className="pf-upload-hint">Wide landscape, ideally 800×600px.</div>
            </div>
          </div>
        </div>

        {/* Location */}
        <div className="pf-section">
          <div className="pf-section-title">
            <CIcon icon={cilLocationPin} /> Location
          </div>
          <div className="pf-grid-3">
            <div>
              <label className="pf-field-label" htmlFor="pf-distance">
                Distance (m)
              </label>
              <CFormInput
                id="pf-distance"
                type="number"
                name="distance"
                placeholder="e.g. 300"
                value={data?.distance || ''}
                onChange={onChange}
              />
            </div>
            <div>
              <label className="pf-field-label" htmlFor="pf-lat">
                Latitude
              </label>
              <CFormInput
                id="pf-lat"
                type="text"
                name="lat"
                placeholder="e.g. 36.8310"
                value={data?.lat || ''}
                onChange={onChange}
              />
            </div>
            <div>
              <label className="pf-field-label" htmlFor="pf-long">
                Longitude
              </label>
              <CFormInput
                id="pf-long"
                type="text"
                name="long"
                placeholder="e.g. 10.2304"
                value={data?.long || ''}
                onChange={onChange}
              />
            </div>
          </div>
          <p className="pf-modal-note" style={{ textAlign: 'left' }}>
            Distance is the maximum allowed radius (in meters) between a guest's device and your
            café when they scan the QR code.
          </p>
        </div>

        {/* Order workflow */}
        <div className="pf-section">
          <div className="pf-section-title">Order workflow</div>
          <div className="pf-switch-row">
            <div className="pf-switch-text">
              <div className="pf-switch-title">Enable order status tracking</div>
              <div className="pf-switch-hint">
                On: orders flow through Pending → Preparing → Completed. Off: new orders are marked
                as "Placed" directly and staff only handle payment.
              </div>
            </div>
            <CFormSwitch
              id="statusFlowEnabledSwitch"
              checked={statusFlow}
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
        </div>
      </CModalBody>

      {/* ---------- Footer ---------- */}
      <CModalFooter className="pf-modal-footer">
        <CButton color="secondary" variant="outline" onClick={onClose} disabled={saving}>
          <CIcon icon={cilX} className="me-2" />
          Cancel
        </CButton>
        <CButton color="primary" onClick={handleSave} disabled={saving}>
          {saving ? (
            <>Saving…</>
          ) : (
            <>
              <CIcon icon={cilCheck} className="me-2" />
              Save changes
            </>
          )}
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
  }),
}

export default PlaceDetailsModal
