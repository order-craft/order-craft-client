import React, { useState } from 'react'
import {
  Card,
  CardBody,
  CardImg,
  ButtonDropdown,
  DropdownToggle,
  DropdownMenu,
  DropdownItem,
  Input,
  Button,
  Modal,
  ModalBody,
} from 'reactstrap'
import { FaEllipsisH, FaCommentDots } from 'react-icons/fa'
import Reactions from './Reactions'
import { BaseUrl } from '../../helpers/BaseUrl'
import { GetToken } from '../../helpers/GetToken'
import axios from 'axios'
import CommentSection from './CommentSection'

const Post = ({ post, onEdit, onDelete }) => {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [text, setText] = useState('')
  const [showAllComments, setShowAllComments] = useState(false)
  const token = GetToken()
  const reactionsEmojies = ['👍', '❤️', '😋', '😂', '😮', '😢', '😡']
  const toggleModal = () => setIsModalOpen(!isModalOpen)
  const toggleDropdown = () => setDropdownOpen(!dropdownOpen)

  const handlePreviousMedia = () => {
    setCurrentMediaIndex((prevIndex) => (prevIndex === 0 ? post.media.length - 1 : prevIndex - 1))
  }

  const handleNextMedia = () => {
    setCurrentMediaIndex((prevIndex) => (prevIndex === post.media.length - 1 ? 0 : prevIndex + 1))
  }

  // const handleAddComment = () => {
  //   if (newComment.trim()) {
  //     setComments([...comments, newComment])
  //     setNewComment('')
  //   }
  // }
  //adding comment
  const handleAddComment = async (postId) => {
    try {
      const response = await axios.post(
        `${BaseUrl}/posts/${postId}/comment`,
        { text, type: 'User' },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        },
      )
      console.log('comment submitted successfully:', response.data)
    } catch (err) {
      console.error('Error submitting comment:', err)
    }
  }

  const renderMedia = () => {
    if (post.media.length === 1) {
      const item = post.media[0]
      return item.type === 'image' ? (
        <CardImg
          top
          src={item.url}
          alt="Post media"
          style={{
            objectFit: 'cover',
            width: '100%',
            maxHeight: '400px',
            cursor: 'pointer',
            borderRadius: '8px',
            transition: 'transform 0.3s',
          }}
          onClick={toggleModal}
          onMouseEnter={(e) => (e.target.style.transform = 'scale(1.02)')}
          onMouseLeave={(e) => (e.target.style.transform = 'scale(1)')}
        />
      ) : (
        <video
          controls
          src={item.url}
          style={{
            width: '100%',
            maxHeight: '400px',
            cursor: 'pointer',
            borderRadius: '8px',
            transition: 'transform 0.3s',
          }}
          onClick={toggleModal}
          onMouseEnter={(e) => (e.target.style.transform = 'scale(1.02)')}
          onMouseLeave={(e) => (e.target.style.transform = 'scale(1)')}
        />
      )
    } else if (post.media.length === 2) {
      return (
        <div style={{ display: 'flex', gap: '10px' }}>
          {post.media.map((item, index) =>
            item.type === 'image' ? (
              <CardImg
                key={index}
                src={item.url}
                alt={`Media ${index + 1}`}
                style={{
                  objectFit: 'cover',
                  width: '50%',
                  maxHeight: '300px',
                  cursor: 'pointer',
                  borderRadius: '8px',
                  transition: 'transform 0.3s',
                }}
                onClick={() => {
                  setCurrentMediaIndex(index)
                  toggleModal()
                }}
                onMouseEnter={(e) => (e.target.style.transform = 'scale(1.02)')}
                onMouseLeave={(e) => (e.target.style.transform = 'scale(1)')}
              />
            ) : (
              <video
                key={index}
                controls
                src={item.url}
                style={{
                  width: '50%',
                  maxHeight: '300px',
                  cursor: 'pointer',
                  borderRadius: '8px',
                  transition: 'transform 0.3s',
                }}
                onClick={() => {
                  setCurrentMediaIndex(index)
                  toggleModal()
                }}
                onMouseEnter={(e) => (e.target.style.transform = 'scale(1.02)')}
                onMouseLeave={(e) => (e.target.style.transform = 'scale(1)')}
              />
            ),
          )}
        </div>
      )
    } else {
      return (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '10px',
          }}
        >
          {post.media.slice(0, 4).map((item, index) =>
            item.type === 'image' ? (
              <CardImg
                key={index}
                src={item.url}
                alt={`Media ${index + 1}`}
                style={{
                  objectFit: 'cover',
                  width: '100%',
                  maxHeight: '200px',
                  cursor: 'pointer',
                  borderRadius: '8px',
                  transition: 'transform 0.3s',
                }}
                onClick={() => {
                  setCurrentMediaIndex(index)
                  toggleModal()
                }}
                onMouseEnter={(e) => (e.target.style.transform = 'scale(1.02)')}
                onMouseLeave={(e) => (e.target.style.transform = 'scale(1)')}
              />
            ) : (
              <video
                key={index}
                controls
                src={item.url}
                style={{
                  width: '100%',
                  maxHeight: '200px',
                  cursor: 'pointer',
                  borderRadius: '8px',
                  transition: 'transform 0.3s',
                }}
                onClick={() => {
                  setCurrentMediaIndex(index)
                  toggleModal()
                }}
                onMouseEnter={(e) => (e.target.style.transform = 'scale(1.02)')}
                onMouseLeave={(e) => (e.target.style.transform = 'scale(1)')}
              />
            ),
          )}
          {post.media.length > 4 && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgba(0, 0, 0, 0.7)',
                color: '#fff',
                fontSize: '1.5rem',
                borderRadius: '8px',
                cursor: 'pointer',
                position: 'relative',
              }}
              onClick={toggleModal}
            >
              +{post.media.length - 4}
            </div>
          )}
        </div>
      )
    }
  }

  const handleAddReply = async (commentId, replyText) => {
    try {
      const response = await axios.post(
        `${BaseUrl}/posts/${post._id}/reply/${commentId}`,
        { text: replyText, type: 'User' },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        },
      )
      console.log('Replay submitted successfully:', response.data)
    } catch (err) {
      console.error('Error submitting reply:', err)
    }
  }

  return (
    <Card
      style={{
        margin: 'auto',
        marginBottom: '20px',
        maxWidth: '800px',
        borderRadius: '10px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
      }}
    >
      <CardBody style={{ position: 'relative', paddingBottom: '0', padding: '15px' }}>
        <p style={{ fontSize: '1rem', color: '#333', lineHeight: '1.5', marginBottom: '10px' }}>
          {post.summary}
        </p>
        <ButtonDropdown
          isOpen={dropdownOpen}
          toggle={toggleDropdown}
          style={{ position: 'absolute', top: '10px', right: '10px' }}
        >
          <DropdownToggle color="link" style={{ padding: '0', color: '#888', fontSize: '1.2rem' }}>
            <FaEllipsisH />
          </DropdownToggle>
          <DropdownMenu>
            <DropdownItem onClick={onEdit}>Edit</DropdownItem>
            <DropdownItem onClick={onDelete}>Delete</DropdownItem>
          </DropdownMenu>
        </ButtonDropdown>
      </CardBody>

      {post.media && post.media.length > 0 && (
        <div style={{ padding: '15px' }}>{renderMedia()}</div>
      )}

      <CardBody style={{ padding: '15px' }}>
        <span
          style={{
            display: 'block',
            color: '#007bff',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '0.9rem',
          }}
          onClick={() => document.getElementById('comment-section').scrollIntoView()}
        >
          {post.comments.length} Comments
        </span>

        <div id="comment-section" style={{ marginTop: '20px' }}>
          <CommentSection
            post={post}
            handleAddComment={handleAddComment}
            handleAddReply={handleAddReply}
          />
        </div>
      </CardBody>

      <div
        style={{
          padding: '10px 15px',
          borderTop: '1px solid #ddd',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        }}
      >
        <span style={{ flex: '1' }}>
          <Reactions postId={post._id} StoredReaction={post.storedReaction} />
        </span>
        <div style={{ flex: '5', position: 'relative' }}>
          <Input
            type="text"
            placeholder="Write a comment..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            style={{
              width: '100%',
              borderRadius: '20px',
              padding: '10px 15px',
              border: '1px solid #ddd',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            }}
          />
          <FaCommentDots
            size={20}
            style={{
              position: 'absolute',
              right: '10px',
              top: '50%',
              transform: 'translateY(-50%)',
              cursor: 'pointer',
              color: '#007bff',
            }}
            onClick={() => {
              handleAddComment(post._id)
            }}
          />
        </div>
      </div>

      {isModalOpen && (
        <Modal isOpen={isModalOpen} toggle={toggleModal} size="lg">
          <ModalBody style={{ position: 'relative', textAlign: 'center', padding: '20px' }}>
            <Button
              style={{
                position: 'absolute',
                top: '50%',
                left: '5%',
                transform: 'translateY(-50%)',
                background: '#007bff',
                color: '#fff',
                borderRadius: '50%',
                padding: '10px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '1rem',
              }}
              onClick={handlePreviousMedia}
            >
              &#8249;
            </Button>
            {post.media[currentMediaIndex].type === 'image' ? (
              <img
                src={post.media[currentMediaIndex].url}
                alt="Fullscreen Media"
                style={{ maxWidth: '100%', maxHeight: '80vh', borderRadius: '10px' }}
              />
            ) : (
              <video controls style={{ maxWidth: '100%', maxHeight: '80vh', borderRadius: '10px' }}>
                <source src={post.media[currentMediaIndex].url} type="video/mp4" />
                Your browser does not support the video tag.
              </video>
            )}
            <Button
              style={{
                position: 'absolute',
                top: '50%',
                right: '5%',
                transform: 'translateY(-50%)',
                background: '#007bff',
                color: '#fff',
                borderRadius: '50%',
                padding: '10px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '1rem',
              }}
              onClick={handleNextMedia}
            >
              &#8250;
            </Button>
          </ModalBody>
        </Modal>
      )}
    </Card>
  )
}

export default Post
