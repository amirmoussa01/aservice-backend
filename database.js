import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

const connectionConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS
};

const dbName = process.env.DB_NAME;

const tables = [
  `CREATE TABLE IF NOT EXISTS users (
      id INT PRIMARY KEY AUTO_INCREMENT,
      name VARCHAR(150) NOT NULL,
      email VARCHAR(150) UNIQUE NOT NULL,
      phone VARCHAR(20),
      password VARCHAR(255),
      google_id VARCHAR(255),                        
      is_google_account TINYINT DEFAULT 0,          
      role ENUM('client','provider','admin') DEFAULT 'client',
      status ENUM('active','suspended') DEFAULT 'active',
      avatar VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,

  `CREATE TABLE IF NOT EXISTS provider_profiles (
      id INT PRIMARY KEY AUTO_INCREMENT,
      user_id INT NOT NULL,
      bio TEXT,
      address VARCHAR(255),
      formatted_address VARCHAR(255),          
      specialty VARCHAR(150),                  
      latitude DOUBLE,
      longitude DOUBLE,
      verified TINYINT DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`,

  `CREATE TABLE IF NOT EXISTS documents (
      id INT PRIMARY KEY AUTO_INCREMENT,
      provider_id INT NOT NULL,
      type VARCHAR(100),
      file_url VARCHAR(255),
      status ENUM('pending','approved','rejected') DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (provider_id) REFERENCES provider_profiles(id) ON DELETE CASCADE
  )`,

  `CREATE TABLE IF NOT EXISTS categories (
      id INT PRIMARY KEY AUTO_INCREMENT,
      name VARCHAR(100) NOT NULL,
      icon VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,

  `CREATE TABLE IF NOT EXISTS services (
      id INT PRIMARY KEY AUTO_INCREMENT,
      provider_id INT NOT NULL,
      category_id INT NOT NULL,
      title VARCHAR(150),
      description TEXT,
      price DECIMAL(10,2),
      status ENUM('active','pending','rejected') DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (provider_id) REFERENCES provider_profiles(id) ON DELETE CASCADE,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
  )`,

  `CREATE TABLE IF NOT EXISTS bookings (
      id INT PRIMARY KEY AUTO_INCREMENT,
      client_id INT NOT NULL,
      service_id INT NOT NULL,
      date DATE NOT NULL,
      time TIME NOT NULL,
      status ENUM('pending','accepted','completed','cancelled') DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (client_id) REFERENCES users(id),
      FOREIGN KEY (service_id) REFERENCES services(id)
  )`,

  `CREATE TABLE IF NOT EXISTS payments (
      id INT PRIMARY KEY AUTO_INCREMENT,
      booking_id INT NOT NULL,
      amount DECIMAL(10,2),
      method VARCHAR(50),
      transaction_id VARCHAR(200),
      status ENUM('success','failed') DEFAULT 'success',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
  )`,

  `CREATE TABLE IF NOT EXISTS reviews (
      id INT PRIMARY KEY AUTO_INCREMENT,
      booking_id INT NOT NULL,
      client_id INT NOT NULL,
      provider_id INT NOT NULL,
      rating INT CHECK (rating BETWEEN 1 AND 5),
      comment TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
      FOREIGN KEY (client_id) REFERENCES users(id),
      FOREIGN KEY (provider_id) REFERENCES provider_profiles(id)
  )`,

  `CREATE TABLE IF NOT EXISTS notifications (
      id INT PRIMARY KEY AUTO_INCREMENT,
      user_id INT NOT NULL,
      title VARCHAR(150),
      message TEXT,
      type VARCHAR(50),
      is_read TINYINT DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
  )`
];

async function setupDatabase() {
  try {
    const con = await mysql.createConnection(connectionConfig);
    console.log("Connected to MySQL");

    // Create DB
    await con.query(`CREATE DATABASE IF NOT EXISTS ${dbName}`);
    console.log(`Database ${dbName} created or already exists.`);

    await con.changeUser({ database: dbName });

    // Create all tables
    for (let sql of tables) {
      await con.query(sql);
    }

    console.log("All tables created successfully!");

    await con.end();
  } catch (err) {
    console.error("Error:", err);
  }
}

setupDatabase();
