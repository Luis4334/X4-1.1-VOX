"""
MFM ORINOCO – Backend Flask
============================
Gestiona DB x4 en XAMPP, lógica PID, WebSockets (500ms)
Inicia con: python app.py
"""

import time
import math
import random
import threading
from datetime import datetime
from flask import Flask, jsonify, request, send_from_directory
from flask_socketio import SocketIO, emit
from flask_cors import CORS
import mysql.connector
from mysql.connector import pooling

# ─────────────────────────────────────────────────────────────
# Flask + SocketIO setup
# ─────────────────────────────────────────────────────────────
app = Flask(__name__, static_folder="static", static_url_path="/static")
app.secret_key = "mfm_orinoco_2024"
CORS(app, resources={r"/*": {"origins": "*"}})
socketio = SocketIO(app, cors_allowed_origins="*", async_mode="threading")


# ─────────────────────────────────────────────────────────────
# MySQL Pool (XAMPP → puerto 3306, user=root, pass=vacío)
# ─────────────────────────────────────────────────────────────
DB_CONFIG = dict(
    host="localhost", port=3306,
    user="root", password="",
    database="x4", charset="utf8mb4",
    connection_timeout=10,
)

try:
    db_pool = pooling.MySQLConnectionPool(pool_name="mfm", pool_size=5, **DB_CONFIG)
    print("✅  MySQL pool OK")
except Exception as _e:
    print(f"⚠️  MySQL no disponible: {_e}")
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
        print(f"  DB error: {e}")
        if conn and not fetch:
            try: conn.rollback()
            except Exception: pass
        return None
    finally:
        if cur:  cur.close()
        if conn: conn.close()


# ─────────────────────────────────────────────────────────────
# PID Controller
# ─────────────────────────────────────────────────────────────
class PIDController:
    """PID discreto con anti-windup y transferencia bumpless."""

    def __init__(self, tag, Kp=1.0, Ki=0.1, Kd=0.01,
                 out_min=0.0, out_max=100.0, dt=0.5):
        self.instrumento = tag
        self.Kp, self.Ki, self.Kd = Kp, Ki, Kd
        self.out_min, self.out_max = out_min, out_max
        self.dt   = dt

        self.SP   = 0.0
        self.PV   = 0.0
        self.CV   = 0.0
        self.CV_manual = 0.0
        self.modo = "Manual"   # "Auto" | "Manual"
        self.activo = True

        self._integral  = 0.0
        self._prev_pv   = 0.0
        self._prev_error = 0.0

    # Transferencia bumpless: al cambiar modo evita salto
    def reset(self):
        self._integral   = self.CV
        self._prev_pv    = self.PV
        self._prev_error = 0.0

    def compute(self, pv: float) -> float:
        self.PV = pv
        if self.modo == "Manual":
            self.CV = max(self.out_min, min(self.out_max, self.CV_manual))
            return self.CV

        error = self.SP - pv
        P = self.Kp * error
        self._integral += error * self.dt
        I  = self.Ki * self._integral
        D  = -self.Kd * (pv - self._prev_pv) / max(self.dt, 1e-6)

        out = P + I + D
        # Anti-windup por clamping
        if out > self.out_max:
            out = self.out_max
            self._integral -= error * self.dt
        elif out < self.out_min:
            out = self.out_min
            self._integral -= error * self.dt

        self._prev_pv = pv
        self._prev_error = error
        self.CV = round(out, 3)
        return self.CV

    def to_dict(self):
        return {
            "instrumento": self.instrumento,
            "modo":  self.modo,
            "PV":    round(self.PV, 3),
            "CV":    round(self.CV, 3),
            "SP":    round(self.SP, 3),
            "CV_manual": round(self.CV_manual, 3),
            "Kp":    self.Kp,
            "Ki":    self.Ki,
            "Kd":    self.Kd,
        }


# ─────────────────────────────────────────────────────────────
# Instancias PID independientes
# ─────────────────────────────────────────────────────────────
pid_presion = PIDController("PIC-01", Kp=1.2, Ki=0.08, Kd=0.05)
pid_nivel   = PIDController("LIC-01", Kp=1.0, Ki=0.10, Kd=0.02)

PID_MAP = {"PIC-01": pid_presion, "LIC-01": pid_nivel}

_lazos_habilitados = True


def load_pid_from_db():
    rows = db_exec("SELECT * FROM configuracion_actual")
    if not rows:
        print("  (Sin datos en configuracion_actual – usando defaults)")
        return
    for r in rows:
        tag = r.get("instrumento")
        if tag not in PID_MAP:
            continue
        pid = PID_MAP[tag]
        pid.Kp = float(r.get("Kp") or pid.Kp)
        pid.Ki = float(r.get("Ki") or pid.Ki)
        pid.Kd = float(r.get("Kd") or pid.Kd)
        pid.SP = float(r.get("SP") or 0)
        pid.CV = float(r.get("CV") or 0)
        pid.PV = float(r.get("PV") or 0)
        pid.CV_manual = float(r.get("CV_manual") or 0)
        pid.modo = r.get("modo", "Manual")
        pid._integral = pid.CV
        pid._prev_pv  = pid.PV
        print(f"  ✅  {tag}: modo={pid.modo}  SP={pid.SP}  Kp={pid.Kp}")


# ─────────────────────────────────────────────────────────────
# Simulación de proceso REALISTA (reemplazar con Modbus real)
# ─────────────────────────────────────────────────────────────
_t = 0.0

# Estado persistente del proceso (valores iniciales)
_state = {
    "level":    50.0,     # % nivel del separador
    "pressure": 95.0,     # PSIG presión del separador
}

# Parámetros del modelo físico
INFLOW_LIQUID  = 1.2     # %/s entrada de líquido al separador
INFLOW_GAS    = 0.8     # PSIG/s acumulación de gas si sale cerrada
MAX_DRAIN_LIQ  = 2.0     # %/s máximo drenaje de líquido con válvula 100%
MAX_VENT_GAS   = 1.5     # PSIG/s máximo venteo de gas con válvula 100%
DT             = 0.5     # intervalo de simulación (s)

# ──────────────────────────────────────────────────────────────
# Caché del último PV escrito por comunicacion-modbus.py
# ──────────────────────────────────────────────────────────────
_pv_cache: dict = {}   # {"PIC-01": float, "LIC-01": float}
_pv_cache_lock = threading.Lock()


def _refresh_pv_cache():
    """
    Lee la tabla configuracion_actual y actualiza la caché de PV.
    Este valor fue escrito por comunicacion-modbus.py con el promedio
    del último lote de muestras → actúa como FILTRO entre DAQ y PID.
    """
    rows = db_exec("SELECT instrumento, PV FROM configuracion_actual")
    if not rows:
        return
    with _pv_cache_lock:
        for r in rows:
            _pv_cache[r["instrumento"]] = float(r["PV"] or 0.0)



def simulate():
    global _t
    _t += DT
    t = _t
    n = random.gauss

    # ── NIVEL (LI-01) ──
    # Líquido entra al separador a tasa constante.
    # LCV-01 drena líquido proporcionalmente a su apertura (CV).
    lcv_pct   = pid_nivel.CV / 100.0        # 0.0 a 1.0
    liq_in    = INFLOW_LIQUID * DT          # lo que entra
    liq_out   = MAX_DRAIN_LIQ * lcv_pct * DT   # lo que sale por LCV-01
    _state["level"] += (liq_in - liq_out) + n(0, 0.05)
    _state["level"]  = max(0.0, min(100.0, _state["level"]))
    li01 = round(_state["level"], 2)

    # ── PRESIÓN (PI-01) ──
    # Gas entra al separador (acumulación natural).
    # PCV-01 ventea gas proporcionalmente a su apertura (CV).
    pcv_pct   = pid_presion.CV / 100.0
    gas_in    = INFLOW_GAS * DT
    gas_out   = MAX_VENT_GAS * pcv_pct * DT
    _state["pressure"] += (gas_in - gas_out) + n(0, 0.1)
    _state["pressure"]  = max(0.0, min(200.0, _state["pressure"]))
    pi01 = round(_state["pressure"], 2)

    # ── Variables secundarias (no controladas, oscilan naturalmente) ──
    fi03 = round(0.64 + 0.15 * math.sin(t/20) + n(0, 0.01), 3)
    ti01 = round(18.75 + 1.5 * math.sin(t/30) + n(0, 0.05), 2)
    pdi01 = round(313.53 + 10.0 * math.sin(t/25) + n(0, 1.0), 2)
    pdi03 = 0.0
    pdi02_dp   = round(7.81  + 0.5 * math.sin(t/18) + n(0, 0.05), 2)
    pdi02_psig = round(37.50 + 1.0 * math.sin(t/18) + n(0, 0.02), 2)
    ti02  = round(9.38  + 0.5 * math.sin(t/20) + n(0, 0.02), 2)
    gas01 = round(25.0  + 2.0 * math.sin(t/12) + n(0, 0.1), 2)
    vi01  = round(0.10  + 0.02 * math.sin(t/40) + n(0, 0.002), 3)

    return {
        "FI_03":       fi03,
        "PI_01":       pi01,
        "TI_01":       ti01,
        "LI_01":       li01,
        "PDI_01":      pdi01,
        "PDI_03":      pdi03,
        "PDI_02_dp":   pdi02_dp,
        "PDI_02_psig": pdi02_psig,
        "TI_02":       ti02,
        "GAS_01":      gas01,
        "VI_01":       vi01,
        "timestamp":   datetime.now().strftime("%H:%M:%S"),
    }


# ─────────────────────────────────────────────────────────────
# Loop de control (cada 500 ms)
# ─────────────────────────────────────────────────────────────
def control_loop():
    loop_count   = 0
    pv_refresh_n = 0  # contador para refrescar caché de PV cada 2 ciclos (~1s)
    while True:
        try:
            readings = simulate()

            # ─── FILTRO MODBUS ────────────────────────────────
            # Si comunicacion-modbus.py está corriendo, sus promedios
            # de lote sobrescriben el PV simulado → fuente de verdad.
            pv_refresh_n += 1
            if pv_refresh_n >= 2:
                pv_refresh_n = 0
                _refresh_pv_cache()

            with _pv_cache_lock:
                # PIC-01 → PI_01
                if "PIC-01" in _pv_cache and _pv_cache["PIC-01"] > 0:
                    readings["PI_01"] = round(_pv_cache["PIC-01"], 2)
                # LIC-01 → LI_01
                if "LIC-01" in _pv_cache and _pv_cache["LIC-01"] > 0:
                    readings["LI_01"] = round(_pv_cache["LIC-01"], 2)
            # ─────────────────────────────────────────────────

            if _lazos_habilitados:
                pid_presion.compute(readings["PI_01"])
                pid_nivel.compute(readings["LI_01"])

            readings["PCV_01_cv"] = pid_presion.CV
            readings["LCV_01_cv"] = pid_nivel.CV

            # ─── ESCRIBIR CV/PV a DB para que comunicacion-modbus.py ───
            # pueda leer la posición real de las válvulas.
            # Sin esto, el modelo físico del DAQ no ve las correcciones
            # del PID y el lazo queda ABIERTO.
            if pv_refresh_n == 0:  # cada ~1s (reutiliza el contador)
                db_exec(
                    "UPDATE configuracion_actual SET CV=%s, PV=%s WHERE instrumento=%s",
                    (pid_presion.CV, pid_presion.PV, "PIC-01"), fetch=False
                )
                db_exec(
                    "UPDATE configuracion_actual SET CV=%s, PV=%s WHERE instrumento=%s",
                    (pid_nivel.CV, pid_nivel.PV, "LIC-01"), fetch=False
                )

            # Guardar historico en DB cada 5 segundos (10 * 500ms)
            loop_count += 1
            if loop_count >= 10:
                loop_count = 0
                instrumentos = ["FI_03", "PI_01", "TI_01", "LI_01", "PDI_01", "PDI_03", "PDI_02_dp", "TI_02", "GAS_01", "VI_01"]
                vals = []
                for inst in instrumentos:
                    vals.extend([inst.replace('_', '-'), float(readings.get(inst, 0))])
                placeholders = ", ".join(["(%s, %s)"] * len(instrumentos))
                db_exec(f"INSERT INTO lecturas_proceso (instrumento, valor) VALUES {placeholders}", tuple(vals), fetch=False)

            socketio.emit("process_data", {
                "process":    readings,
                "pid_presion": pid_presion.to_dict(),
                "pid_nivel":   pid_nivel.to_dict(),
                "lazos_habilitados": _lazos_habilitados,
            })
        except Exception as e:
            print(f"  Loop error: {e}")

        time.sleep(0.5)



# ─────────────────────────────────────────────────────────────
# Rutas HTTP
# ─────────────────────────────────────────────────────────────

@app.route("/")
def index():
    return send_from_directory(".", "index.html")


@app.route("/api/status")
def api_status():
    return jsonify({"ok": True, "ts": datetime.now().isoformat()})


# ── PID ─────────────────────────────────────────────────────

@app.route("/api/pid/<loop_id>", methods=["GET"])
def get_pid(loop_id):
    tag = loop_id.upper().replace("_", "-")
    if tag not in PID_MAP:
        return jsonify({"error": "Not found"}), 404
    return jsonify(PID_MAP[tag].to_dict())


@app.route("/api/pid/<loop_id>", methods=["POST"])
def post_pid(loop_id):
    tag = loop_id.upper().replace("_", "-")
    if tag not in PID_MAP:
        return jsonify({"error": "Not found"}), 404
    d   = request.get_json() or {}
    pid = PID_MAP[tag]
    prev_modo = pid.modo

    if "Kp" in d: pid.Kp = float(d["Kp"])
    if "Ki" in d: pid.Ki = float(d["Ki"])
    if "Kd" in d: pid.Kd = float(d["Kd"])
    if "SP" in d: pid.SP = float(d["SP"])
    if "CV_manual" in d: pid.CV_manual = float(d["CV_manual"])
    if "modo" in d and d["modo"] != prev_modo:
        pid.modo = d["modo"]
        pid.reset()

    db_exec(
        "UPDATE configuracion_actual SET modo=%s,SP=%s,CV_manual=%s,Kp=%s,Ki=%s,Kd=%s WHERE instrumento=%s",
        (pid.modo, pid.SP, pid.CV_manual, pid.Kp, pid.Ki, pid.Kd, tag), fetch=False
    )
    return jsonify({"ok": True, **pid.to_dict()})


# ── Alarmas ──────────────────────────────────────────────────

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
           SET minimo=%s,maximo=%s,SP_HH=%s,SP_H=%s,SP_L=%s,SP_LL=%s,DB=%s,RAW_H=%s,RAW_L=%s
           WHERE instrumento=%s""",
        (d.get("minimo"), d.get("maximo"), d.get("SP_HH"), d.get("SP_H"),
         d.get("SP_L"), d.get("SP_LL"), d.get("DB"), d.get("RAW_H"), d.get("RAW_L"),
         instrumento.upper()),
        fetch=False
    )
    return jsonify({"ok": True})


# ── Lazos ────────────────────────────────────────────────────

@app.route("/api/lazos/deshabilitar", methods=["POST"])
def toggle_lazos():
    global _lazos_habilitados
    _lazos_habilitados = not _lazos_habilitados
    return jsonify({"lazos_habilitados": _lazos_habilitados})


# ── Reportes ─────────────────────────────────────────────────

import csv
import io
from flask import Response

@app.route("/api/reportes/descargar", methods=["GET"])
def descargar_reporte():
    f_inicio = request.args.get("inicio")
    f_fin = request.args.get("fin")
    
    query = "SELECT * FROM lecturas_proceso"
    params = []
    
    if f_inicio and f_fin:
        query += " WHERE timestamp BETWEEN %s AND %s"
        params.extend([f_inicio, f_fin])
        
    query += " ORDER BY timestamp DESC LIMIT 5000"
    
    rows = db_exec(query, tuple(params))
    
    si = io.StringIO()
    si.write('\ufeff') # BOM for UTF-8 Excel support
    cw = csv.writer(si, delimiter=';')
    cw.writerow(["ID", "Instrumento", "Valor", "Timestamp"])
    
    if rows:
        for r in rows:
            cw.writerow([r["id"], r["instrumento"], round(r["valor"], 3), r["timestamp"]])
    else:
        cw.writerow(["No hay datos registrados en la base de datos para este rango", "", "", ""])

    output = si.getvalue()
    si.close()
    
    return Response(
        output,
        mimetype="text/csv",
        headers={"Content-Disposition": "attachment;filename=Reporte_MFM_Orinoco.csv"}
    )


@app.route("/api/valores_agregados", methods=["GET"])
def get_valores_agregados():
    """Histórico de promedios por lote escritos por comunicacion-modbus.py."""
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
    """Informa si comunicacion-modbus.py está escribiendo datos activamente."""
    row = db_exec(
        "SELECT instrumento, valor_promedio, fuente, timestamp "
        "FROM valores_agregados ORDER BY timestamp DESC LIMIT 1"
    )
    if not row:
        return jsonify({"activo": False, "mensaje": "Sin datos del DAQ aún"})
    r   = row[0]
    ts  = r["timestamp"]
    now = datetime.now()
    # Considera activo si el último dato tiene < 30 segundos
    diff = (now - ts).total_seconds() if ts else 9999
    return jsonify({
        "activo":      diff < 30,
        "ultimo_dato": str(ts),
        "fuente":      r["fuente"],
        "antiguedad_s": round(diff, 1),
    })



# ─────────────────────────────────────────────────────────────
# WebSocket events
# ─────────────────────────────────────────────────────────────

@socketio.on("connect")
def on_connect():
    print(f"🔌 Cliente conectado: {request.sid}")
    emit("pid_config", {"PIC-01": pid_presion.to_dict(), "LIC-01": pid_nivel.to_dict()})


@socketio.on("disconnect")
def on_disconnect():
    print(f"🔌 Cliente desconectado: {request.sid}")


@socketio.on("update_pid")
def ws_update_pid(data):
    tag = str(data.get("instrumento", "")).upper()
    if tag not in PID_MAP:
        return
    pid = PID_MAP[tag]
    prev_modo = pid.modo
    if "Kp" in data: pid.Kp = float(data["Kp"])
    if "Ki" in data: pid.Ki = float(data["Ki"])
    if "Kd" in data: pid.Kd = float(data["Kd"])
    if "SP" in data: pid.SP = float(data["SP"])
    if "CV_manual" in data: pid.CV_manual = float(data["CV_manual"])
    if "modo" in data and data["modo"] != prev_modo:
        pid.modo = data["modo"]
        pid.reset()
    db_exec(
        "UPDATE configuracion_actual SET modo=%s,SP=%s,CV_manual=%s,Kp=%s,Ki=%s,Kd=%s WHERE instrumento=%s",
        (pid.modo, pid.SP, pid.CV_manual, pid.Kp, pid.Ki, pid.Kd, tag), fetch=False
    )
    emit("pid_updated", pid.to_dict(), broadcast=True)


@socketio.on("toggle_lazos")
def ws_toggle_lazos(_data=None):
    global _lazos_habilitados
    _lazos_habilitados = not _lazos_habilitados
    emit("lazos_status", {"lazos_habilitados": _lazos_habilitados}, broadcast=True)


# ─────────────────────────────────────────────────────────────
# Entrypoint
# ─────────────────────────────────────────────────────────────
if __name__ == "__main__":
    print("\n" + "="*52)
    print("  MFM ORINOCO – Flask / SocketIO Backend")
    print("  Asegúrate de que MySQL esté corriendo en XAMPP")
    print("="*52)
    load_pid_from_db()
    t = threading.Thread(target=control_loop, daemon=True)
    t.start()
    print("  Loop de control activo (500 ms)")
    print("  → http://localhost:5000\n")
    socketio.run(app, host="0.0.0.0", port=5000,
                 debug=False, allow_unsafe_werkzeug=True)
