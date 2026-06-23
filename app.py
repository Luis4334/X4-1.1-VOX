"""
MFM ORINOCO – Backend Flask + SoftPLC "Todo en Uno"
=====================================================
Arquitectura de Memoria Compartida:
  - Hilo 1 (ScanEngine): ciclo PLC a 100 ms — lee/escribe el objeto global V
  - Hilo 2 (websocket_updater): lee V pasivamente cada 500 ms y emite vía SocketIO
  - Hilo Flask/SocketIO: sirve la API REST y WebSocket al frontend

Inicia con: python app.py
"""

import sys
import os
import time
import threading
import csv
import io
import logging
from datetime import datetime

from flask import Flask, jsonify, request, send_from_directory, Response
from flask_socketio import SocketIO, emit
from flask_cors import CORS
import mysql.connector
from mysql.connector import pooling

# ─────────────────────────────────────────────────────────────
# PUENTE: inyectar python_migration en sys.path.
# Necesario para que las fases del motor (fase1..fase9, config,
# plc_timers, etc.) se resuelvan entre sí con imports relativos
# durante el runtime, sin modificar esos archivos.
# ─────────────────────────────────────────────────────────────
_MIGRATION_DIR = os.path.join(os.path.dirname(__file__), "python_migration")
if _MIGRATION_DIR not in sys.path:
    sys.path.insert(0, _MIGRATION_DIR)

# Importar usando notación de paquete para satisfacer el linter.
# python_migration/ ya contiene __init__.py, por lo que es un
# paquete Python válido reconocido por el analizador estático.
from python_migration.global_vars import V                          # Memoria compartida única
from python_migration.scan_engine import ScanEngine, PHASE_REGISTRY # Motor de ciclos + fases

# ─────────────────────────────────────────────────────────────
# Logging
# ─────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("orinoco.web")

# ─────────────────────────────────────────────────────────────
# Flask + SocketIO
# ─────────────────────────────────────────────────────────────
app = Flask(__name__, static_folder="static", static_url_path="/static")
app.secret_key = "mfm_orinoco_2024"
CORS(app, resources={r"/*": {"origins": "*"}})
socketio = SocketIO(app, cors_allowed_origins="*", async_mode="threading")

import json
HART_CONFIG_FILE = "hart_config.json"
HART_CONFIG = {
    "mode": "tcp",
    "ip": "192.168.255.1",
    "port": 502,
    "com_port": "COM3",
    "baudrate": 9600,
    "slave_id": 1,
    "start_address": 618
}
try:
    if os.path.exists(HART_CONFIG_FILE):
        with open(HART_CONFIG_FILE, "r") as f:
            loaded = json.load(f)
            # Garantizar que slave_id sea al menos 1 (nunca 0)
            if int(loaded.get('slave_id', 1)) == 0:
                loaded['slave_id'] = 1
            HART_CONFIG.update(loaded)
except Exception:
    pass

# ── Caché del último resultado HART + hilo de polling ────────────
_HART_CACHE_LOCK   = threading.Lock()
_HART_LATEST_RESULTS = {
    i: {
        "connected": False,
        "error": "Deshabilitado" if i > 0 else "Iniciando...",
        "status": 0,
        "pv_current": 0.0,
        "pv1": {"value": 0.0, "unit": "-"},
        "pv2": {"value": 0.0, "unit": "-"},
        "pv3": {"value": 0.0, "unit": "-"},
        "pv4": {"value": 0.0, "unit": "-"},
    }
    for i in range(15)
}
_HART_POLL_INTERVAL = 3.0   # segundos entre lecturas HART

def _hart_background_poller():
    """Hilo daemon que lee los canales HART habilitados de la BD secuencialmente.

    Arquitectura HRT-711 (confirmada con HG Tool v1.6):
      - UN SOLO slave Modbus = el gateway (slave_id de HART_CONFIG, FIJO).
      - Cada instrumento se diferencia por la DIRECCION DE REGISTRO:
          addr = 1300 + (hart_device_index x 10)
      - hart_device_index = N en 'HART Device N' del HG Tool (0-based).
      - hart_device_address = direccion HART fisica en el bus (informativo).

      Ejemplos:
        HART Device 0 -> addr 1300 | HART Device 2 -> addr 1320
    """
    from python_migration.comunicacion_hart import leer_instrumento_hart
    hart_logger = logging.getLogger("orinoco.hart.poller")
    hart_logger.info("Poller HART iniciado (intervalo %.1fs)" % _HART_POLL_INTERVAL)

    while True:
        try:
            # 1. Cargar configuracion de canales desde la BD
            channels = db_exec("SELECT * FROM hart_channel_config ORDER BY channel_idx")
            if not channels:
                # Fallback: solo Device 0 habilitado
                channels = [
                    {
                        "channel_idx":         i,
                        "v_name":              f"HART_CH{i}",
                        "description":         f"Instrumento HART {i+1}",
                        "hart_device_index":   i,
                        "hart_device_address": i + 1,
                        "enabled":             1 if i == 0 else 0
                    }
                    for i in range(15)
                ]

            # 2. Pollear cada canal habilitado secuencialmente
            for ch in channels:
                idx = int(ch["channel_idx"])

                if not ch.get("enabled", 1):
                    with _HART_CACHE_LOCK:
                        _HART_LATEST_RESULTS[idx] = {
                            "connected": False, "error": "Deshabilitado",
                            "status": 0, "pv_current": 0.0,
                            "pv1": {"value": 0.0, "unit": "-"},
                            "pv2": {"value": 0.0, "unit": "-"},
                            "pv3": {"value": 0.0, "unit": "-"},
                            "pv4": {"value": 0.0, "unit": "-"},
                        }
                    continue

                # hart_device_index = N en 'HART Device N' del HG Tool
                # Si la columna no existe en la BD, usar channel_idx como fallback
                dev_index = ch.get('hart_device_index')
                if dev_index is None:
                    dev_index = idx   # fallback
                dev_index = int(dev_index)

                # slave_id = slave del GATEWAY (el mismo para TODOS los canales)
                gateway_slave = max(1, int(HART_CONFIG.get('slave_id', 1)))

                # instrument_type = rol fijo del slot (determina inyeccion en V)
                instrument_type = ch.get('instrument_type', 'NONE') or 'NONE'

                cfg = {
                    'mode':                HART_CONFIG.get('mode', 'tcp'),
                    'ip':                  HART_CONFIG.get('ip', '192.168.255.1'),
                    'port':                int(HART_CONFIG.get('port', 502)),
                    'com_port':            HART_CONFIG.get('com_port', 'COM3'),
                    'baudrate':            int(HART_CONFIG.get('baudrate', 9600)),
                    'slave_id':            gateway_slave,
                    'hart_device_index':   dev_index,
                    'hart_device_address': ch.get('hart_device_address', dev_index + 1),
                    'instrument_type':     instrument_type,   # Rol fijo: LAMINAR_A, WEDGE_LIQ...
                }

                hart_logger.debug(
                    f"[Poller] CH{idx} '{ch.get('description','')}' "
                    f"-> Device{dev_index} addr={1300 + dev_index * 10} slave={gateway_slave}"
                )

                result = leer_instrumento_hart(cfg)

                with _HART_CACHE_LOCK:
                    _HART_LATEST_RESULTS[idx] = result

                # Retardo entre lecturas para no saturar el bus HART
                time.sleep(0.5)

        except Exception as ex:
            hart_logger.error(f"[Poller] Error inesperado en loop HART: {ex}")

        time.sleep(_HART_POLL_INTERVAL)


# ─────────────────────────────────────────────────────────────
# MySQL Pool (XAMPP → puerto 3306)
# ─────────────────────────────────────────────────────────────
DB_CONFIG = dict(
    host="localhost", port=3306,
    user="root", password="",
    database="x4", charset="utf8mb4",
    connection_timeout=10,
)

try:
    db_pool = pooling.MySQLConnectionPool(pool_name="mfm", pool_size=5, **DB_CONFIG)
    logger.info("✅  MySQL pool OK")
except Exception as _e:
    logger.warning(f"⚠️  MySQL no disponible: {_e}")
    db_pool = None


def get_conn():
    if db_pool:
        try:
            return db_pool.get_connection()
        except Exception:
            pass
    return mysql.connector.connect(**DB_CONFIG)


def db_exec(sql, params=None, fetch=True):
    """Ejecuta SQL; retorna filas si fetch=True, lastrowid si fetch=False."""
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
        logger.debug(f"DB error: {e}")
        if conn and not fetch:
            try: conn.rollback()
            except Exception: pass
        return None
    finally:
        if cur:  cur.close()
        if conn: conn.close()


# ─────────────────────────────────────────────────────────────
# HILO 1: Motor del SoftPLC (100 ms)
# El ScanEngine ya gestiona su propio hilo internamente mediante
# start() → _scan_loop() en modo daemon. Solo lo instanciamos y
# registramos las fases antes de arrancarlo.
# ─────────────────────────────────────────────────────────────
plc_engine = ScanEngine()
plc_engine.register_phases(PHASE_REGISTRY)


# ─────────────────────────────────────────────────────────────
# Carga de configuración DAQ desde BD
# Se ejecuta al iniciar: restaura el último puerto/baudrate guardado.
# ─────────────────────────────────────────────────────────────
def _load_daq_connection_from_db():
    """Lee la tabla daq_connection_config y aplica los parámetros al módulo modbus_daq."""
    import python_migration.modbus_daq as _mdaq
    rows = db_exec("SELECT * FROM daq_connection_config WHERE id=1")
    if not rows:
        logger.info("🔌 DAQ: usando parámetros por defecto (tabla vacía)")
        return
    r = rows[0]
    _mdaq.DAQ_PORT     = str(r.get("port",     _mdaq.DAQ_PORT))
    _mdaq.DAQ_BAUDRATE = int(r.get("baudrate", _mdaq.DAQ_BAUDRATE))
    _mdaq.DAQ_SLAVE_ID = int(r.get("slave_id", _mdaq.DAQ_SLAVE_ID))
    timeout_ms = int(r.get("timeout_ms", 80))
    _mdaq.DAQ_TIMEOUT  = timeout_ms / 1000.0
    logger.info(f"✅ DAQ config cargada: {_mdaq.DAQ_PORT} @ {_mdaq.DAQ_BAUDRATE} baud, slave={_mdaq.DAQ_SLAVE_ID}")


def _load_daq_channels_from_db():
    """Lee la tabla daq_channel_config y aplica los parámetros a los módulos fase2_entradas."""
    try:
        import sys
        rows = db_exec("SELECT * FROM daq_channel_config ORDER BY channel_addr")
        if not rows:
            logger.info("🔌 DAQ Canales: usando mapa por defecto (tabla vacía)")
            return
        
        new_map = []
        for r in rows:
            if r.get("enabled", 1):
                phys_addr = r.get("modbus_addr")
                if phys_addr is None:
                    phys_addr = r["channel_addr"]
                new_map.append((
                    r["v_name"],
                    int(phys_addr),
                    float(r.get("scale", 1000.0)),
                    r["description"]
                ))
        
        if new_map:
            import python_migration.fase2_entradas as _f2
            
            # Actualizar en el módulo importado por Flask
            _f2._INPUT_MAP = new_map
            _f2.V._daq_channel_snapshot = [
                {
                    "ch":        entry[1],
                    "var":       entry[0],
                    "desc":      entry[3],
                    "raw":       None,
                    "ma":        None,
                    "open_wire": True,
                }
                for entry in new_map
            ]
            
            # Actualizar en el módulo importado por ScanEngine
            _f2_se = sys.modules.get('fase2_entradas')
            if _f2_se:
                _f2_se._INPUT_MAP = new_map
                if hasattr(_f2_se, 'V'):
                    _f2_se.V._daq_channel_snapshot = _f2.V._daq_channel_snapshot
            
            logger.info(f"✅ DAQ Canales cargados/actualizados de BD: {new_map}")
    except Exception as e:
        logger.error(f"⚠️ Error cargando canales de la BD: {e}")


# ─────────────────────────────────────────────────────────────
# HILO 2: WebSocket Updater (500 ms)
# Lee pasivamente el objeto V (memoria compartida) y emite los
# datos de proceso al frontend. NO escribe en V.
# ─────────────────────────────────────────────────────────────
def websocket_updater():
    """
    Publica el estado del proceso hacia el frontend cada 500 ms.
    Lee variables directamente del objeto global V del SoftPLC.

    Mapeo de variables V → Tags de display:
      V.r_T_Gas       → TI_02   (Temperatura Gas)
      V.r_Q_GAT       → GAS_01  (Caudal GAT)
      V.r_WC          → VI_01   (Corte de agua)
    """
    logger.info("  WebSocket Updater activo (500 ms)")
    loop_count = 0

    while True:
        try:
            # ── Leer datos de proceso desde V (solo lectura) ──
            process_data = {
                "r_Q_gas_STD": round(V.r_Q_gas_STD,           3),   # Caudal de gas standard
                "r_P_Gas":     round(V.r_P_Gas,               2),   # Presión de gas
                "r_T_Gas":     round(V.r_T_Gas,               2),   # Temp gas
                "r_LIT_001":   round(V.r_LIT_001,             2),   # Nivel Separador
                "PDI_01":      round(V.r_PDT_01,              2),   # Laminar A (PDI-01)
                "r_PDT_02":    round(V.r_PDT_02,              2),   # Wedge liquido en inh2o
                "PDI_03":      round(V.r_PDT_03,              2),   # Laminar B
                "r_P_Oil":     round(V.r_P_Oil,               2),   # Presión de crudo (Wedge liquido)
                "r_T_Oil_C":   round(V.r_T_Oil_C,             2),   # Temp crudo °C (Wedge liquido temp)
                "r_T_oil_F":   round(V.r_T_Oil_F,             2),   # Temp crudo °F
                "r_GVoidF":    round(V.r_GVoidF,              3),   # % Fracción de gas
                "r_v_oil_medida": round(V.r_v_oil_medida,     3),   # Viscosidad
                "r_WC":        round(V.r_WC,                  2),   # WC Corte de Agua
                "r_nivel_aux": round(V.r_nivel_aux,           2),   # Nivel aux
                "r_Q_gas":     round(V.r_Q_gas,               3),   # Caudal de gas calculado
                # ── Tablas inferiores ─────────────────────────────────
                "Est_Q_Liq":   round(V.r_Qb_Liquido_Estimado, 3),   # Est.Qliq
                "Est_Q_Crudo": round(V.r_Q_Crudo_Estimado,    3),   # Est.Q.Crudo
                "Est_Q_Neto":  round(V.r_Q_Crudo_Neto_Estimado, 3), # Est.Q.Neto
                "Est_Q_Dil":   round(V.r_Qb_Liquido_sc_Estimado, 3),# Est.Q.Diluente (Qb_sc_Est)
                "Est_Q_Agua":  round(V.r_Q_W_Estimado,        3),   # Est.QAgua
                "Est_Q_Gas":   round(V.r_Q_gas_T_sc,          3),   # Est.Q.Gas Total STD
                "Q_Liq":       round(V.r_Q_Liquido,           3),   # Q.Liq
                "Q_Crudo":     round(V.r_Q_Crudo,             3),   # Q.Crudo
                "Q_Neto":      round(V.r_Q_Crudo - V.r_caudal_dil_BM, 3), # Q.Neto
                "Q_Agua":      round(V.r_Q_W,                 3),   # Q.Agua (mapeado a r_Q_W)
                "Q_Dil":       round(V.r_caudal_dil_BM,       3),   # Q.Diluente
                "Q_Gas":       round(V.r_Q_gas_STD,           3),   # Q.Gas (mapeado a r_Q_gas_STD)
                # ── Extras ───────────────────────────────────────────
                "Q_W":         round(V.r_Q_W,                 3),
                "Q_gas_STD":   round(V.r_Q_gas_STD,           3),
                "GOR":         round(V.r_GOR,                 2),
                "WC_sc":       round(V.r_WC_sc,               3),
                "GVF":         round(V.r_GVF,                 3),
                "timestamp":   datetime.now().strftime("%H:%M:%S"),
            }

            # ── Estado de los lazos PID del SoftPLC ──
            pid_nivel_data = {
                "instrumento": "LIC-01",
                "modo":        "Auto" if not V.b_MAN_LC else "Manual",
                "PV":          round(V.r_LIT_001, 2),
                "SP":          round(V.r_LEVEL_PID_SP, 2),
                "CV":          round(V.fb_PRESS_PID_r_CVEU, 2),
                "CV_manual":   round(V.r_LEVEL_PID_03_CVOverride, 2),
                "Kp":          round(V.r_LEVEL_PID_03_KP, 4),
                "Ki":          round(V.r_LEVEL_PID_03_KI, 4),
                "Kd":          round(V.r_LEVEL_PID_03_KD, 4),
            }

            pid_presion_data = {
                "instrumento": "PIC-01",
                "modo":        "Auto" if not V.b_MAN_PC else "Manual",
                "PV":          round(V.r_P_Gas, 2),
                "SP":          round(V.r_PRESS_PID_SP, 2),
                "CV":          round(V.fb_LEVEL_PID_r_CVEU, 2),
                "CV_manual":   round(V.r_PRESS_PID_03_CVOverride, 2),
                "Kp":          round(V.r_PRESS_PID_03_KP, 4),
                "Ki":          round(V.r_PRESS_PID_03_KI, 4),
                "Kd":          round(V.r_PRESS_PID_03_KD, 4),
            }

            # ── Estado del Motor PLC ──
            plc_status = plc_engine.get_status()

            # ── Emitir todo al frontend vía SocketIO ──
            socketio.emit("process_data", {
                "process":      process_data,
                "pid_nivel":    pid_nivel_data,
                "pid_presion":  pid_presion_data,
                "plc":          plc_status,
                "lazos_habilitados": not V.b_DESHABILITA_PID,
                "db_ok":        db_pool is not None,
            })

            # ── Guardar histórico en DB cada 10 s (10 × 1000 ms ciclo) ──
            loop_count += 1
            if loop_count >= 10:
                loop_count = 0
                _persist_lecturas(process_data)

        except Exception as e:
            logger.error(f"WebSocket Updater error: {e}")

        time.sleep(0.5)


def _persist_lecturas(data: dict):
    """Inserta snapshot de proceso en lecturas_proceso (cada ~5 s)."""
    mapping = {
        "FI-03": "r_Q_gas_STD",
        "PI-01": "r_P_Gas",
        "TI-01": "r_T_Oil_C",
        "LI-01": "r_LIT_001",
        "PDI-01": "PDI_01",
        "PDI-03": "PDI_03",
        "PDI-02": "r_PDT_02",
        "TI-02": "r_T_Gas",
        "GAS-01": "r_GVoidF",
        "VI-01": "r_v_oil_medida"
    }
    vals = []
    for db_tag, data_key in mapping.items():
        vals.extend([db_tag, float(data.get(data_key, 0))])
    placeholders = ", ".join(["(%s, %s)"] * len(mapping))
    db_exec(
        f"INSERT INTO lecturas_proceso (instrumento, valor) VALUES {placeholders}",
        tuple(vals), fetch=False
    )


# ─────────────────────────────────────────────────────────────
# Rutas HTTP estáticas
# ─────────────────────────────────────────────────────────────

@app.route("/")
def index():
    return send_from_directory(".", "index.html")


@app.route("/api/status")
def api_status():
    return jsonify({
        "ok":  True,
        "ts":  datetime.now().isoformat(),
        "plc": plc_engine.get_status(),
    })


# ─────────────────────────────────────────────────────────────
# API DE COMANDOS MANUALES — Escritura directa en V
# El operador web interactúa con el SoftPLC a través de estas
# rutas. Flask simplemente sobrescribe el valor en la memoria
# compartida; el ScanEngine lo leerá en el próximo ciclo.
# ─────────────────────────────────────────────────────────────

@app.route("/api/pid/<tag>", methods=["GET"])
def get_pid(tag):
    """Devuelve el estado actual de un lazo PID desde la memoria V."""
    tag = tag.upper().replace("_", "-")
    if tag == "LIC-01":
        return jsonify({
            "instrumento": "LIC-01",
            "modo":       "Auto" if not V.b_MAN_LC else "Manual",
            "PV":         round(V.r_LIT_001, 2),
            "SP":         round(V.r_LEVEL_PID_SP, 2),
            "CV":         round(V.fb_LEVEL_PID_r_CVEU, 2),
            "CV_manual":  round(V.r_LEVEL_PID_03_CVOverride, 2),
            "Kp":         V.r_LEVEL_PID_03_KP,
            "Ki":         V.r_LEVEL_PID_03_KI,
            "Kd":         V.r_LEVEL_PID_03_KD,
        })
    elif tag == "PIC-01":
        return jsonify({
            "instrumento": "PIC-01",
            "modo":       "Auto" if not V.b_MAN_PC else "Manual",
            "PV":         round(V.r_P_Gas, 2),
            "SP":         round(V.r_PRESS_PID_SP, 2),
            "CV":         round(V.fb_PRESS_PID_r_CVEU, 2),
            "CV_manual":  round(V.r_PRESS_PID_03_CVOverride, 2),
            "Kp":         V.r_PRESS_PID_03_KP,
            "Ki":         V.r_PRESS_PID_03_KI,
            "Kd":         V.r_PRESS_PID_03_KD,
        })
    return jsonify({"error": "Tag no encontrado. Use LIC-01 o PIC-01"}), 404


@app.route("/api/pid/<tag>", methods=["POST"])
def post_pid(tag):
    """
    Envía comandos de operador al SoftPLC sobrescribiendo V directamente.
    Payload JSON soportado:
      { "modo": "Auto"|"Manual", "SP": float, "CV_manual": float,
        "Kp": float, "Ki": float, "Kd": float }
    """
    tag = tag.upper().replace("_", "-")
    d = request.get_json() or {}

    if tag == "LIC-01":
        if "modo" in d:
            V.b_MAN_LC = (d["modo"] == "Manual")
        if "SP"       in d: V.r_LEVEL_PID_SP              = float(d["SP"])
        if "CV_manual" in d: V.r_LEVEL_PID_03_CVOverride  = float(d["CV_manual"])
        if "Kp"       in d: V.r_LEVEL_PID_03_KP           = float(d["Kp"])
        if "Ki"       in d: V.r_LEVEL_PID_03_KI           = float(d["Ki"])
        if "Kd"       in d: V.r_LEVEL_PID_03_KD           = float(d["Kd"])
        # Persistir en DB para recuperación tras reinicio
        db_exec(
            "UPDATE configuracion_actual SET modo=%s,SP=%s,CV_manual=%s,Kp=%s,Ki=%s,Kd=%s WHERE instrumento=%s",
            ("Manual" if V.b_MAN_LC else "Auto", V.r_LEVEL_PID_SP,
             V.r_LEVEL_PID_03_CVOverride, V.r_LEVEL_PID_03_KP,
             V.r_LEVEL_PID_03_KI, V.r_LEVEL_PID_03_KD, "LIC-01"),
            fetch=False
        )
        return jsonify({"ok": True, "instrumento": "LIC-01",
                        "b_MAN_LC": V.b_MAN_LC, "SP": V.r_LEVEL_PID_SP})

    elif tag == "PIC-01":
        if "modo" in d:
            V.b_MAN_PC = (d["modo"] == "Manual")
        if "SP"       in d: V.r_PRESS_PID_SP              = float(d["SP"])
        if "CV_manual" in d: V.r_PRESS_PID_03_CVOverride  = float(d["CV_manual"])
        if "Kp"       in d: V.r_PRESS_PID_03_KP           = float(d["Kp"])
        if "Ki"       in d: V.r_PRESS_PID_03_KI           = float(d["Ki"])
        if "Kd"       in d: V.r_PRESS_PID_03_KD           = float(d["Kd"])
        db_exec(
            "UPDATE configuracion_actual SET modo=%s,SP=%s,CV_manual=%s,Kp=%s,Ki=%s,Kd=%s WHERE instrumento=%s",
            ("Manual" if V.b_MAN_PC else "Auto", V.r_PRESS_PID_SP,
             V.r_PRESS_PID_03_CVOverride, V.r_PRESS_PID_03_KP,
             V.r_PRESS_PID_03_KI, V.r_PRESS_PID_03_KD, "PIC-01"),
            fetch=False
        )
        return jsonify({"ok": True, "instrumento": "PIC-01",
                        "b_MAN_PC": V.b_MAN_PC, "SP": V.r_PRESS_PID_SP})

    return jsonify({"error": "Tag no encontrado. Use LIC-01 o PIC-01"}), 404


@app.route("/api/plc/lazos", methods=["POST"])
def toggle_lazos():
    """Habilita/deshabilita los lazos PID del SoftPLC vía V.b_DESHABILITA_PID."""
    d = request.get_json() or {}
    if "habilitar" in d:
        V.b_DESHABILITA_PID = not bool(d["habilitar"])
    else:
        V.b_DESHABILITA_PID = not V.b_DESHABILITA_PID
    return jsonify({"lazos_habilitados": not V.b_DESHABILITA_PID})


@app.route("/api/plc/status", methods=["GET"])
def plc_status():
    """Estado en tiempo real del motor SoftPLC."""
    return jsonify(plc_engine.get_status())


@app.route("/api/plc/simulacion", methods=["POST"])
def toggle_simulacion():
    """Activa/desactiva el modo simulación de entradas analógicas en V."""
    d = request.get_json() or {}
    V.b_simular_ai = bool(d.get("simular", not V.b_simular_ai))
    return jsonify({"b_simular_ai": V.b_simular_ai})


# ─────────────────────────────────────────────────────────────
# Calibración de Medidores
# ─────────────────────────────────────────────────────────────

# Tags editables por sección.  Los de solo-lectura se incluyen
# en la respuesta GET pero se ignoran en el POST.
_CALIB_WRITABLE = {
    # Wedge Gas
    "r_D_wedge_gas", "r_h_wedge_gas", "r_k_mp",
    # Wedge Crudo
    "r_D_Wedge", "r_m", "r_K_wedge",
    # Laminar
    "r_d_L", "r_L", "r_N_Tubos",
    "r_AK_L", "r_BK_L", "r_CK_L",
}

@app.route("/api/calibracion", methods=["GET"])
def get_calibracion():
    """Devuelve todos los parámetros de calibración de los medidores."""
    return jsonify({
        # ── Wedge Gas ──
        "r_D_wedge_gas":  getattr(V, "r_D_wedge_gas",  0.0),
        "r_h_wedge_gas":  getattr(V, "r_h_wedge_gas",  0.0),
        "r_k_mp":         getattr(V, "r_k_mp",          0.0),
        "r_DP_gas_PK":    round(getattr(V, "r_DP_gas_PK",   0.0), 3),  # solo lectura
        "r_Beta_mp":      round(getattr(V, "r_Beta_mp",     0.0), 4),  # solo lectura
        "r_Ao_cd":        round(getattr(V, "r_Ao_cd",       0.0), 6),  # solo lectura
        "r_Y1":           round(getattr(V, "r_Y1",          0.0), 4),  # solo lectura
        # ── Wedge Crudo ──
        "r_D_Wedge":      getattr(V, "r_D_Wedge",  0.0),
        "r_m":            getattr(V, "r_m",          0.0),
        "r_K_wedge":      getattr(V, "r_K_wedge",   1.0),
        "r_PDT_02":       round(getattr(V, "r_PDT_02",  0.0), 3),      # solo lectura
        "r_RE_W":         round(getattr(V, "r_RE_W",    0.0), 1),      # solo lectura
        "r_Qb_Liquido_W": round(getattr(V, "r_Qb_Liquido_W", 0.0), 1),# solo lectura
        # ── Laminar ──
        "r_d_L":          getattr(V, "r_d_L",    0.0),
        "r_L":            getattr(V, "r_L",      0.0),
        "r_N_Tubos":      getattr(V, "r_N_Tubos", 0.0),
        "r_AK_L":         getattr(V, "r_AK_L",   0.0),
        "r_BK_L":         getattr(V, "r_BK_L",   0.0),
        "r_CK_L":         getattr(V, "r_CK_L",   0.0),
        "r_PDT_03":       round(getattr(V, "r_PDT_03", 0.0), 3),       # solo lectura
        "r_PDT_01":       round(getattr(V, "r_PDT_01", 0.0), 3),       # solo lectura
        "r_RE_L":         round(getattr(V, "r_RE_L",   0.0), 1),       # solo lectura
        "r_Qb_Liquido_L": round(getattr(V, "r_Qb_Liquido_L", 0.0), 1),# solo lectura
    })


@app.route("/api/calibracion", methods=["POST"])
def set_calibracion():
    """Escribe los parámetros de calibración editables directamente en V."""
    d = request.get_json() or {}
    updated = []
    for key, val in d.items():
        if key in _CALIB_WRITABLE and hasattr(V, key):
            try:
                setattr(V, key, float(val))
                updated.append(key)
            except (TypeError, ValueError):
                pass
    return jsonify({"ok": True, "updated": updated})


# ─────────────────────────────────────────────────────────────
# Alarmas
# ─────────────────────────────────────────────────────────────

@app.route("/api/alarmas")
def get_alarmas():
    rows = db_exec("SELECT * FROM tabla_configuracion_alarma ORDER BY instrumento")
    return jsonify(rows or [])


@app.route("/api/alarmas/<instrumento>", methods=["GET"])
def get_alarma(instrumento):
    rows = db_exec("SELECT * FROM tabla_configuracion_alarma WHERE instrumento=%s",
                   (instrumento.upper(),))
    return jsonify(rows[0] if rows else {}), (200 if rows else 404)


@app.route("/api/alarmas/<instrumento>", methods=["POST"])
def post_alarma(instrumento):
    d = request.get_json() or {}
    db_exec(
        """UPDATE tabla_configuracion_alarma
           SET minimo=%s,maximo=%s,SP_HH=%s,SP_H=%s,SP_L=%s,SP_LL=%s,
               DB=%s,RAW_H=%s,RAW_L=%s,modo_manual=%s,valor_manual=%s
           WHERE instrumento=%s""",
        (d.get("minimo"), d.get("maximo"), d.get("SP_HH"), d.get("SP_H"),
         d.get("SP_L"), d.get("SP_LL"), d.get("DB"), d.get("RAW_H"), d.get("RAW_L"),
         int(bool(d.get("modo_manual", 0))), d.get("valor_manual"),
         instrumento.upper()),
        fetch=False
    )
    # Si modo manual activo, escribir valor en V inmediatamente
    _apply_manual_override(instrumento.upper(), d.get("modo_manual", 0), d.get("valor_manual"))
    return jsonify({"ok": True})


def _apply_manual_override(instrumento, modo_manual, valor_manual):
    """Escribe el valor manual en la variable V del SoftPLC si modo_manual=1."""
    # Mapa instrumento → atributo en V
    _TAG_MAP = {
        "FI-03":   "r_Q_gas_STD",
        "GAS-01":  "r_GVoidF",
        "LI-01":   "r_LIT_001",
        "PDI-01":  "r_PDT_01",
        "PDI-02":  "r_PDT_02",
        "PDI-03":  "r_PDT_03",
        "PI-01":   "r_P_Gas",
        "TI-01":   "r_T_Oil_C",
        "TI-02":   "r_T_Gas",
        "VI-01":   "r_v_oil_medida",
        "WC":      "r_WC",
        "NIV-AUX": "r_nivel_aux",
    }
    tag = _TAG_MAP.get(instrumento)
    if tag and modo_manual and valor_manual is not None:
        try:
            setattr(V, tag, float(valor_manual))
        except Exception:
            pass



# ─────────────────────────────────────────────────────────────
# Reportes / Histórico
# ─────────────────────────────────────────────────────────────

@app.route("/api/reportes/descargar", methods=["GET"])
def descargar_reporte():
    f_inicio = request.args.get("inicio")
    f_fin    = request.args.get("fin")
    query = "SELECT * FROM lecturas_proceso"
    params = []
    if f_inicio and f_fin:
        query  += " WHERE timestamp BETWEEN %s AND %s"
        params.extend([f_inicio, f_fin])
    query += " ORDER BY timestamp DESC LIMIT 5000"
    rows = db_exec(query, tuple(params))

    si = io.StringIO()
    si.write('\ufeff')
    cw = csv.writer(si, delimiter=';')
    cw.writerow(["ID", "Instrumento", "Valor", "Timestamp"])
    if rows:
        for r in rows:
            cw.writerow([r["id"], r["instrumento"], round(r["valor"], 3), r["timestamp"]])
    else:
        cw.writerow(["Sin datos para el rango seleccionado", "", "", ""])
    output = si.getvalue()
    si.close()
    return Response(output, mimetype="text/csv",
                    headers={"Content-Disposition": "attachment;filename=Reporte_MFM_Orinoco.csv"})


@app.route("/api/valores_agregados", methods=["GET"])
def get_valores_agregados():
    instrumento = request.args.get("instrumento")
    limit       = min(int(request.args.get("limit", 200)), 2000)
    query  = "SELECT * FROM valores_agregados"
    params = []
    if instrumento:
        query  += " WHERE instrumento=%s"
        params  = [instrumento.upper()]
    query += " ORDER BY timestamp DESC LIMIT %s"
    params.append(limit)
    rows = db_exec(query, tuple(params))
    return jsonify(rows or [])


@app.route("/api/modbus/status", methods=["GET"])
def get_modbus_status():
    row = db_exec(
        "SELECT instrumento, valor_promedio, fuente, timestamp "
        "FROM valores_agregados ORDER BY timestamp DESC LIMIT 1"
    )
    if not row:
        return jsonify({"activo": False, "mensaje": "Sin datos del DAQ aún"})
    r   = row[0]
    ts  = r["timestamp"]
    diff = (datetime.now() - ts).total_seconds() if ts else 9999
    return jsonify({
        "activo":       diff < 30,
        "ultimo_dato":  str(ts),
        "fuente":       r["fuente"],
        "antiguedad_s": round(diff, 1),
    })



# ─────────────────────────────────────────────────────────────
# API DAQ — Configuración y Estado en Tiempo Real
# ─────────────────────────────────────────────────────────────

@app.route("/api/daq/live", methods=["GET"])
def daq_live():
    """
    Retorna el snapshot en vivo de los 6 canales AI de la DAQ.
    Detecta 'stale data': si no hubo read exitoso en los últimos 5 s
    se reporta connected=False aunque el cliente Modbus no haya fallado.
    """
    import time as _time
    import python_migration.modbus_daq as _mdaq
    import python_migration.fase2_entradas as _f2

    # IMPORTANTE: leer el snapshot desde el módulo del PLC directamente.
    # 'V' en app.py es 'python_migration.global_vars.V' mientras que
    # el scan engine usa 'global_vars.V' (distinto por sys.path dual).
    # Los atributos _daq_channel_snapshot y _daq_last_success viven en
    # el V del scan engine, accesible vía _f2.V
    _V_plc      = _f2.V
    snapshot     = getattr(_V_plc, "_daq_channel_snapshot", None)
    last_success = getattr(_V_plc, "_daq_last_success", None)
    STALE_LIMIT  = 5.0

    if last_success is None:
        data_age_s = 0.0
        stale      = False
    else:
        data_age_s = _time.monotonic() - last_success
        stale      = data_age_s > STALE_LIMIT

    connected = (not _V_plc.b_Error_DAQ) and (not stale)

    # Si no hay snapshot todavía, construirlo desde el mapa de canales
    if not snapshot:
        snapshot = [
            {"ch": addr, "var": var_name, "desc": desc,
             "raw": None, "ma": None, "open_wire": True}
            for (var_name, addr, _escala, desc) in _f2._INPUT_MAP
        ]

    # Si los datos son stale, marcar todos como open-wire
    if stale:
        snapshot = [dict(ch=c["ch"], var=c.get("var",""), desc=c.get("desc",""),
                         raw=None, ma=None, open_wire=True) for c in snapshot]
        _V_plc.b_Error_DAQ = True

    cooldown_left = max(0.0, _mdaq.RECONNECT_COOLDOWN -
                        (_time.monotonic() - _mdaq._last_attempt))

    last_error = _mdaq._last_error
    if stale and not last_error:
        last_error = f"Sin datos hace {round(data_age_s, 1)} s"

    return jsonify({
        "connected":   connected,
        "stale":       stale,
        "data_age_s":  round(data_age_s, 1),
        "port":        _mdaq.DAQ_PORT,
        "baudrate":    _mdaq.DAQ_BAUDRATE,
        "slave_id":    _mdaq.DAQ_SLAVE_ID,
        "simulating":  V.b_simular_ai,
        "channels":    snapshot,
        "last_error":  last_error,
        "retry_in_s":  round(cooldown_left, 1),
        "ts":          datetime.now().strftime("%H:%M:%S"),
    })



@app.route("/api/daq/config", methods=["GET"])
def daq_get_config():
    """Lee la configuración de canales desde la BD (tabla daq_channel_config)."""
    rows = db_exec("SELECT * FROM daq_channel_config ORDER BY channel_addr")
    return jsonify(rows or [])


@app.route("/api/daq/config", methods=["POST"])
def daq_save_config():
    """
    Guarda (UPSERT) la configuración de un canal en la BD.
    Payload: { channel_addr, v_name, description, scale, eu_min, eu_max, enabled, modbus_addr }
    """
    d = request.get_json() or {}
    required = ["channel_addr", "v_name", "description"]
    if not all(k in d for k in required):
        return jsonify({"error": "Faltan campos requeridos"}), 400

    db_exec(
        """INSERT INTO daq_channel_config
             (channel_addr, v_name, description, scale, eu_min, eu_max, enabled, modbus_addr)
           VALUES (%s,%s,%s,%s,%s,%s,%s,%s)
           ON DUPLICATE KEY UPDATE
             v_name=%s, description=%s, scale=%s,
             eu_min=%s, eu_max=%s, enabled=%s, modbus_addr=%s, updated_at=NOW()""",
        (
            int(d["channel_addr"]),
            d["v_name"], d["description"],
            float(d.get("scale", 1000.0)),
            float(d.get("eu_min", 4.0)),
            float(d.get("eu_max", 20.0)),
            bool(d.get("enabled", True)),
            int(d.get("modbus_addr", d["channel_addr"])),
            # ON DUPLICATE KEY values:
            d["v_name"], d["description"],
            float(d.get("scale", 1000.0)),
            float(d.get("eu_min", 4.0)),
            float(d.get("eu_max", 20.0)),
            bool(d.get("enabled", True)),
            int(d.get("modbus_addr", d["channel_addr"])),
        ),
        fetch=False,
    )
    
    # Recargar la configuración en caliente
    _load_daq_channels_from_db()
    
    return jsonify({"ok": True, "channel_addr": d["channel_addr"]})


@app.route("/api/daq/connection", methods=["GET"])
def daq_get_connection():
    """Devuelve la configuración de conexión guardada en BD."""
    import python_migration.modbus_daq as _mdaq
    rows = db_exec("SELECT * FROM daq_connection_config WHERE id=1")
    if rows:
        return jsonify(rows[0])
    # Fallback: valores actuales del módulo
    return jsonify({
        "id": 1, "port": _mdaq.DAQ_PORT, "baudrate": _mdaq.DAQ_BAUDRATE,
        "slave_id": _mdaq.DAQ_SLAVE_ID, "bytesize": 8, "parity": "N",
        "stopbits": 1, "timeout_ms": int(_mdaq.DAQ_TIMEOUT * 1000),
    })


@app.route("/api/daq/connection", methods=["POST"])
def daq_save_connection():
    """
    1. Guarda la configuración en BD (UPSERT fila id=1)
    2. Aplica los parámetros al módulo modbus_daq en tiempo real
    3. Fuerza reconexion limpia con cooldown = 0
    """
    import sys
    import python_migration.modbus_daq as _mdaq1
    d = request.get_json() or {}

    port     = str(d.get("port",     _mdaq1.DAQ_PORT)).upper()
    baudrate = int(d.get("baudrate", _mdaq1.DAQ_BAUDRATE))
    slave_id = int(d.get("slave_id", _mdaq1.DAQ_SLAVE_ID))
    timeout_ms = int(d.get("timeout_ms", int(_mdaq1.DAQ_TIMEOUT * 1000)))

    # 1. Persistir en BD (UPSERT sobre la fila única id=1)
    db_exec(
        """INSERT INTO daq_connection_config
               (id, port, baudrate, slave_id, timeout_ms)
           VALUES (1, %s, %s, %s, %s)
           ON DUPLICATE KEY UPDATE
               port=%s, baudrate=%s, slave_id=%s, timeout_ms=%s, updated_at=NOW()""",
        (port, baudrate, slave_id, timeout_ms,
         port, baudrate, slave_id, timeout_ms),
        fetch=False,
    )

    # 2. Aplicar a todas las instancias del módulo en tiempo real
    mdaq_instances = [_mdaq1]
    _mdaq2 = sys.modules.get('modbus_daq')
    if _mdaq2:
        mdaq_instances.append(_mdaq2)

    for mdaq in mdaq_instances:
        mdaq.DAQ_PORT     = port
        mdaq.DAQ_BAUDRATE = baudrate
        mdaq.DAQ_SLAVE_ID = slave_id
        mdaq.DAQ_TIMEOUT  = timeout_ms / 1000.0
        # 3. Forzar reconexión limpia inmediata
        mdaq.mark_disconnected()
        mdaq._last_attempt = 0.0

    logger.info(f"📡 DAQ conexión actualizada: {port} @ {baudrate} baud, slave={slave_id}")
    return jsonify({
        "ok":       True,
        "port":     port,
        "baudrate": baudrate,
        "slave_id": slave_id,
        "msg":      f"Guardado en BD y reconectando a {port}...",
    })

@app.route("/api/daq/reboot", methods=["POST"])
def post_daq_reboot():
    """
    Fuerza el reinicio de la comunicación con la DAQ M-7026.
    Libera el puerto COM y restablece el cooldown para reconectar de inmediato.
    """
    try:
        import sys
        mdaq_instances = []
        import python_migration.modbus_daq as _mdaq1
        mdaq_instances.append(_mdaq1)
        
        _mdaq2 = sys.modules.get('modbus_daq')
        if _mdaq2:
            mdaq_instances.append(_mdaq2)
            
        for mdaq in mdaq_instances:
            # 1. Marcar como desconectado (cierra el puerto serial COM activo)
            mdaq.mark_disconnected()
            # 2. Forzar reconexión inmediata en el próximo ciclo del ScanEngine (cooldown = 0)
            mdaq._last_attempt = 0.0
        
        logger.info("[DAQ] Comando de reinicio de puerto/conexión ejecutado. Reconectando...")
        return jsonify({
            "ok": True,
            "message": "Comunicación con la DAQ M-7026 reiniciada. Puerto serial liberado y reconectando..."
        })
    except Exception as e:
        logger.error(f"[DAQ] Error al reiniciar la conexión de la DAQ: {e}")
        return jsonify({
            "ok": False,
            "error": f"Error al reiniciar la conexión: {e}"
        }), 500




# ─────────────────────────────────────────────────────────────
# API HART — Configuración y Estado en Tiempo Real
# ─────────────────────────────────────────────────────────────

@app.route("/api/hart/config", methods=["GET"])
def get_hart_config():
    return jsonify(HART_CONFIG)

@app.route("/api/hart/config", methods=["POST"])
def post_hart_config():
    d = request.get_json() or {}
    HART_CONFIG.update(d)
    try:
        with open(HART_CONFIG_FILE, "w") as f:
            json.dump(HART_CONFIG, f)
    except Exception:
        pass
    return jsonify({"ok": True, "config": HART_CONFIG})

@app.route("/api/hart/reboot", methods=["POST"])
def post_hart_reboot():
    """
    Realiza login y solicita reboot al gateway ICP DAS HRT-711.
    También desconecta la conexión persistente actual para forzar reconexión posterior.
    """
    mode = HART_CONFIG.get("mode", "tcp")
    if mode != "tcp":
        return jsonify({"ok": False, "error": "El reinicio por software solo está disponible en modo TCP/IP."}), 400

    ip = HART_CONFIG.get("ip", "192.168.255.1")
    password = "admin123"  # Contraseña estándar del gateway

    # 1. Forzar desconexión local del poller para que no intente usar el socket mientras se reinicia
    try:
        from python_migration.comunicacion_hart import force_disconnect
        force_disconnect()
    except Exception as e:
        logger.error(f"Error forzando desconexión HART: {e}")

    # 2. Hacer la solicitud HTTP al gateway
    import urllib.request
    import http.cookiejar
    
    cj = http.cookiejar.CookieJar()
    opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))
    
    try:
        login_url = f"http://{ip}/login.cgi?webpwd={password}"
        logger.info(f"[HART] Iniciando login de reinicio en {login_url}")
        req = urllib.request.Request(login_url)
        with opener.open(req, timeout=5) as resp:
            resp.read()
            
        reboot_url = f"http://{ip}/reboot.cgi?mysubmit2=Reboot"
        logger.info(f"[HART] Enviando comando de reboot en {reboot_url}")
        req_reboot = urllib.request.Request(reboot_url)
        # Se usa un timeout corto de 5s; es común que falle si la conexión se cierra inmediatamente tras recibir el comando
        try:
            with opener.open(req_reboot, timeout=5) as resp:
                resp.read()
        except Exception as re:
            # Ignorar si es un reset de conexión normal al reiniciarse
            logger.info(f"[HART] Envío de reboot completado (respuesta recibida/conexión reseteada: {re})")
            
        return jsonify({"ok": True, "message": "Comando de reinicio enviado correctamente al gateway. Guardando cambios y reconectando en 15s."})
    except Exception as e:
        logger.error(f"[HART] Error al reiniciar gateway via HTTP: {e}")
        return jsonify({"ok": False, "error": f"Error de comunicación con el gateway web: {e}"}), 502

@app.route("/api/hart/live", methods=["GET"])
def get_hart_live():
    """Devuelve el último snapshot de los 15 canales HART desde la caché (no bloquea)."""
    with _HART_CACHE_LOCK:
        results_list = [
            {"channel_idx": idx, **res}
            for idx, res in sorted(_HART_LATEST_RESULTS.items())
        ]
    return jsonify(results_list)

@app.route("/api/hart/config/channels", methods=["GET"])
def get_hart_channels_config():
    """Retorna la configuración de los 15 canales HART desde la BD."""
    rows = db_exec("SELECT * FROM hart_channel_config ORDER BY channel_idx")
    return jsonify(rows or [])

@app.route("/api/hart/config/channels", methods=["POST"])
def save_hart_channel_config():
    """
    Guarda (UPSERT) la configuracion de un canal HART en la BD.
    Payload: { channel_idx, v_name, description, hart_device_index, hart_device_address, enabled }

    hart_device_index   = N en 'HART Device N' del HG Tool (0-based).
                          Determina la direccion Modbus: 1300 + N x 10.
    hart_device_address = Direccion HART fisica en el bus (1-15, informativo).
    """
    d = request.get_json() or {}
    required = ["channel_idx", "v_name", "description"]
    if not all(k in d for k in required):
        return jsonify({"error": "Faltan campos requeridos"}), 400

    # hart_device_index = N en 'HART Device N' -> determina direccion Modbus
    dev_index = d.get('hart_device_index')
    if dev_index is None:
        dev_index = int(d["channel_idx"])  # fallback
    dev_index = max(0, int(dev_index))

    # hart_device_address = direccion HART fisica (informativo)
    hart_addr = d.get('hart_device_address')
    if hart_addr is None:
        hart_addr = d.get('slave_id', dev_index + 1)
    hart_addr = max(0, int(hart_addr))

    modbus_addr = 1300 + dev_index * 10

    db_exec(
        """INSERT INTO hart_channel_config
             (channel_idx, v_name, description,
              hart_device_index, hart_device_address, slave_id, enabled, instrument_type)
           VALUES (%s,%s,%s,%s,%s,%s,%s,%s)
           ON DUPLICATE KEY UPDATE
             description=%s,
             hart_device_index=%s, hart_device_address=%s, slave_id=%s,
             enabled=%s, updated_at=NOW()""",
        (
            int(d["channel_idx"]),
            d["v_name"],
            d["description"],
            dev_index,
            hart_addr,
            hart_addr,
            bool(d.get("enabled", True)),
            d.get("instrument_type", "NONE"),
            # ON DUPLICATE KEY: solo actualiza descripcion, device, enabled (NO instrument_type)
            d["description"],
            dev_index,
            hart_addr,
            hart_addr,
            bool(d.get("enabled", True)),
        ),
        fetch=False,
    )
    logger.info(
        f"[HART] Canal {d['channel_idx']} guardado: "
        f"Device{dev_index} modbus_addr={modbus_addr} HART_bus={hart_addr}"
    )
    return jsonify({
        "ok": True,
        "channel_idx":         d["channel_idx"],
        "hart_device_index":   dev_index,
        "hart_device_address": hart_addr,
        "modbus_addr":         modbus_addr,
    })

# ─────────────────────────────────────────────────────────────
# WebSocket Events
# ─────────────────────────────────────────────────────────────

@socketio.on("connect")
def on_connect():
    logger.info(f"🔌 Cliente conectado: {request.sid}")
    # Enviar estado inicial del PID al conectar
    emit("pid_config", {
        "PIC-01": {
            "instrumento": "PIC-01",
            "modo":       "Auto" if not V.b_MAN_PC else "Manual",
            "SP":         V.r_PRESS_PID_SP,
            "Kp":         V.r_PRESS_PID_03_KP,
            "Ki":         V.r_PRESS_PID_03_KI,
            "Kd":         V.r_PRESS_PID_03_KD,
        },
        "LIC-01": {
            "instrumento": "LIC-01",
            "modo":       "Auto" if not V.b_MAN_LC else "Manual",
            "SP":         V.r_LEVEL_PID_SP,
            "Kp":         V.r_LEVEL_PID_03_KP,
            "Ki":         V.r_LEVEL_PID_03_KI,
            "Kd":         V.r_LEVEL_PID_03_KD,
        },
    })


@socketio.on("disconnect")
def on_disconnect():
    logger.info(f"🔌 Cliente desconectado: {request.sid}")


@socketio.on("update_pid")
def ws_update_pid(data):
    """Recibe comandos de ajuste PID desde el frontend vía WebSocket."""
    tag = str(data.get("instrumento", "")).upper()
    if tag == "LIC-01":
        if "modo" in data:       V.b_MAN_LC                  = (data["modo"] == "Manual")
        if "SP" in data:         V.r_LEVEL_PID_SP             = float(data["SP"])
        if "CV_manual" in data:  V.r_LEVEL_PID_03_CVOverride  = float(data["CV_manual"])
        if "Kp" in data:         V.r_LEVEL_PID_03_KP          = float(data["Kp"])
        if "Ki" in data:         V.r_LEVEL_PID_03_KI          = float(data["Ki"])
        if "Kd" in data:         V.r_LEVEL_PID_03_KD          = float(data["Kd"])
    elif tag == "PIC-01":
        if "modo" in data:       V.b_MAN_PC                   = (data["modo"] == "Manual")
        if "SP" in data:         V.r_PRESS_PID_SP             = float(data["SP"])
        if "CV_manual" in data:  V.r_PRESS_PID_03_CVOverride  = float(data["CV_manual"])
        if "Kp" in data:         V.r_PRESS_PID_03_KP          = float(data["Kp"])
        if "Ki" in data:         V.r_PRESS_PID_03_KI          = float(data["Ki"])
        if "Kd" in data:         V.r_PRESS_PID_03_KD          = float(data["Kd"])
    emit("pid_updated", {"instrumento": tag, "ok": True}, broadcast=True)


@socketio.on("toggle_lazos")
def ws_toggle_lazos(_data=None):
    V.b_DESHABILITA_PID = not V.b_DESHABILITA_PID
    emit("lazos_status", {"lazos_habilitados": not V.b_DESHABILITA_PID}, broadcast=True)


# ─────────────────────────────────────────────────────────────
# Entrypoint
# ─────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import sys
    # Forzar stdout a UTF-8 para evitar UnicodeEncodeError en Windows (cp1252)
    if sys.stdout.encoding and sys.stdout.encoding.lower() != 'utf-8':
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')

    print("\n" + "=" * 60)
    print("  MFM ORINOCO -- SoftPLC + Flask 'Todo en Uno'")
    print("  Arquitectura: Memoria Compartida (objeto V)")
    print("=" * 60)

    # -- Restaurar configuracion DAQ desde BD --
    _load_daq_connection_from_db()

    # -- Restaurar mapeo de canales DAQ desde BD --
    _load_daq_channels_from_db()

    # -- Restaurar overrides manuales de instrumentos desde BD --
    try:
        rows = db_exec("SELECT instrumento, modo_manual, valor_manual FROM tabla_configuracion_alarma")
        for row in (rows or []):
            if row.get("modo_manual") and row.get("valor_manual") is not None:
                _apply_manual_override(row["instrumento"], row["modo_manual"], row["valor_manual"])
        print("  [OK] Overrides manuales restaurados desde BD")
    except Exception as _em:
        print(f"  [WARN] No se pudieron restaurar overrides manuales: {_em}")

    # -- Arrancar Hilo 1: ScanEngine (100 ms, daemon) --
    plc_engine.start()
    print(f"  [OK] SoftPLC ScanEngine activo ({len(PHASE_REGISTRY)} fases, 100 ms)")

    # -- Arrancar Hilo 2: WebSocket Updater (500 ms, daemon) --
    ws_thread = threading.Thread(target=websocket_updater, daemon=True, name="WSUpdater")
    ws_thread.start()
    print("  [OK] WebSocket Updater activo (500 ms)")

    # -- Arrancar Hilo 3: HART Background Poller (daemon) --
    hart_thread = threading.Thread(target=_hart_background_poller, daemon=True, name="HARTPoller")
    hart_thread.start()
    print(f"  [OK] HART Poller activo (cada {_HART_POLL_INTERVAL}s) -> {HART_CONFIG.get('ip')}:{HART_CONFIG.get('port')} (multi-drop, HART Device Address por canal)")

    print("  -> http://localhost:5000")
    print("=" * 60 + "\n")

    try:
        socketio.run(app, host="0.0.0.0", port=5000,
                     debug=False, allow_unsafe_werkzeug=True)
    except KeyboardInterrupt:
        print("\nDeteniendo SoftPLC...")
        plc_engine.stop()
        print("  Motor detenido. Adios.")

