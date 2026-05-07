-- ============================================================
-- MFM ORINOCO - Database Schema
-- Run this script in phpMyAdmin or MySQL CLI
-- Database: x4
-- ============================================================

CREATE DATABASE IF NOT EXISTS x4 CHARACTER SET utf8mb4 COLLATE utf8mb4_spanish_ci;
USE x4;

-- ============================================================
-- Table: configuracion_actual
-- Stores current PID configuration for each control loop
-- ============================================================
DROP TABLE IF EXISTS configuracion_actual;
CREATE TABLE configuracion_actual (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    instrumento     VARCHAR(20) NOT NULL UNIQUE,
    descripcion     VARCHAR(100),
    modo            ENUM('Auto','Manual') DEFAULT 'Manual',
    -- PV es actualizado por comunicacion-modbus.py (promedio de lote)
    PV              FLOAT DEFAULT 0.0,
    CV              FLOAT DEFAULT 0.0,
    SP              FLOAT DEFAULT 0.0,
    CV_manual       FLOAT DEFAULT 0.0,
    SP_manual       FLOAT DEFAULT 0.0,
    Kp              FLOAT DEFAULT 1.0,
    Ki              FLOAT DEFAULT 0.1,
    Kd              FLOAT DEFAULT 0.01,
    activo          TINYINT(1) DEFAULT 1,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ============================================================
-- Table: tabla_configuracion_alarma
-- Instrument ranges and alarm setpoints
-- ============================================================
DROP TABLE IF EXISTS tabla_configuracion_alarma;
CREATE TABLE tabla_configuracion_alarma (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    instrumento     VARCHAR(20) NOT NULL UNIQUE,
    descripcion     VARCHAR(100),
    unidad          VARCHAR(20),
    minimo          FLOAT DEFAULT 0.0,
    maximo          FLOAT DEFAULT 100.0,
    SP_HH           FLOAT DEFAULT 95.0,
    SP_H            FLOAT DEFAULT 90.0,
    SP_L            FLOAT DEFAULT 10.0,
    SP_LL           FLOAT DEFAULT 5.0,
    DB              FLOAT DEFAULT 2.0,
    RAW_H           FLOAT DEFAULT NULL,
    RAW_L           FLOAT DEFAULT NULL,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ============================================================
-- Table: lecturas_proceso
-- Historical readings for trending
-- ============================================================
DROP TABLE IF EXISTS lecturas_proceso;
CREATE TABLE lecturas_proceso (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    instrumento     VARCHAR(20) NOT NULL,
    valor           FLOAT NOT NULL,
    timestamp       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_instrumento_ts (instrumento, timestamp)
);

-- ============================================================
-- Table: valores_agregados
-- Historical averaged readings written by comunicacion-modbus.py
-- Each row = average of MUESTRAS_POR_LOTE sensor samples
-- ============================================================
DROP TABLE IF EXISTS valores_agregados;
CREATE TABLE valores_agregados (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    instrumento     VARCHAR(30) NOT NULL,
    valor_promedio  FLOAT NOT NULL,
    n_muestras      TINYINT DEFAULT 5,
    fuente          ENUM('simulacion','modbus') DEFAULT 'simulacion',
    timestamp       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_va_instrumento_ts (instrumento, timestamp)
);

-- ============================================================
-- Table: usuarios
-- Application users
-- ============================================================
DROP TABLE IF EXISTS usuarios;
CREATE TABLE usuarios (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    username        VARCHAR(50) NOT NULL UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,
    rol             ENUM('admin','operador','visualizador') DEFAULT 'operador',
    activo          TINYINT(1) DEFAULT 1
);

-- ============================================================
-- INITIAL DATA
-- ============================================================

-- PID Loop configurations
INSERT INTO configuracion_actual (instrumento, descripcion, modo, PV, CV, SP, Kp, Ki, Kd) VALUES
('PIC-01', 'Control de Presión - Válvula Gas PCV-01',   'Auto', 94.31, 0.61, 50.0, 1.2, 0.08, 0.05),
('LIC-01', 'Control de Nivel - Válvula Crudo LCV-01',   'Auto', 28.13, 2.00, 30.0, 1.0, 0.10, 0.02);

-- Instrument alarm configurations
INSERT INTO tabla_configuracion_alarma (instrumento, descripcion, unidad, minimo, maximo, SP_HH, SP_H, SP_L, SP_LL, DB) VALUES
('FI-03',   'Flujo Gas Vortex',               'MSCFD',  0.00,    250.00, 230.0,  200.0,  5.0,   2.0,   1.0),
('PI-01',   'Presión de Entrada',              'PSIG',   0.00,    600.00, 580.0,  550.0,  20.0,  10.0,  2.0),
('TI-01',   'Temperatura de Entrada',          '°C',     0.00,    100.00, 95.0,   90.0,   5.0,   2.0,   1.0),
('LI-01',   'Nivel del Separador',             '%',      0.00,    100.00, 95.0,   90.0,   20.0,  5.0,   2.0  ),
('PDI-01',  'Diferencial de Presión Lam. A',  'inH2O',  0.00,    1000.0, 950.0,  900.0,  10.0,  5.0,   2.0  ),
('PDI-03',  'Diferencial de Presión Lam. B',  'inH2O',  0.00,    1000.0, 950.0,  900.0,  10.0,  5.0,   2.0  ),
('PDI-02',  'Diferencial de Presión Wedge',   'inH2O',  0.00,    250.00, 240.0,  220.0,  5.0,   2.0,   1.0  ),
('TI-02',   'Temperatura Proceso',             '°C',     0.00,    100.00, 95.0,   90.0,   5.0,   2.0,   1.0  ),
('GAS-01',  'Porcentaje de Gas',               '%',      0.00,    100.00, 95.0,   90.0,   5.0,   2.0,   1.0  ),
('VI-01',   'Viscosidad del Crudo',            'CP',     0.00,    10.00,  9.5,    9.0,    0.5,   0.2,   0.1  );

-- Default admin user (password: admin123)
INSERT INTO usuarios (username, password_hash, rol) VALUES
('admin', 'pbkdf2:sha256:260000$admin123', 'admin'),
('operador', 'pbkdf2:sha256:260000$oper456', 'operador');
