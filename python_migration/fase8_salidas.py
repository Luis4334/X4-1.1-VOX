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
# MAPA DE SALIDAS ANALÓGICAS MODBUS
# TODO: Sustituye las direcciones con las de tu mapa de registros real
# ─────────────────────────────────────────────────────────────
#
# Formato: (fuente_en_V,           addr,  escala,  clamp_min, clamp_max, desc)
#   escala: multiplicador para convertir EU% (0-100) al entero de la DAQ
#           Ej: 65.5% × 100 → 6550  |  65.5% × 327.67 → 21462 (rango 0-32767)
#
_SALIDA_SCALE = 100.0   # TODO: Cambia a 327.67 si tu DAQ usa rango 0-32767
                         #       o a 10.0 si usa rango 0-1000, etc.

_OUTPUT_MAP = [
    # Variable escalada del PLC → dirección Modbus → escala → clamp_min → clamp_max → descripción
    ("r_Local_2_O_Ch0Data",  20, 1.0, 4000, 20000, "LCV-01 Válvula Nivel   [4000-20000 mA]"),
    ("r_Local_2_O_Ch1Data",  21, 1.0, 4000, 20000, "PCV-01 Válvula Presión [4000-20000 mA]"),
]

# ─────────────────────────────────────────────────────────────
# Salidas digitales (relés)
# TODO: Ajusta direcciones de coils a tu mapa real
# ─────────────────────────────────────────────────────────────
_COIL_MAP = [
    # (variable_en_V,      addr,  descripción)
    ("b_Local_1_O_Data_0", 0,    "VLV-01 (NOT b_VLV_01)"),   # TODO addr coil
    ("b_Local_1_O_Data_5", 1,    "AUX_RELE vigilancia"),      # TODO addr coil
]


def _escribir_salidas_analogicas(client) -> bool:
    """
    Escribe las CVs de los PIDs como registros Modbus en la DAQ.
    Retorna True si todas las escrituras fueron exitosas.
    """
    ok = True
    for (var_name, addr, escala, vmin, vmax, desc) in _OUTPUT_MAP:
        try:
            eu_val   = float(getattr(V, var_name, 0.0))
            raw_int  = int(max(vmin, min(vmax, eu_val * escala)))

            logger.info(f"→ Enviando peticion Modbus RTU: write_register(addr={addr}, value={raw_int}, slave={DAQ_SLAVE_ID})")
            result = client.write_register(
                address=addr,
                value=raw_int,
                slave=DAQ_SLAVE_ID,
            )

            if result.isError():
                logger.warning(f"Error escribiendo {desc} addr={addr}: {result}")
                ok = False
            else:
                logger.debug(f"Salida {desc}: {eu_val:.2f}% → reg[{addr}]={raw_int}")

        except Exception as e:
            logger.error(f"Excepción escribiendo {desc}: {e}")
            ok = False

    return ok


def _escribir_salidas_digitales(client) -> bool:
    """
    Escribe los coils (salidas digitales / relés) en la DAQ.
    Retorna True si todas las escrituras fueron exitosas.
    """
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
        ok_analog  = _escribir_salidas_analogicas(client)
        ok_digital = _escribir_salidas_digitales(client)

        if not (ok_analog and ok_digital):
            mark_disconnected()
    else:
        # Sin conexión: V.b_Error_DAQ ya está en True (gestionado por modbus_daq)
        logger.debug("DAQ no disponible — salidas físicas no actualizadas")

    V.i_P09_duracion_mSeg = V.t_P09_duracion.read()
