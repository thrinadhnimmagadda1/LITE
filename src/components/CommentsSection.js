import React, { useState, useEffect } from 'react';
import { getComments, addComment } from '../api/comments';

const CommentsSection = ({ itemId }) => {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch comments when component mounts or itemId changes
  useEffect(() => {
    const fetchComments = async () => {
      try {
        setLoading(true);
        const data = await getComments(itemId);
        setComments(Array.isArray(data) ? data : []);
        setError(null);
      } catch (err) {
        console.error('Error fetching comments:', err);
        setError('Failed to load comments');
      } finally {
        setLoading(false);
      }
    };

    fetchComments();
  }, [itemId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      const addedComment = await addComment(newComment, itemId);
      setComments([addedComment, ...comments]);
      setNewComment('');
    } catch (err) {
      console.error('Error adding comment:', err);
      setError('Failed to add comment');
    }
  };

  if (loading) return <div>Loading comments...</div>;

  return (
    <div className="comments-section">
      <h3>Comments</h3>
      
      {/* Comment Form */}
      <form onSubmit={handleSubmit} className="comment-form">
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Add a comment..."
          rows="3"
          className="comment-input"
        />
        <button type="submit" className="comment-submit">
          Post Comment
        </button>
      </form>

      {/* Error Message */}
      {error && <div className="error-message">{error}</div>}

      {/* Comments List */}
      <div className="comments-list">
        {comments.length === 0 ? (
          <p>No comments yet. Be the first to comment!</p>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="comment">
              <p className="comment-content">{comment.content}</p>
              <div className="comment-meta">
                <span className="comment-date">
                  {new Date(comment.createdAt).toLocaleString()}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      <style jsx>{`
        .comments-section {
          max-width: 600px;
          margin: 2rem auto;
          padding: 1rem;
          border: 1px solid #e1e1e1;
          border-radius: 8px;
        }
        .comment-form {
          margin-bottom: 2rem;
        }
        .comment-input {
          width: 100%;
          padding: 0.5rem;
          margin-bottom: 0.5rem;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-family: inherit;
        }
        .comment-submit {
          background-color: #0070f3;
          color: white;
          border: none;
          padding: 0.5rem 1rem;
          border-radius: 4px;
          cursor: pointer;
        }
        .comment-submit:hover {
          background-color: #005bb5;
        }
        .comments-list {
          margin-top: 1rem;
        }
        .comment {
          padding: 1rem;
          margin-bottom: 1rem;
          background-color: #f8f9fa;
          border-radius: 4px;
        }
        .comment-content {
          margin: 0 0 0.5rem 0;
        }
        .comment-meta {
          font-size: 0.8rem;
          color: #666;
        }
        .error-message {
          color: #dc3545;
          margin: 0.5rem 0;
        }
      `}</style>
    </div>
  );
};

export default CommentsSection;
