-- Create calendar_reminders table
CREATE TABLE IF NOT EXISTS calendar_reminders (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  reminder_date DATE NOT NULL,
  reminder_time TIME NOT NULL,
  reminder_type ENUM('call', 'meeting', 'deadline', 'important_date', 'other') DEFAULT 'other',
  is_completed BOOLEAN DEFAULT FALSE,
  sent_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_date (user_id, reminder_date),
  INDEX idx_reminder_datetime (reminder_date, reminder_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
