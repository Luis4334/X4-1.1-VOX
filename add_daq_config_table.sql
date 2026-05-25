-- ============================================================
-- Tabla: daq_channel_config
-- Guarda la configuración persistente de los canales AI de la DAQ.
-- Se sobreescribe con ON DUPLICATE KEY UPDATE desde la API web.
-- ============================================================
CREATE TABLE IF NOT EXISTS `daq_channel_config` (
  `channel_addr`  TINYINT UNSIGNED NOT NULL COMMENT 'Dirección Modbus del canal (0=CH:00...5=CH:05)',
  `v_name`        VARCHAR(64)  NOT NULL        COMMENT 'Nombre de la variable en V (ej: r_Local_2_I_Ch0Data)',
  `description`   VARCHAR(120) NOT NULL        COMMENT 'Descripción del instrumento (ej: LIT-001 Nivel)',
  `scale`         FLOAT        NOT NULL DEFAULT 1000.0 COMMENT 'Divisor Engineering Format (1000=mA, 10=bar...)',
  `eu_min`        FLOAT        NOT NULL DEFAULT 4.0    COMMENT 'Valor EU mínimo (mA vivos min)',
  `eu_max`        FLOAT        NOT NULL DEFAULT 20.0   COMMENT 'Valor EU máximo (mA vivos max)',
  `enabled`       TINYINT(1)   NOT NULL DEFAULT 1      COMMENT '1=canal activo, 0=ignorado',
  `modbus_addr`   TINYINT UNSIGNED NOT NULL DEFAULT 0    COMMENT 'Dirección Modbus física asignada a esta variable V',
  `updated_at`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`channel_addr`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Configuración de canales AI Modbus DAQ';

-- Datos iniciales — 6 canales AI de la tarjeta ADAM-4117 / compatible
INSERT INTO `daq_channel_config`
  (channel_addr, v_name,               description,                  scale,  eu_min, eu_max, enabled, modbus_addr)
VALUES
  (0, 'r_Local_2_I_Ch0Data', 'LIT-001 Nivel separador',     1000.0,  4.0,  20.0, 1, 0),
  (1, 'r_Local_2_I_Ch1Data', 'FT-01  DP Laminar Alta',       1000.0,  4.0,  20.0, 1, 1),
  (2, 'r_Local_2_I_Ch2Data', 'VORTEX Flujo Gas Vortex',     1000.0,  4.0,  20.0, 1, 2),
  (3, 'r_Local_2_I_Ch3Data', 'FT-04  DP Laminar Baja',       1000.0,  4.0,  20.0, 1, 3),
  (4, 'r_Local_4_I_Ch0Data', 'FT-02  DP Wedge',              1000.0,  4.0,  20.0, 1, 4),
  (5, 'r_Local_4_I_Ch1Data', 'PT-02  Presion Aceite',        1000.0,  4.0,  20.0, 1, 5)
ON DUPLICATE KEY UPDATE updated_at = NOW();
