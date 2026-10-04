import React, { useState, useEffect } from 'react'
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

const UpdatePostModal = ({ isOpen, toggle, post }) => {
  const [postContent, setPostContent] = useState(post ? post.summary : '')
  const [files, setFiles] = useState([])
  const [tempPreviews, setTempPreviews] = useState([])
  const token = GetToken()

  useEffect(() => {
    if (post && post.media) {
      setTempPreviews(post.media.map((media) => media.url))
    }
  }, [post])

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

  // Handle post update submission
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
      const response = await axios.put(`${BaseUrl}/posts/${post._id}`, postPayload, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })
      console.log('Post updated successfully:', response.data)
    } catch (err) {
      console.error('Error updating post:', err)
    }

    // Reset state after submission
    setPostContent('')
    setFiles([])
    setTempPreviews([])
    toggle()
  }

  return (
    <Modal isOpen={isOpen} toggle={toggle} centered>
      <ModalHeader toggle={toggle}>Update Post</ModalHeader>
      <ModalBody>
        <FormGroup>
          <Label for="postContent">Edit your post</Label>
          <Input
            type="textarea"
            id="postContent"
            value={postContent}
            onChange={(e) => setPostContent(e.target.value)}
            placeholder="Update your post..."
          />
        </FormGroup>
        <FormGroup>
          <Label for="fileUpload">Add or update media</Label>
          <Input
            type="file"
            id="fileUpload"
            multiple
            accept="image/*,video/*"
            onChange={handleFileChange}
          />
          <FormText color="muted">You can add new images or videos.</FormText>
        </FormGroup>
        <div className="preview-container">
          {tempPreviews.map((preview, index) => (
            <div key={index} className="preview-item">
              {files[index]?.type?.startsWith('image/') ? (
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
          Update
        </Button>
        <Button color="secondary" onClick={toggle}>
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  )
}

export default UpdatePostModal
