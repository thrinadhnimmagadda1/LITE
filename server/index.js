const express = require('express');
const cors = require('cors');
const { insertComment, getCommentsByItemId, getAllComments } = require('./db');

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// API Routes
app.get('/api/comments', async (req, res) => {
  try {
    const comments = await getAllComments();
    res.json(comments);
  } catch (error) {
    console.error('Error getting comments:', error);
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
});

app.get('/api/comments/:itemId', async (req, res) => {
  try {
    const { itemId } = req.params;
    const comments = await getCommentsByItemId(itemId);
    res.json(comments);
  } catch (error) {
    console.error('Error getting comments for item:', error);
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
});

app.post('/api/comments', async (req, res) => {
  try {
    const { content, itemId } = req.body;
    if (!content || !itemId) {
      return res.status(400).json({ error: 'Content and itemId are required' });
    }
    
    const result = await insertComment(content, itemId);
    res.status(201).json({ 
      ...result,
      message: 'Comment added successfully' 
    });
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

// Basic error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

// Handle server shutdown gracefully
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
  });
});
