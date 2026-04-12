-- Migration: Add users table for multi-user authentication
-- Run this on existing databases that already have the other tables

USE rental_management;

CREATE TABLE IF NOT EXISTS users (
  id            VARCHAR(64)          NOT NULL,
  phone         VARCHAR(20)          NOT NULL,
  name          VARCHAR(255)         NOT NULL DEFAULT '',
  password_hash VARCHAR(255)         NOT NULL,
  role          ENUM('admin','user') NOT NULL DEFAULT 'user',
  is_active     TINYINT(1)           NOT NULL DEFAULT 1,
  created_at    VARCHAR(64)          NOT NULL DEFAULT '',
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_phone (phone)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
