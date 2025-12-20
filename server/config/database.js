import mysql from 'mysql2/promise';
import { DB_CONFIG } from './config.js';
import { logger } from '../utils/logger.js';

const pool = mysql.createPool({
  host: DB_CONFIG.HOST,
  user: DB_CONFIG.USER,
  password: DB_CONFIG.PASSWORD,
  database: DB_CONFIG.DATABASE,
  port: DB_CONFIG.PORT,
  waitForConnections: true,
  connectionLimit: DB_CONFIG.CONNECTION_LIMIT,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  // Handle connection errors gracefully
  acquireTimeout: 60000, // 60 seconds
  timeout: 60000, // 60 seconds
});

// Test connection
pool.getConnection()
  .then(connection => {
    logger.info('✅ Database connected successfully');
    connection.release();
  })
  .catch(err => {
    logger.error('❌ Database connection failed:', err.message);
  });

export const db = pool;
