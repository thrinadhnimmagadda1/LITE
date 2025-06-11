const { Sequelize, DataTypes } = require('sequelize');
const dbConfig = require('./config/db.config');

// Initialize Sequelize with SQLite
const sequelize = new Sequelize({
  dialect: dbConfig.dialect,
  storage: dbConfig.storage,
  logging: dbConfig.logging
});

// Define the Comment model
const Comment = sequelize.define('Comment', {
  content: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  itemId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'item_id'
  }
}, {
  tableName: 'comments',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false
});

// Initialize the database and create tables if they don't exist
async function initializeDatabase() {
  try {
    await sequelize.authenticate();
    await sequelize.sync({ force: false }); // Set force: true to drop and recreate tables
    console.log('Database connected and synced');
  } catch (error) {
    console.error('Unable to connect to the database:', error);
    throw error;
  }
}

// Initialize the database when this module is loaded
initializeDatabase().catch(console.error);

// Comment related functions
async function insertComment(content, itemId) {
  try {
    const comment = await Comment.create({ content, itemId });
    return {
      id: comment.id,
      content: comment.content,
      item_id: comment.itemId,
      created_at: comment.created_at
    };
  } catch (error) {
    console.error('Error inserting comment:', error);
    throw error;
  }
}

async function getCommentsByItemId(itemId) {
  try {
    const comments = await Comment.findAll({
      where: { itemId },
      order: [['created_at', 'DESC']],
      raw: true
    });
    return comments;
  } catch (error) {
    console.error('Error fetching comments by item ID:', error);
    throw error;
  }
}

// Close the database when the application shuts down
process.on('SIGINT', () => {
  db.close();
  process.exit(0);
});

module.exports = {
  insertComment,
  getCommentsByItemId,
  getAllComments
};
