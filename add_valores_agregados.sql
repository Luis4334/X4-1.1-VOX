-- ============================================================
-- ACTUALIZACIÓN: Tabla valores_agregados
-- MFM ORINOCO – Script DAQ Modbus
-- Ejecutar en phpMyAdmin → base de datos "x4"
-- ============================================================

USE x4;

-- Columna PV en configuracion_actual ya existe.
-- Este script solo crea la tabla de histórico de promedios.

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

SELECT 'Tabla valores_agregados creada correctamente.' AS resultado;
