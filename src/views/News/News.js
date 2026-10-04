import React, { useState, useEffect } from 'react'
import { Button, Row, Col, Spinner, Alert } from 'reactstrap'
import InfiniteScroll from 'react-infinite-scroll-component'
import axios from 'axios'
import 'bootstrap/dist/css/bootstrap.min.css'
import CreatePostModal from '../News/Modals/CreatePostModel'
import PostCard from './postCard' // Import the PostCard component
import { BaseUrl } from '../../helpers/BaseUrl'
import './News.css'
import UpdatePostModal from './Modals/UpdatePostCardModal'
const News = () => {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [error, setError] = useState('')

  const token = localStorage.getItem('token')

  // Fetch posts by page
  const fetchPosts = async (pageNumber = 1) => {
    try {
      setLoading(true)
      setError('')
      const response = await axios.get(`${BaseUrl}/posts?page=${pageNumber}&limit=10`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      console.log(response.data)
      if (response.data.length > 0) {
        setPosts((prevPosts) => [...prevPosts, ...response.data])
      } else {
        setHasMore(false) // No more posts to load
      }
      setLoading(false)
    } catch (err) {
      setLoading(false)
      setError('Failed to fetch posts. Please try again later.')
    }
  }

  useEffect(() => {
    fetchPosts(page)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page])

  const toggleModal = () => {
    setModalOpen(!modalOpen)
  }

  const fetchMorePosts = () => {
    setPage((prevPage) => prevPage + 1)
  }

  //delete post
  const handleDeletePost = async (postId) => {
    if (window.confirm('Are you sure you want to delete this post?')) {
      try {
        await axios.delete(`${BaseUrl}/posts/${postId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
        // Update the posts array by removing the deleted post
        setPosts((prevPosts) => prevPosts.filter((post) => post._id !== postId))
      } catch (err) {
        console.error('Error deleting product', err)
      }
    }
  }
  const [postToUpdate, setPostToUpdate] = useState(null)
  const [isUpdateOpen, setIsUpdateOpen] = useState(false)
  const toggleUpdate = () => {
    setIsUpdateOpen(!isUpdateOpen)
  }
  const HandleUpdateModal = (post) => {
    console.log(post)
    setPostToUpdate(post)
    toggleUpdate()
  }

  return (
    <div className="container mt-4">
      <Button color="primary" className="mb-3" onClick={toggleModal}>
        Add New Post
      </Button>

      {/* {loading && !posts.length && (
        <div className="text-center">
          <Spinner color="primary" />
        </div>
      )} */}

      {error && (
        <Alert color="danger" className="text-center">
          {error}
        </Alert>
      )}
      <div>
        <InfiniteScroll
          dataLength={posts.length}
          next={fetchMorePosts}
          hasMore={hasMore}
          loader={
            <div className="text-center">
              <Spinner color="primary" />
            </div>
          }
          endMessage={
            <p style={{ textAlign: 'center', marginTop: '20px' }}>
              <b>No more posts to load</b>
            </p>
          }
          style={{ overflow: 'hidden' }}
        >
          <Row className="no-gutters">
            {posts.map((post, index) => (
              <Col lg="12" md="12" sm="12" className="mb-4" key={index}>
                <PostCard
                  post={post}
                  onEdit={() => HandleUpdateModal(post)}
                  onDelete={() => handleDeletePost(post._id)}
                />
              </Col>
            ))}
          </Row>
        </InfiniteScroll>
      </div>

      <CreatePostModal isOpen={modalOpen} toggle={toggleModal} />
      <UpdatePostModal post={postToUpdate} isOpen={isUpdateOpen} toggle={toggleUpdate} />

      {message && (
        <Alert color="info" className="text-center mt-3">
          {message}
        </Alert>
      )}
    </div>
  )
}

export default News
