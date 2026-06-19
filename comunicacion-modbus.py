"""
comunicacion-modbus.py  –  MFM ORINOCO
========================================
Script INDEPENDIENTE de adquisición de datos.

MODO SIMULACIÓN (por defecto):
  Genera valores aleatorios realistas que imitan sensores industriales.
  Cada 5 muestras (cada ~2.5 s) calcula promedios y los escribe en:
    · configuracion_actual  → valor instantáneo (PV actual de cada lazo)
    · valores_agregados     → histórico de promedios por lote

MODO MODBUS REAL (descomentar sección MODBUS REAL):
  Se conecta al DAQ Modbus TCP/RTU y lee registros reales.
  Solo cambia la función  _leer_modbus()  para devolver datos reales.

Ejecutar:
  python comunicacion-modbus.py

Detener:
  Ctrl+C
"""

import time
import math
import random
import logging
from datetime import datetime
import mysql.connector
from mysql.connector import pooling

# ─── Descomentar para Modbus real ──────────────────────────────
# from pymodbus.client import ModbusTcpClient   # pip install pymodbus
# from pymodbus.client import ModbusSerialClient
# ───────────────────────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("modbus-daq")

# ─────────────────────────────────────────────────────────────
# Configuración MySQL
# ─────────────────────────────────────────────────────────────
DB_CONFIG = dict(
    host="localhost",
    port=3306,
    user="root",
    password="",
    database="x4",
    charset="utf8mb4",
    connection_timeout=10,
)

# ─────────────────────────────────────────────────────────────
# Configuración Modbus (preparado, no activo)
# ─────────────────────────────────────────────────────────────
MODBUS_MODE     = "TCP"          # "TCP" | "RTU"
MODBUS_HOST     = "192.168.1.10" # IP del DAQ en modo TCP
MODBUS_PORT     = 502            # Puerto estándar Modbus TCP
MODBUS_UNIT     = 1              # ID de esclavo Modbus
MODBUS_COM      = "COM3"         # Puerto serie para RTU
MODBUS_BAUDRATE = 9600
MODBUS_TIMEOUT  = 3

# Mapa de registros Modbus → nombre de instrumento
# Ajustar según tabla de direcciones del DAQ real
REGISTRO_MAP = {
    # Registro (holding reg addr): (nombre instrumento, escala, offset)
    # Ejemplo: reg 0 → FI-03, raw_value / 100.0
    0:  ("FI-03",         100.0, 0.0),   # MSCFD
    1:  ("PI-01",         10.0,  0.0),   # PSIG
    2:  ("TI-01",         100.0, 0.0),   # °C
    3:  ("LI-01",         100.0, 0.0),   # %
    4:  ("PDI-01",        10.0,  0.0),   # inH2O
    5:  ("PDI-03",        10.0,  0.0),   # inH2O
    6:  ("PDI-02-dp",     100.0, 0.0),   # inH2O
    7:  ("PDI-02-psig",   100.0, 0.0),   # PSIG
    8:  ("TI-02",         100.0, 0.0),   # °C
    9:  ("GAS-01",        10.0,  0.0),   # %
    10: ("VI-01",         1000.0,0.0),   # CP
}

# ─────────────────────────────────────────────────────────────
# Pool MySQL
# ─────────────────────────────────────────────────────────────
_db_pool = None

def init_db_pool():
    global _db_pool
    try:
        _db_pool = pooling.MySQLConnectionPool(
            pool_name="modbus_daq", pool_size=3, **DB_CONFIG
        )
        log.info("✅  MySQL pool OK")
    except Exception as e:
        log.error(f"❌  MySQL no disponible: {e}")
        _db_pool = None


def get_conn():
    if _db_pool:
        try:
            return _db_pool.get_connection()
        except Exception:
            pass
    return mysql.connector.connect(**DB_CONFIG)


def db_exec(sql, params=None, fetch=True):
    conn = cur = None
    try:
        conn = get_conn()
        cur  = conn.cursor(dictionary=True)
        cur.execute(sql, params or ())
        if fetch:
            return cur.fetchall()
        conn.commit()
        return cur.lastrowid
    except Exception as e:
        log.error(f"  DB error: {e}")
        if conn and not fetch:
            try: conn.rollback()
            except Exception: pass
        return None
    finally:
        if cur:  cur.close()
        if conn: conn.close()


# ─────────────────────────────────────────────────────────────
# Estado persistente del simulador (física simplificada)
# ─────────────────────────────────────────────────────────────
_t   = 0.0
_sim = {
    "level":    50.0,   # % nivel del separador
    "pressure": 95.0,   # PSIG presión del separador
}

# Parámetros del modelo físico
_INFLOW_LIQ  = 1.2    # %/s entrada líquido
_INFLOW_GAS  = 0.8    # PSIG/s acumulación gas
_MAX_DRAIN   = 2.0    # %/s máximo drenaje (válvula 100%)
_MAX_VENT    = 1.5    # PSIG/s máximo venteo  (válvula 100%)
_DT          = 0.5    # segundos entre muestras


def _leer_simulado() -> dict:
    """
    Simula la lectura de sensores industriales con física realista.
    Reemplazar por _leer_modbus() cuando el DAQ esté disponible.
    """
    global _t
    _t += _DT
    t = _t
    n = random.gauss

    # Obtener apertura de válvulas desde la DB (la app.py las controla)
    pid_rows = db_exec("SELECT instrumento, CV FROM configuracion_actual")
    cv_map = {}
    if pid_rows:
        for r in pid_rows:
            cv_map[r["instrumento"]] = float(r.get("CV") or 0.0)

    lcv_pct = cv_map.get("LIC-01", 50.0) / 100.0
    pcv_pct = cv_map.get("PIC-01", 50.0) / 100.0

    # Nivel del separador
    liq_in  = _INFLOW_LIQ * _DT
    liq_out = _MAX_DRAIN  * lcv_pct * _DT
    _sim["level"] += (liq_in - liq_out) + n(0, 0.05)
    _sim["level"]  = max(0.0, min(100.0, _sim["level"]))

    # Presión del separador
    gas_in  = _INFLOW_GAS * _DT
    gas_out = _MAX_VENT   * pcv_pct * _DT
    _sim["pressure"] += (gas_in - gas_out) + n(0, 0.1)
    _sim["pressure"]  = max(0.0, min(200.0, _sim["pressure"]))

    return {
        "FI-03":       round(0.64  + 0.15 * math.sin(t / 20) + n(0, 0.01),  3),
        "PI-01":       round(_sim["pressure"],                                2),
        "TI-01":       round(18.75 + 1.5  * math.sin(t / 30) + n(0, 0.05),  2),
        "LI-01":       round(_sim["level"],                                   2),
        "PDI-01":      round(313.53 + 10.0 * math.sin(t / 25) + n(0, 1.0),  2),
        "PDI-03":      0.0,
        "PDI-02-dp":   round(7.81  + 0.5  * math.sin(t / 18) + n(0, 0.05),  2),
        "PDI-02-psig": round(37.50 + 1.0  * math.sin(t / 18) + n(0, 0.02),  2),
        "TI-02":       round(9.38  + 0.5  * math.sin(t / 20) + n(0, 0.02),  2),
        "GAS-01":      round(25.0  + 2.0  * math.sin(t / 12) + n(0, 0.1),   2),
        "VI-01":       round(0.10  + 0.02 * math.sin(t / 40) + n(0, 0.002), 3),
    }


# ─────────────────────────────────────────────────────────────
# Lectura Modbus REAL (preparado, desactivado)
# ─────────────────────────────────────────────────────────────
def _leer_modbus() -> dict:
    """
    Lee registros Modbus reales desde el DAQ.
    Descomentar y ajustar cuando el hardware esté disponible.

    Tipos de registro soportados:
      · read_holding_registers  (función 03)  – más común
      · read_input_registers    (función 04)  – solo lectura
    """
    raise NotImplementedError(
        "Modbus real no configurado. Usa MODO_SIMULACION = True."
    )

    # ── EJEMPLO Modbus TCP ──────────────────────────────────
    # client = ModbusTcpClient(MODBUS_HOST, port=MODBUS_PORT, timeout=MODBUS_TIMEOUT)
    # if not client.connect():
    #     raise ConnectionError(f"No se pudo conectar al DAQ {MODBUS_HOST}:{MODBUS_PORT}")
    #
    # lecturas = {}
    # for reg_addr, (nombre, escala, offset) in REGISTRO_MAP.items():
    #     resp = client.read_holding_registers(reg_addr, count=1, slave=MODBUS_UNIT)
    #     if not resp.isError():
    #         raw = resp.registers[0]
    #         lecturas[nombre] = round(raw / escala + offset, 3)
    #     else:
    #         lecturas[nombre] = None
    #         log.warning(f"Error leyendo reg {reg_addr} ({nombre})")
    #
    # client.close()
    # return lecturas

    # ── EJEMPLO Modbus RTU ──────────────────────────────────
    # client = ModbusSerialClient(
    #     port=MODBUS_COM, baudrate=MODBUS_BAUDRATE, timeout=MODBUS_TIMEOUT
    # )
    # ... (mismo patrón que TCP)


# ─────────────────────────────────────────────────────────────
# Control de modo
# ─────────────────────────────────────────────────────────────
MODO_SIMULACION = True   # ← Cambiar a False cuando el DAQ esté listo

def leer_sensores() -> dict:
    """Fuente de datos unificada: simulación o Modbus real."""
    if MODO_SIMULACION:
        return _leer_simulado()
    else:
        return _leer_modbus()


# ─────────────────────────────────────────────────────────────
# Escritura en MySQL
# ─────────────────────────────────────────────────────────────
# Instrumentos que tienen entrada en configuracion_actual (PID loops)
PID_INSTRUMENTS = {"PI-01": "PIC-01", "LI-01": "LIC-01"}

def escribir_promedio_db(promedios: dict, n_muestras: int):
    """
    Inserta promedios del lote en:
      · configuracion_actual  → UPDATE del PV del lazo PID
      · valores_agregados     → INSERT histórico de todas las variables
    """
    ts = datetime.now()

    # 1. Actualizar PV en configuracion_actual para los lazos PID
    for instr_sensor, instr_pid in PID_INSTRUMENTS.items():
        pv_val = promedios.get(instr_sensor)
        if pv_val is not None:
            db_exec(
                "UPDATE configuracion_actual SET PV=%s, updated_at=NOW() WHERE instrumento=%s",
                (round(float(pv_val), 3), instr_pid),
                fetch=False,
            )
            log.debug(f"  PV {instr_pid} → {pv_val:.3f}")

    # 2. Insertar histórico en valores_agregados
    for nombre, valor in promedios.items():
        if valor is None:
            continue
        db_exec(
            """INSERT INTO valores_agregados
               (instrumento, valor_promedio, n_muestras, fuente, timestamp)
               VALUES (%s, %s, %s, %s, %s)""",
            (nombre, round(float(valor), 4), n_muestras,
             "simulacion" if MODO_SIMULACION else "modbus", ts),
            fetch=False,
        )

    log.info(
        f"✅  Lote #{n_muestras}m  escritas {len(promedios)} vars  "
        f"[{'SIM' if MODO_SIMULACION else 'MODBUS'}]  {ts.strftime('%H:%M:%S')}"
    )


# ─────────────────────────────────────────────────────────────
# Bucle principal de adquisición
# ─────────────────────────────────────────────────────────────
MUESTRAS_POR_LOTE = 5   # Cada 5 muestras → calcula promedio y escribe DB
INTERVALO_MUESTRA = 0.5  # segundos entre muestras (= 2.5 s por lote)

def loop_adquisicion():
    """
    Bucle infinito de adquisición:
      - Lee sensores cada INTERVALO_MUESTRA segundos.
      - Acumula MUESTRAS_POR_LOTE muestras.
      - Calcula promedio del lote.
      - Escribe en MySQL (configuracion_actual + valores_agregados).
    """
    acumulador: dict[str, list] = {}
    n_muestra = 0
    n_lote    = 0

    log.info("=" * 60)
    log.info("  MFM ORINOCO – DAQ / Comunicación Modbus")
    log.info(f"  Modo: {'SIMULACIÓN' if MODO_SIMULACION else 'MODBUS REAL'}")
    log.info(f"  Muestras/lote: {MUESTRAS_POR_LOTE}  Intervalo: {INTERVALO_MUESTRA}s")
    log.info(f"  Período de escritura DB: {MUESTRAS_POR_LOTE * INTERVALO_MUESTRA:.1f}s")
    log.info("=" * 60)

    while True:
        t0 = time.time()
        try:
            # ── Leer sensores ────────────────────────────────
            datos = leer_sensores()
            n_muestra += 1

            # ── Acumular muestras ────────────────────────────
            for nombre, valor in datos.items():
                if valor is None:
                    continue
                acumulador.setdefault(nombre, []).append(float(valor))

            log.debug(
                f"  Muestra {n_muestra % MUESTRAS_POR_LOTE or MUESTRAS_POR_LOTE}"
                f"/{MUESTRAS_POR_LOTE}  "
                + "  ".join(f"{k}={v:.2f}" for k, v in datos.items())
            )

            # ── Cada MUESTRAS_POR_LOTE → escribir DB ────────
            if n_muestra % MUESTRAS_POR_LOTE == 0:
                n_lote += 1
                promedios = {
                    nombre: sum(vals) / len(vals)
                    for nombre, vals in acumulador.items()
                    if vals
                }
                escribir_promedio_db(promedios, MUESTRAS_POR_LOTE)
                acumulador.clear()

        except KeyboardInterrupt:
            log.info("⏹  Adquisición detenida por el usuario.")
            break
        except Exception as e:
            log.error(f"  Error en ciclo DAQ: {e}")

        # Compensar tiempo de ejecución para mantener período exacto
        elapsed = time.time() - t0
        sleep_t = max(0.0, INTERVALO_MUESTRA - elapsed)
        time.sleep(sleep_t)


# ─────────────────────────────────────────────────────────────
# Entry point
# ─────────────────────────────────────────────────────────────
if __name__ == "__main__":
    init_db_pool()
    loop_adquisicion()
