import React, { useState } from 'react'
import {
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Input,
  FormGroup,
  Label,
  FormText,
} from 'reactstrap'
import 'bootstrap/dist/css/bootstrap.min.css'
import './CreatePostModal.css'
import axios from 'axios'
import { GetToken } from '../../../helpers/GetToken'
import { BaseUrl } from '../../../helpers/BaseUrl'

const CreatePostModal = ({ isOpen, toggle }) => {
  const [postContent, setPostContent] = useState('')
  const [files, setFiles] = useState([])
  const [tempPreviews, setTempPreviews] = useState([])
  const token = GetToken()

  // Handle file selection
  const handleFileChange = (event) => {
    const selectedFiles = Array.from(event.target.files)
    const previews = selectedFiles.map((file) => URL.createObjectURL(file))

    setFiles((prevFiles) => [...prevFiles, ...selectedFiles])
    setTempPreviews((prevPreviews) => [...prevPreviews, ...previews])
  }

  // Remove a selected file
  const handleRemoveFile = (index) => {
    setFiles((prevFiles) => prevFiles.filter((_, i) => i !== index))
    setTempPreviews((prevPreviews) => prevPreviews.filter((_, i) => i !== index))
  }

  // Handle post submission
  const handleSubmit = async () => {
    const fileData = files.map((file) => {
      const reader = new FileReader()
      return new Promise((resolve) => {
        reader.onloadend = () => resolve(reader.result)
        reader.readAsDataURL(file)
      })
    })

    const encodedFiles = await Promise.all(fileData)

    const postPayload = {
      summary: postContent,
      files: encodedFiles,
    }

    try {
      const response = await axios.post(`${BaseUrl}/posts`, postPayload, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })
      console.log('Post submitted successfully:', response.data)
    } catch (err) {
      console.error('Error submitting post:', err)
    }

    // Reset state after submission
    setPostContent('')
    setFiles([])
    setTempPreviews([])
    toggle()
  }

  return (
    <Modal isOpen={isOpen} toggle={toggle} centered>
      <ModalHeader toggle={toggle}>Create Post</ModalHeader>
      <ModalBody>
        <FormGroup>
          <Label for="postContent">What's on your mind?</Label>
          <Input
            type="textarea"
            id="postContent"
            value={postContent}
            onChange={(e) => setPostContent(e.target.value)}
            placeholder="Write something..."
          />
        </FormGroup>
        <FormGroup>
          <Label for="fileUpload">Add to your post</Label>
          <Input
            type="file"
            id="fileUpload"
            multiple
            accept="image/*,video/*"
            onChange={handleFileChange}
          />
          <FormText color="muted">You can add images or videos.</FormText>
        </FormGroup>
        <div className="preview-container">
          {tempPreviews.map((preview, index) => (
            <div key={index} className="preview-item">
              {files[index]?.type.startsWith('image/') ? (
                <img src={preview} alt="preview" className="preview-image" />
              ) : (
                <video src={preview} controls className="preview-video" />
              )}
              <Button close aria-label="Close" onClick={() => handleRemoveFile(index)} />
            </div>
          ))}
        </div>
      </ModalBody>
      <ModalFooter>
        <Button color="primary" onClick={handleSubmit}>
          Post
        </Button>
        <Button color="secondary" onClick={toggle}>
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  )
}

export default CreatePostModal
