import React, { useState } from 'react'
import { Input, Button } from 'reactstrap'

const CommentSection = ({ post, handleAddReply }) => {
  const [replyText, setReplyText] = useState('')
  const [activeReplyInput, setActiveReplyInput] = useState(null) // Tracks which comment's reply input is visible
  const [visibleComments, setVisibleComments] = useState(2) // Tracks number of visible comments
  const [visibleReplies, setVisibleReplies] = useState(1) // Tracks number of visible comments

  const renderReplies = (replies) => {
    return replies.slice(0, visibleReplies).map((reply, index) => (
      <div
        key={index}
        style={{
          margin: '15px 0',
          padding: '15px',
          borderRadius: '8px',
          backgroundColor: '#f9f9f9',
          boxShadow: '0 2px 5px rgba(0, 0, 0, 0.1)',
          transition: 'transform 0.2s, box-shadow 0.2s',
          borderLeft: '4px solid #007bff',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.02)'
          e.currentTarget.style.boxShadow = '0 4px 10px rgba(0, 0, 0, 0.2)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)'
          e.currentTarget.style.boxShadow = '0 2px 5px rgba(0, 0, 0, 0.1)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              backgroundColor: '#007bff',
              color: '#fff',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              fontWeight: 'bold',
              fontSize: '1rem',
              marginRight: '10px',
            }}
          >
            {reply?.authorDetails?.fullName?.[0]?.toUpperCase()}
          </div>
          <div style={{ fontWeight: '600', fontSize: '1rem', color: '#333' }}>
            {reply?.authorDetails?.fullName || 'Unknown User'}
          </div>
        </div>
        <div style={{ fontSize: '0.9rem', color: '#555', lineHeight: '1.5' }}>{reply.text}</div>
        <div
          style={{
            fontSize: '0.8rem',
            color: '#888',
            marginTop: '10px',
            textAlign: 'right',
          }}
        >
          {new Date(reply.createdAt).toLocaleString()}
        </div>
      </div>
    ))
  }

  const renderComments = () => {
    return post.comments.slice(0, visibleComments).map((comment, index) => (
      <div
        key={index}
        style={{
          marginBottom: '20px',
          padding: '15px',
          borderRadius: '8px',
          backgroundColor: '#f9f9f9',
          boxShadow: '0 2px 5px rgba(0, 0, 0, 0.1)',
          transition: 'transform 0.2s, box-shadow 0.2s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.02)'
          e.currentTarget.style.boxShadow = '0 4px 10px rgba(0, 0, 0, 0.2)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)'
          e.currentTarget.style.boxShadow = '0 2px 5px rgba(0, 0, 0, 0.1)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              backgroundColor: '#007bff',
              color: '#fff',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              fontWeight: 'bold',
              fontSize: '1rem',
              marginRight: '10px',
            }}
          >
            {comment.authorDetails.fullName?.[0]?.toUpperCase()}
          </div>
          <div style={{ fontWeight: '600', fontSize: '1rem', color: '#333' }}>
            {comment.authorDetails.fullName}
          </div>
        </div>
        <div style={{ fontSize: '0.9rem', color: '#555', lineHeight: '1.5', marginBottom: '10px' }}>
          {comment.text}
        </div>
        <div style={{ fontSize: '0.8rem', color: '#888', marginBottom: '10px' }}>
          {new Date(comment.createdAt).toLocaleString()}
        </div>
        <Button
          size="sm"
          color="link"
          style={{
            fontSize: '0.8rem',
            textDecoration: 'none',
            color: '#007bff',
            marginBottom: '10px',
            padding: '0',
          }}
          onClick={() => setActiveReplyInput(activeReplyInput === index ? null : index)}
        >
          Reply
        </Button>

        {/* Show reply input only for the active comment */}
        {activeReplyInput === index && (
          <div style={{ marginTop: '10px', marginLeft: '20px' }}>
            <Input
              type="text"
              placeholder="Write a reply..."
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              style={{
                borderRadius: '20px',
                padding: '10px 15px',
                border: '1px solid #ddd',
                marginBottom: '10px',
                width: '100%',
                boxSizing: 'border-box',
              }}
            />
            <Button
              color="primary"
              size="sm"
              onClick={() => {
                handleAddReply(comment._id, replyText) // Pass comment ID and reply text
                setReplyText('') // Clear reply input
                setActiveReplyInput(null) // Hide reply input
              }}
              style={{ borderRadius: '20px' }}
            >
              Submit Reply
            </Button>
          </div>
        )}

        {/* Render nested replies with a slight indentation */}
        {comment.replies && (
          <div style={{ marginLeft: '20px', marginTop: '15px' }}>
            {renderReplies(comment.replies)}
          </div>
        )}
        <div
          style={{
            textAlign: 'center',
            marginTop: '20px',
            padding: '10px 0',
          }}
        >
          {visibleReplies < comment.replies.length ? (
            <Button
              color="primary"
              size="sm"
              onClick={() => setVisibleReplies(comment.replies.length)}
              style={{
                borderRadius: '20px',
                padding: '8px 20px',
                fontSize: '0.85rem',
                backgroundColor: '#007bff',
                border: 'none',
                color: '#fff',
                cursor: 'pointer',
                transition: 'background-color 0.3s',
              }}
              onMouseEnter={(e) => (e.target.style.backgroundColor = '#0056b3')}
              onMouseLeave={(e) => (e.target.style.backgroundColor = '#007bff')}
            >
              Show More ({comment.replies.length - 1})
            </Button>
          ) : (
            comment.replies.length > 2 && (
              <Button
                color="secondary"
                size="sm"
                onClick={() => setVisibleReplies(1)}
                style={{
                  borderRadius: '20px',
                  padding: '8px 20px',
                  fontSize: '0.85rem',
                  backgroundColor: '#6c757d',
                  border: 'none',
                  color: '#fff',
                  cursor: 'pointer',
                  transition: 'background-color 0.3s',
                }}
                onMouseEnter={(e) => (e.target.style.backgroundColor = '#565e64')}
                onMouseLeave={(e) => (e.target.style.backgroundColor = '#6c757d')}
              >
                Show Less
              </Button>
            )
          )}
        </div>
      </div>
    ))
  }

  return (
    <div>
      {renderComments()}

      {/* Show More/Show Less Section */}
      <div
        style={{
          textAlign: 'center',
          marginTop: '20px',
          padding: '10px 0',
        }}
      >
        {visibleComments < post.comments.length ? (
          <Button
            color="primary"
            size="sm"
            onClick={() => setVisibleComments(post.comments.length)}
            style={{
              borderRadius: '20px',
              padding: '8px 20px',
              fontSize: '0.85rem',
              backgroundColor: '#007bff',
              border: 'none',
              color: '#fff',
              cursor: 'pointer',
              transition: 'background-color 0.3s',
            }}
            onMouseEnter={(e) => (e.target.style.backgroundColor = '#0056b3')}
            onMouseLeave={(e) => (e.target.style.backgroundColor = '#007bff')}
          >
            Show More
          </Button>
        ) : (
          post.comments.length > 2 && (
            <Button
              color="secondary"
              size="sm"
              onClick={() => setVisibleComments(2)}
              style={{
                borderRadius: '20px',
                padding: '8px 20px',
                fontSize: '0.85rem',
                backgroundColor: '#6c757d',
                border: 'none',
                color: '#fff',
                cursor: 'pointer',
                transition: 'background-color 0.3s',
              }}
              onMouseEnter={(e) => (e.target.style.backgroundColor = '#565e64')}
              onMouseLeave={(e) => (e.target.style.backgroundColor = '#6c757d')}
            >
              Show Less
            </Button>
          )
        )}
      </div>
    </div>
  )
}

export default CommentSection
