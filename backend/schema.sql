-- Rental Management Database Schema
-- MySQL 8.0+
-- Две базы данных: для администраторов и для пользователей

-- ─────────────────────────────────────────────
-- База данных для администраторов
-- ─────────────────────────────────────────────
CREATE DATABASE IF NOT EXISTS rental_management_admin
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE rental_management_admin;

CREATE TABLE IF NOT EXISTS categories (
  id          VARCHAR(64)  NOT NULL,
  name        VARCHAR(255) NOT NULL,
  icon        VARCHAR(64)  NOT NULL DEFAULT '',
  color       VARCHAR(128) NOT NULL DEFAULT '',
  is_default  TINYINT(1)   NOT NULL DEFAULT 0,
  sort_order  INT          NOT NULL DEFAULT 0,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS objects (
  id                        VARCHAR(64)         NOT NULL,
  category_id               VARCHAR(64)         NOT NULL,
  street                    VARCHAR(255)        NOT NULL DEFAULT '',
  building                  VARCHAR(128)        NOT NULL DEFAULT '',
  tenant_name               VARCHAR(255)        NOT NULL DEFAULT '',
  tenant_phone              VARCHAR(64)         NOT NULL DEFAULT '',
  tenant_telegram           VARCHAR(128)        NOT NULL DEFAULT '',
  contract_date             VARCHAR(64)         NOT NULL DEFAULT '',
  planned_rent              DECIMAL(12, 2)      NOT NULL DEFAULT 0.00,
  planned_utilities         DECIMAL(12, 2)      NOT NULL DEFAULT 0.00,
  cp_date                   VARCHAR(64)         NOT NULL DEFAULT '',
  cp_actual_rent            DECIMAL(12, 2)      NOT NULL DEFAULT 0.00,
  cp_rent_payment_date      VARCHAR(64)         NOT NULL DEFAULT '',
  cp_rent_payment_type      ENUM('cash','card') NOT NULL DEFAULT 'cash',
  cp_actual_utilities       DECIMAL(12, 2)      NOT NULL DEFAULT 0.00,
  cp_utilities_payment_date VARCHAR(64)         NOT NULL DEFAULT '',
  cp_utilities_payment_type ENUM('cash','card') NOT NULL DEFAULT 'cash',
  cp_note                   TEXT,
  is_archived               TINYINT(1)          NOT NULL DEFAULT 0,
  sort_order                INT                 NOT NULL DEFAULT 0,
  created_at                VARCHAR(64)         NOT NULL DEFAULT '',
  updated_at                VARCHAR(64)         NOT NULL DEFAULT '',
  PRIMARY KEY (id),
  CONSTRAINT fk_admin_objects_category
    FOREIGN KEY (category_id) REFERENCES categories (id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS payment_records (
  id                      VARCHAR(64)         NOT NULL,
  object_id               VARCHAR(64)         NOT NULL,
  period                  VARCHAR(16)         NOT NULL DEFAULT '',
  rec_date                VARCHAR(64)         NOT NULL DEFAULT '',
  planned_rent            DECIMAL(12, 2)      NOT NULL DEFAULT 0.00,
  actual_rent             DECIMAL(12, 2)      NOT NULL DEFAULT 0.00,
  rent_payment_date       VARCHAR(64)         NOT NULL DEFAULT '',
  rent_payment_type       ENUM('cash','card') NOT NULL DEFAULT 'cash',
  planned_utilities       DECIMAL(12, 2)      NOT NULL DEFAULT 0.00,
  actual_utilities        DECIMAL(12, 2)      NOT NULL DEFAULT 0.00,
  utilities_payment_date  VARCHAR(64)         NOT NULL DEFAULT '',
  utilities_payment_type  ENUM('cash','card') NOT NULL DEFAULT 'cash',
  note                    TEXT,
  PRIMARY KEY (id),
  CONSTRAINT fk_admin_payment_records_object
    FOREIGN KEY (object_id) REFERENCES objects (id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS documents (
  id          VARCHAR(64)   NOT NULL,
  object_id   VARCHAR(64)   NOT NULL,
  name        VARCHAR(500)  NOT NULL DEFAULT '',
  size        INT           NOT NULL DEFAULT 0,
  mime_type   VARCHAR(255)  NOT NULL DEFAULT '',
  file_path   VARCHAR(500)  NOT NULL DEFAULT '',
  uploaded_at VARCHAR(64)   NOT NULL DEFAULT '',
  PRIMARY KEY (id),
  CONSTRAINT fk_admin_documents_object
    FOREIGN KEY (object_id) REFERENCES objects (id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS settings (
  id                      INT NOT NULL DEFAULT 1,
  notification_days_before INT NOT NULL DEFAULT 3,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO settings (id, notification_days_before) VALUES (1, 3);

CREATE TABLE IF NOT EXISTS users (
  id            VARCHAR(64)          NOT NULL,
  phone         VARCHAR(20)          NOT NULL,
  name          VARCHAR(255)         NOT NULL DEFAULT '',
  password_hash VARCHAR(255)         NOT NULL,
  role          ENUM('admin','user') NOT NULL DEFAULT 'user',
  is_active     TINYINT(1)           NOT NULL DEFAULT 1,
  created_at    VARCHAR(64)          NOT NULL DEFAULT '',
  PRIMARY KEY (id),
  UNIQUE KEY uq_admin_users_phone (phone)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ─────────────────────────────────────────────
-- База данных для обычных пользователей
-- ─────────────────────────────────────────────
CREATE DATABASE IF NOT EXISTS rental_management
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE rental_management;

CREATE TABLE IF NOT EXISTS categories (
  id          VARCHAR(64)  NOT NULL,
  name        VARCHAR(255) NOT NULL,
  icon        VARCHAR(64)  NOT NULL DEFAULT '',
  color       VARCHAR(128) NOT NULL DEFAULT '',
  is_default  TINYINT(1)   NOT NULL DEFAULT 0,
  sort_order  INT          NOT NULL DEFAULT 0,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS objects (
  id                        VARCHAR(64)         NOT NULL,
  category_id               VARCHAR(64)         NOT NULL,
  street                    VARCHAR(255)        NOT NULL DEFAULT '',
  building                  VARCHAR(128)        NOT NULL DEFAULT '',
  tenant_name               VARCHAR(255)        NOT NULL DEFAULT '',
  tenant_phone              VARCHAR(64)         NOT NULL DEFAULT '',
  tenant_telegram           VARCHAR(128)        NOT NULL DEFAULT '',
  contract_date             VARCHAR(64)         NOT NULL DEFAULT '',
  planned_rent              DECIMAL(12, 2)      NOT NULL DEFAULT 0.00,
  planned_utilities         DECIMAL(12, 2)      NOT NULL DEFAULT 0.00,
  cp_date                   VARCHAR(64)         NOT NULL DEFAULT '',
  cp_actual_rent            DECIMAL(12, 2)      NOT NULL DEFAULT 0.00,
  cp_rent_payment_date      VARCHAR(64)         NOT NULL DEFAULT '',
  cp_rent_payment_type      ENUM('cash','card') NOT NULL DEFAULT 'cash',
  cp_actual_utilities       DECIMAL(12, 2)      NOT NULL DEFAULT 0.00,
  cp_utilities_payment_date VARCHAR(64)         NOT NULL DEFAULT '',
  cp_utilities_payment_type ENUM('cash','card') NOT NULL DEFAULT 'cash',
  cp_note                   TEXT,
  is_archived               TINYINT(1)          NOT NULL DEFAULT 0,
  created_at                VARCHAR(64)         NOT NULL DEFAULT '',
  updated_at                VARCHAR(64)         NOT NULL DEFAULT '',
  PRIMARY KEY (id),
  CONSTRAINT fk_objects_category
    FOREIGN KEY (category_id) REFERENCES categories (id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS payment_records (
  id                      VARCHAR(64)         NOT NULL,
  object_id               VARCHAR(64)         NOT NULL,
  period                  VARCHAR(16)         NOT NULL DEFAULT '',
  rec_date                VARCHAR(64)         NOT NULL DEFAULT '',
  planned_rent            DECIMAL(12, 2)      NOT NULL DEFAULT 0.00,
  actual_rent             DECIMAL(12, 2)      NOT NULL DEFAULT 0.00,
  rent_payment_date       VARCHAR(64)         NOT NULL DEFAULT '',
  rent_payment_type       ENUM('cash','card') NOT NULL DEFAULT 'cash',
  planned_utilities       DECIMAL(12, 2)      NOT NULL DEFAULT 0.00,
  actual_utilities        DECIMAL(12, 2)      NOT NULL DEFAULT 0.00,
  utilities_payment_date  VARCHAR(64)         NOT NULL DEFAULT '',
  utilities_payment_type  ENUM('cash','card') NOT NULL DEFAULT 'cash',
  note                    TEXT,
  PRIMARY KEY (id),
  CONSTRAINT fk_payment_records_object
    FOREIGN KEY (object_id) REFERENCES objects (id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS documents (
  id          VARCHAR(64)   NOT NULL,
  object_id   VARCHAR(64)   NOT NULL,
  name        VARCHAR(500)  NOT NULL DEFAULT '',
  size        INT           NOT NULL DEFAULT 0,
  mime_type   VARCHAR(255)  NOT NULL DEFAULT '',
  file_path   VARCHAR(500)  NOT NULL DEFAULT '',
  uploaded_at VARCHAR(64)   NOT NULL DEFAULT '',
  PRIMARY KEY (id),
  CONSTRAINT fk_documents_object
    FOREIGN KEY (object_id) REFERENCES objects (id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS settings (
  id                      INT NOT NULL DEFAULT 1,
  notification_days_before INT NOT NULL DEFAULT 3,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO settings (id, notification_days_before) VALUES (1, 3);

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
