"""
═══════════════════════════════════════════════════════════════════════════════
  Orinoco SoftPLC — FASE 8: Salidas y Cierre de Ciclo
  Migrado de: P09_SALI.LSF

  INTEGRACIÓN MODBUS RTU:
    Después de que las Fases 4-6 calculan las CVs (posiciones de válvulas),
    esta fase las convierte al formato entero de la DAQ y las escribe
    físicamente en el hardware vía Modbus write_register.

    Flujo de datos:
      Fase 6 (PID) → fb_LEVEL_PID_r_CVEU (0-100%) ──┐
      Fase 6 (PID) → fb_PRESS_PID_r_CVEU (0-100%) ──┤
                                                      ↓
                                    × escala_salida → entero DAQ
                                                      ↓
                                    write_register → DAQ física
═══════════════════════════════════════════════════════════════════════════════
"""

import logging
from global_vars import V
from modbus_daq import get_client, mark_disconnected, DAQ_SLAVE_ID

logger = logging.getLogger("orinoco.fase8.salidas")

# ─────────────────────────────────────────────────────────────
# MAPA DE SALIDAS ANALÓGICAS MODBUS  — ICP DAS M-7026
# ─────────────────────────────────────────────────────────────
#
# El M-7026 en el tab AO del DCON Utility muestra:
#   Range: 4000~20000   (sin "Engineering format")
#   4000  = 4 mA
#   20000 = 20 mA
#
# La variable interna V.r_Local_2_O_ChXData ya viene en este
# rango exacto (salida del bloque FB_SCL con EUmin=4000,
# EUmax=20000), así que se escribe DIRECTAMENTE sin conversión.
#
# Registros Holding (FC6):
#   AO Channel 0 → Modbus address 0  (40001)
#   AO Channel 1 → Modbus address 1  (40002)
#
# Formato tuple: (var_en_V, addr_modbus, scale_min, scale_max, desc)
# ─────────────────────────────────────────────────────────────

_OUTPUT_MAP = [
    # (variable_en_V,          addr, scale_min, scale_max, descripción)
    ("r_Local_2_O_Ch0Data",    0,    4000.0,    20000.0,   "LCV-01 Válvula Nivel   [AO CH0]"),
    ("r_Local_2_O_Ch1Data",    1,    4000.0,    20000.0,   "PCV-01 Válvula Presión [AO CH1]"),
]

def _eu_to_raw_m7026(eu_val: float, min_val: float = 4000.0, max_val: float = 20000.0) -> int:
    """
    El M-7026 usa el rango scale_min-scale_max (ej. 4000-20000) directamente para 4-20mA.
    La variable interna ya viene en ese rango → sin conversión.
      4000  = 4 mA  (mínimo físico)
      12000 = 12 mA (50%)
      20000 = 20 mA (máximo físico)
    """
    return int(max(min_val, min(max_val, eu_val)))

# ─────────────────────────────────────────────────────────────
# Salidas digitales (relés)
# NOTA: Los coils addr=0 y addr=1 se deshabilitan temporalmente
# porque el M-7026 puede usar el mismo espacio de dirección
# que los registros AO (addr=0 y addr=1). Habilitar solo si
# tienes un módulo DO separado con su propio slave ID.
# ─────────────────────────────────────────────────────────────
_COIL_DISABLED = True   # ← Cambiar a False si hay módulo DO separado

_COIL_MAP = [
    # (variable_en_V,      addr,  descripción)
    ("b_Local_1_O_Data_0", 0,    "VLV-01 (NOT b_VLV_01)"),   # TODO addr coil
    ("b_Local_1_O_Data_5", 1,    "AUX_RELE vigilancia"),      # TODO addr coil
]


def _escribir_salidas_analogicas(client) -> bool:
    """
    Escribe las CVs de los PIDs como registros Modbus en la DAQ M-7026.
    Convierte el valor interno (4000-20000, escala mA×1000) al formato
    Hex 12-bit que espera el M-7026 (0-4095 para 4-20mA).
    Retorna True si todas las escrituras fueron exitosas.
    """
    ok = True
    for (var_name, addr, scale_min, scale_max, desc) in _OUTPUT_MAP:
        try:
            eu_val  = float(getattr(V, var_name, scale_min))
            raw_int = _eu_to_raw_m7026(eu_val, scale_min, scale_max)
            ma_val  = 4.0 + (eu_val - scale_min) / (scale_max - scale_min) * 16.0

            logger.info(
                f"→ AO write_register(addr={addr}, value={raw_int}"
                f", {ma_val:.2f}mA) [{desc}]"
            )
            result = client.write_register(
                address=addr,
                value=raw_int,
                slave=DAQ_SLAVE_ID,
            )

            if result.isError():
                logger.warning(f"⚠️ Error escribiendo {desc} addr={addr}: {result}")
                ok = False
            else:
                # Leer de vuelta para confirmar que el hardware acepto el valor
                try:
                    rb = client.read_holding_registers(address=addr, count=1, slave=DAQ_SLAVE_ID)
                    if not rb.isError():
                        logger.info(f"✅ {desc}: sent={raw_int} readback={rb.registers[0]} ({ma_val:.2f}mA)")
                    else:
                        logger.warning(f"⚠️ {desc}: write OK pero readback fallo: {rb}")
                except Exception as rbe:
                    logger.warning(f"⚠️ {desc}: write OK pero readback excepcion: {rbe}")

        except Exception as e:
            logger.error(f"❌ Excepción escribiendo {desc}: {e}")
            ok = False

    return ok


def _escribir_salidas_digitales(client) -> bool:
    """
    Escribe los coils (salidas digitales / relés) en la DAQ.
    Retorna True si todas las escrituras fueron exitosas.
    Si _COIL_DISABLED = True, omite las escrituras para evitar
    interferir con los registros AO en el mismo espacio de direcciones.
    """
    if _COIL_DISABLED:
        logger.debug("Coils deshabilitados (_COIL_DISABLED=True) — omitiendo escritura DO")
        return True

    ok = True
    for (var_name, addr, desc) in _COIL_MAP:
        try:
            val    = bool(getattr(V, var_name, False))
            logger.info(f"→ Enviando peticion Modbus RTU: write_coil(addr={addr}, value={val}, slave={DAQ_SLAVE_ID})")
            result = client.write_coil(
                address=addr,
                value=val,
                slave=DAQ_SLAVE_ID,
            )
            if result.isError():
                logger.warning(f"Error escribiendo coil {desc} addr={addr}: {result}")
                ok = False
        except Exception as e:
            logger.error(f"Excepción escribiendo coil {desc}: {e}")
            ok = False

    return ok


def p09_salidas():
    """
    Migrado de P09_SALI.LSF.

    Secuencia:
      1. Actualiza los registros internos V.QD0_x / V.QX0_x (como antes)
      2. Si hay DAQ conectada, escribe físicamente en el hardware
         — salidas analógicas (válvulas LCV-01, PCV-01)
         — salidas digitales  (relés, válvulas on/off)
      3. Si la DAQ falla, registra el error en V.b_Error_DAQ pero
         el ciclo PLC sigue corriendo (fail-safe: mantiene último valor)
    """
    # Las salidas se actualizan en CADA ciclo para mantener las válvulas sincronizadas.
    # (Antes solo se ejecutaba en el flanco de subida de b_P09_ejec_prog — bug corregido)
    V.t_P09_duracion.reset()

    # ── 1. Actualizar registros internos (igual que antes) ────────────────
    # Salidas discretas internas
    V.QX0_0 = V.b_Local_1_O_Data_0   # NOT b_VLV_01 (ya invertido por p05_main)
    V.QX0_1 = V.b_Local_1_O_Data_5   # AUX_RELE de vigilancia

    # Salidas analógicas internas (rango 0-32767 del VP-25W6 original)
    V.QD0_0 = int(V.r_Local_2_O_Ch0Data)   # LCV-01
    V.QD0_1 = int(V.r_Local_2_O_Ch1Data)   # PCV-01

    # ── 2. Escribir en hardware físico vía Modbus RTU ─────────────────────
    client = get_client()
    if client is not None:
        from modbus_daq import get_lock
        port_lock = get_lock()
        if port_lock.acquire(timeout=0.02):
            try:
                ok_analog  = _escribir_salidas_analogicas(client)
                ok_digital = _escribir_salidas_digitales(client)
        
                if not (ok_analog and ok_digital):
                    mark_disconnected()
            finally:
                port_lock.release()
        else:
            logger.debug("DAQ bus ocupado (timeout lock) — saltando ciclo de escritura")
    else:
        # Sin conexión: V.b_Error_DAQ ya está en True (gestionado por modbus_daq)
        logger.debug("DAQ no disponible — salidas físicas no actualizadas")

    V.i_P09_duracion_mSeg = V.t_P09_duracion.read()
