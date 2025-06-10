module.exports = {
  HOST: "localhost",
  USER: "root",
  PASSWORD: "yourpassword", // Change this to your MySQL password
  DB: "evolution_comments",
  dialect: "mysql",
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
};
