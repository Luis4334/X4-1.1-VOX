-- ============================================================
-- Tabla: daq_connection_config
-- Guarda UNA sola fila (id=1) con los parámetros RTU de la DAQ.
-- Se sobreescribe con ON DUPLICATE KEY UPDATE al guardar desde la UI.
-- Se lee al arrancar app.py para restaurar la última configuración.
-- ============================================================
CREATE TABLE IF NOT EXISTS `daq_connection_config` (
  `id`         TINYINT UNSIGNED NOT NULL DEFAULT 1 COMMENT 'Siempre 1 — fila única',
  `port`       VARCHAR(20)  NOT NULL DEFAULT 'COM3',
  `baudrate`   INT UNSIGNED NOT NULL DEFAULT 9600,
  `bytesize`   TINYINT      NOT NULL DEFAULT 8,
  `parity`     CHAR(1)      NOT NULL DEFAULT 'N'   COMMENT 'N=Ninguno E=Par O=Impar',
  `stopbits`   TINYINT      NOT NULL DEFAULT 1,
  `timeout_ms` SMALLINT     NOT NULL DEFAULT 80    COMMENT 'Timeout de respuesta en ms',
  `slave_id`   TINYINT UNSIGNED NOT NULL DEFAULT 1,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `daq_single_row` CHECK (`id` = 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  COMMENT='Configuración de conexión Modbus RTU de la DAQ (fila única)';

-- Insertar fila inicial (si no existe)
INSERT INTO `daq_connection_config`
  (id, port, baudrate, bytesize, parity, stopbits, timeout_ms, slave_id)
VALUES
  (1, 'COM3', 9600, 8, 'N', 1, 80, 1)
ON DUPLICATE KEY UPDATE updated_at = updated_at;
