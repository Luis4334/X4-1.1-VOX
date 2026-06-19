-- ============================================================
-- MIGRACIÓN: Agrega columna instrument_type a hart_channel_config
-- Ejecutar en phpMyAdmin o MySQL CLI UNA SOLA VEZ.
-- ============================================================
USE x4;

-- 1. Agregar columna instrument_type (si no existe)
ALTER TABLE hart_channel_config
  ADD COLUMN IF NOT EXISTS instrument_type VARCHAR(20) NOT NULL DEFAULT 'NONE'
  COMMENT 'Rol fijo del slot: LAMINAR_A, WEDGE_LIQ, WEDGE_GAS, LAMINAR_B, NIVEL, NONE';

-- 2. Agregar columna hart_device_index (si no existe, algunos setups antiguos no la tienen)
ALTER TABLE hart_channel_config
  ADD COLUMN IF NOT EXISTS hart_device_index TINYINT UNSIGNED NOT NULL DEFAULT 0
  COMMENT 'N en HART Device N del HG Tool (0-based). Determina addr Modbus = 1300 + N*10';

-- 3. Asignar roles fijos a los 5 primeros slots (los 10 restantes = NONE)
UPDATE hart_channel_config SET instrument_type = 'LAMINAR_A',  description = 'Medidor Laminar (LAMINAR A)',        hart_device_index = 0 WHERE channel_idx = 0;
UPDATE hart_channel_config SET instrument_type = 'WEDGE_LIQ',  description = 'Medidor tipo Cuña (Wedge) Líquido',  hart_device_index = 3 WHERE channel_idx = 1;
UPDATE hart_channel_config SET instrument_type = 'WEDGE_GAS',  description = 'Medidor tipo Cuña (Wedge) Gas',      hart_device_index = 4 WHERE channel_idx = 2;
UPDATE hart_channel_config SET instrument_type = 'LAMINAR_B',  description = 'Medidor Laminar (LAMINAR B)',        hart_device_index = 5 WHERE channel_idx = 3;
UPDATE hart_channel_config SET instrument_type = 'NIVEL',      description = 'Nivel Separador (LIT-01)',           hart_device_index = 6 WHERE channel_idx = 4;
-- Slots 5-14 quedan con NONE (sin asignar)
UPDATE hart_channel_config SET instrument_type = 'NONE' WHERE channel_idx >= 5;

-- 4. Habilitar los slots activos (ajustar según configuracion real)
UPDATE hart_channel_config SET enabled = 1 WHERE channel_idx IN (0, 1);
UPDATE hart_channel_config SET enabled = 0 WHERE channel_idx >= 2;

SELECT channel_idx, instrument_type, description, hart_device_index, enabled
FROM hart_channel_config ORDER BY channel_idx;
