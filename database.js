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
      reset_password_token VARCHAR(255) NULL,
      reset_password_expires DATETIME NULL,
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
      name VARCHAR(100) NOT NULL UNIQUE,
      icon VARCHAR(255),
      description TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,

  `CREATE TABLE IF NOT EXISTS services (
      id INT PRIMARY KEY AUTO_INCREMENT,
      provider_id INT NOT NULL,
      category_id INT NOT NULL,
      title VARCHAR(150) NOT NULL,
      image VARCHAR(255) NULL COMMENT 'Image de couverture du service',
      description TEXT,
      price DECIMAL(10,2) NOT NULL,
      duration INT DEFAULT 60 COMMENT 'Durée en minutes',
      status ENUM('active','pending','rejected') DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (provider_id) REFERENCES provider_profiles(id) ON DELETE CASCADE,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
  )`,

  `CREATE TABLE IF NOT EXISTS bookings (
      id INT PRIMARY KEY AUTO_INCREMENT,
      client_id INT NOT NULL,
      service_id INT NOT NULL,
      provider_id INT NOT NULL,
      date DATE NOT NULL,
      time TIME NOT NULL,
      total_price DECIMAL(10,2),
      status ENUM('pending','accepted','completed','cancelled') DEFAULT 'pending',
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (client_id) REFERENCES users(id),
      FOREIGN KEY (service_id) REFERENCES services(id),
      FOREIGN KEY (provider_id) REFERENCES provider_profiles(id)
  )`,

  `CREATE TABLE IF NOT EXISTS payments (
      id INT PRIMARY KEY AUTO_INCREMENT,
      booking_id INT NOT NULL,
      amount DECIMAL(10,2) NOT NULL,
      commission_rate DECIMAL(5,2) DEFAULT 10.00 COMMENT 'Taux de commission en %',
      commission_amount DECIMAL(10,2) DEFAULT 0.00 COMMENT 'Montant de la commission',
      provider_amount DECIMAL(10,2) DEFAULT 0.00 COMMENT 'Montant pour le prestataire',
      method VARCHAR(50),
      transaction_id VARCHAR(200),
      status ENUM('success','failed','pending') DEFAULT 'pending',
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
      FOREIGN KEY (provider_id) REFERENCES provider_profiles(id),
      UNIQUE KEY unique_review (booking_id)
  )`,

  `CREATE TABLE IF NOT EXISTS notifications (
      id INT PRIMARY KEY AUTO_INCREMENT,
      user_id INT NOT NULL,
      title VARCHAR(150),
      message TEXT,
      type VARCHAR(50),
      is_read TINYINT DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`,

  `CREATE TABLE IF NOT EXISTS availability (
      id INT PRIMARY KEY AUTO_INCREMENT,
      provider_id INT NOT NULL,
      day_of_week INT NOT NULL COMMENT '0=Dimanche, 1=Lundi, ..., 6=Samedi',
      start_time TIME NOT NULL,
      end_time TIME NOT NULL,
      is_available TINYINT DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (provider_id) REFERENCES provider_profiles(id) ON DELETE CASCADE
  )`,

  `CREATE TABLE IF NOT EXISTS favorites (
      id INT PRIMARY KEY AUTO_INCREMENT,
      client_id INT NOT NULL,
      provider_id INT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (client_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (provider_id) REFERENCES provider_profiles(id) ON DELETE CASCADE,
      UNIQUE KEY unique_favorite (client_id, provider_id)
  )`,

  `CREATE TABLE IF NOT EXISTS conversations (
      id INT PRIMARY KEY AUTO_INCREMENT,
      user_1_id INT NOT NULL,
      user_2_id INT NOT NULL,
      last_message_at TIMESTAMP NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (user_1_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (user_2_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE KEY unique_conversation (user_1_id, user_2_id)
  )`,

  `CREATE TABLE IF NOT EXISTS messages (
      id INT PRIMARY KEY AUTO_INCREMENT,
      conversation_id INT NOT NULL,
      sender_id INT NOT NULL,
      message TEXT NOT NULL,
      is_read TINYINT DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
      FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
      INDEX idx_conversation (conversation_id),
      INDEX idx_sender (sender_id)
  )`,

  `CREATE TABLE IF NOT EXISTS wallets (
      id INT PRIMARY KEY AUTO_INCREMENT,
      user_id INT NOT NULL UNIQUE,
      balance DECIMAL(10,2) DEFAULT 0.00 COMMENT 'Solde disponible',
      pending_balance DECIMAL(10,2) DEFAULT 0.00 COMMENT 'Solde en attente',
      total_earned DECIMAL(10,2) DEFAULT 0.00 COMMENT 'Total gagné',
      total_withdrawn DECIMAL(10,2) DEFAULT 0.00 COMMENT 'Total retiré',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`,

  `CREATE TABLE IF NOT EXISTS wallet_transactions (
      id INT PRIMARY KEY AUTO_INCREMENT,
      wallet_id INT NOT NULL,
      booking_id INT NULL,
      type ENUM('credit','debit','withdrawal','refund','commission') NOT NULL,
      amount DECIMAL(10,2) NOT NULL,
      balance_before DECIMAL(10,2) NOT NULL,
      balance_after DECIMAL(10,2) NOT NULL,
      description TEXT,
      status ENUM('pending','completed','failed') DEFAULT 'completed',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (wallet_id) REFERENCES wallets(id) ON DELETE CASCADE,
      FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE SET NULL,
      INDEX idx_wallet (wallet_id),
      INDEX idx_type (type),
      INDEX idx_status (status)
  )`,

  `CREATE TABLE IF NOT EXISTS withdrawal_requests (
      id INT PRIMARY KEY AUTO_INCREMENT,
      user_id INT NOT NULL,
      wallet_id INT NOT NULL,
      amount DECIMAL(10,2) NOT NULL,
      method VARCHAR(100),
      account_details TEXT,
      status ENUM('pending','processing','completed','rejected') DEFAULT 'pending',
      admin_note TEXT NULL,
      requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      processed_at TIMESTAMP NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (wallet_id) REFERENCES wallets(id) ON DELETE CASCADE,
      INDEX idx_status (status),
      INDEX idx_user (user_id)
  )`
];

async function setupDatabase() {
  try {
    const con = await mysql.createConnection(connectionConfig);
    console.log("✅ Connected to MySQL");

    await con.query(`CREATE DATABASE IF NOT EXISTS ${dbName}`);
    console.log(`✅ Database ${dbName} created or already exists.`);

    await con.changeUser({ database: dbName });

    for (let sql of tables) {
      await con.query(sql);
    }

    console.log("✅ All tables created successfully!");

    await con.end();
  } catch (err) {
    console.error("❌ Error:", err);
  }
}

setupDatabase()