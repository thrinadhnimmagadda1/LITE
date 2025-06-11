const mysql = require('mysql2/promise');
const dbConfig = require('./config/db.config');

// Create a connection pool
const pool = mysql.createPool({
  host: dbConfig.HOST,
  user: dbConfig.USER,
  password: dbConfig.PASSWORD,
  database: dbConfig.DB,
  waitForConnections: true,
  connectionLimit: dbConfig.pool.max,
  queueLimit: 0
});

// Initialize the database
async function initializeDatabase() {
  try {
    // Create database if not exists
    const connection = await mysql.createConnection({
      host: dbConfig.HOST,
      user: dbConfig.USER,
      password: dbConfig.PASSWORD
    });

    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbConfig.DB}\`;`);
    await connection.end();

    // Create table if not exists
    const [rows] = await pool.query(`
      CREATE TABLE IF NOT EXISTS comments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        content TEXT NOT NULL,
        itemId VARCHAR(255) NOT NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    console.log('Database and tables initialized');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
}

// Initialize the database when this module is imported
initializeDatabase().catch(console.error);

// Database operations
const insertComment = async (content, itemId) => {
  const [result] = await pool.query(
    'INSERT INTO comments (content, itemId) VALUES (?, ?)',
    [content, itemId]
  );
  return { id: result.insertId, content, itemId };
};

const getCommentsByItemId = async (itemId) => {
  const [rows] = await pool.query(
    'SELECT * FROM comments WHERE itemId = ? ORDER BY createdAt DESC',
    [itemId]
  );
  return rows;
};

const getAllComments = async () => {
  const rows = await new Promise((resolve, reject) => {
    db.all('SELECT * FROM comments ORDER BY createdAt DESC', (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
  return rows;
};

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
