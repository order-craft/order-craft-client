import React, { useState, useEffect, useRef } from 'react'
import './Reactions.css'
import { FaThumbsUp } from 'react-icons/fa'
import axios from 'axios'
import { BaseUrl } from '../../helpers/BaseUrl'
import { GetToken } from '../../helpers/GetToken'

const reactionsEmojies = ['👍', '❤️', '😋', '😂', '😮', '😢', '😡']

const Reactions = ({ postId, StoredReaction }) => {
  const [showReactions, setShowReactions] = useState(false)
  const [selectedReaction, setSelectedReaction] = useState(null) // Default reaction
  const touchTimeout = useRef(null)
  const token = GetToken()

  // Map emoji to backend reaction type
  const mapTypeToEmoji = {
    like: '👍',
    love: '❤️',
    yummy: '😋',
    haha: '😂',
    wow: '😮',
    sad: '😢',
    angry: '😡',
  }

  const mapEmojiToType = {
    '👍': 'like',
    '❤️': 'love',
    '😋': 'yummy',
    '😂': 'haha',
    '😮': 'wow',
    '😢': 'sad',
    '😡': 'angry',
  }

  // Set the default reaction based on StoredReaction
  useEffect(() => {
    if (StoredReaction) {
      setSelectedReaction(mapTypeToEmoji[StoredReaction] || null)
    }
  }, [StoredReaction])

  // Handle long press for mobile devices
  const handleTouchStart = () => {
    touchTimeout.current = setTimeout(() => {
      setShowReactions(true)
    }, 500) // 500ms for a long press
  }

  const handleTouchEnd = () => {
    if (touchTimeout.current) {
      clearTimeout(touchTimeout.current)
    }
  }

  const handleReactionClick = async (emoji) => {
    try {
      if (selectedReaction === emoji) {
        // Remove reaction if it's the same as the selected one
        const response = await axios.post(
          `${BaseUrl}/posts/${postId}/reactions`,
          {
            type: mapEmojiToType[emoji],
            userType: 'User',
          },
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          },
        )
        console.log(response.data.message)
        setSelectedReaction(null) // Clear reaction graphically
      } else {
        // Add or update reaction
        const response = await axios.post(
          `${BaseUrl}/posts/${postId}/reactions`,
          {
            type: mapEmojiToType[emoji],
            userType: 'User',
          },
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          },
        )
        console.log(response.data.message)
        setSelectedReaction(emoji) // Update the UI with the selected reaction
      }

      setShowReactions(false) // Hide reactions after clicking one
    } catch (error) {
      console.error('Error adding or removing reaction:', error || error.message)
    }
  }

  return (
    <div
      className="reactions-container"
      onMouseEnter={() => setShowReactions(true)}
      onMouseLeave={() => setShowReactions(false)}
    >
      <button className="like-button" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
  {selectedReaction || <FaThumbsUp />} {selectedReaction ? mapEmojiToType[selectedReaction] : 'Like'}
</button>

      {showReactions && (
        <div className="reactions-popup">
          {reactionsEmojies.map((emoji, index) => (
            <span key={index} className="reaction-emoji" onClick={() => handleReactionClick(emoji)}>
              {emoji}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

export default Reactions
