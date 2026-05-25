"""
Orinoco SoftPLC — FASE 2: Lectura de Hardware y Entradas
Migrado de: p01_Gene.lsf, P02_ENTR.LSF, F05B_MAI.LSF, P08_AUTO.LSF

INTEGRACIÓN MODBUS RTU:
  Si V.b_simular_ai es False, se leen los registros físicos de la DAQ
  y se almacenan en los mismos canales raw (V.r_Local_X_I_ChY) que
  el modo simulación usa. El pipeline SCL→HLL→EU corre igual en ambos
  modos sin ningún cambio adicional.
"""

import logging
import platform
import uuid

from global_vars import V
from function_blocks import FB_SCL, FB_HLL, FB_SEL, FB_DIV, scale, clamp
import time
from modbus_daq import get_client, mark_disconnected, DAQ_SLAVE_ID

logger = logging.getLogger("orinoco.fase2")

# ─────────────────────────────────────────────────────────────
# MAPA DE REGISTROS MODBUS → Canales raw de la DAQ
# TODO: Sustituye las direcciones (addr) con las de tu mapa real
# ─────────────────────────────────────────────────────────────
#
# Formato: (variable_en_V,          addr, escala,  descripción)
#   escala: divisor para recuperar decimales desde el entero DAQ
#           Ej: reg=6523 / 100.0 → 65.23 mA  |  reg=952 / 10.0 → 95.2 PSIG
#
# ─────────────────────────────────────────────────────────────
# IMPORTANTE: La DAQ usa "Engineering Format" (ver imagen de config).
# El valor raw de la tarjeta ya viene escalado × 1000:
#   raw=14969  →  14.969 mA   (divisor 1000.0)
#   raw=32768  →  canal desconectado / open-wire (código de error)
#   raw=-32768 →  canal desconectado / over-range (negativo)
#
# La tarjeta tiene 6 canales AI (CH:00 a CH:05) y 2 AO.
# Ajusta la columna 'addr' con el canal físico que conectes.
# ─────────────────────────────────────────────────────────────
#
# Formato: (variable_en_V,       addr, escala,   descripción)
#   escala: divisor para obtener mA.  Engineering Format → 1000.0
#
_INPUT_MAP = [
    # Canal físico → Variable V                   addr  escala   Descripción
    ("r_Local_2_I_Ch0Data",  0, 1000.0, "CH:00  LIT-001  Nivel separador [mA]"),
    ("r_Local_2_I_Ch1Data",  1, 1000.0, "CH:01  FT-01    DP Laminar Alta [mA]"),
    ("r_Local_2_I_Ch2Data",  2, 1000.0, "CH:02  VORTEX   Flujo Gas Vortex [mA]"),
    ("r_Local_2_I_Ch3Data",  3, 1000.0, "CH:03  FT-04    DP Laminar Baja [mA]"),
    ("r_Local_4_I_Ch0Data",  4, 1000.0, "CH:04  FT-02    DP Wedge [mA]"),
    ("r_Local_4_I_Ch1Data",  5, 1000.0, "CH:05  PT-02    Presión Aceite [mA]"),
]

# Valor que la DAQ devuelve para canal sin señal
# Pymodbus 3.x retorna enteros unsigned (0-65535)
# -32768 signed = 32768 unsigned → mismo valor que _DAQ_OPEN_WIRE
_DAQ_OPEN_WIRE     = 32768   # 0x8000 unsigned
_DAQ_OPEN_WIRE_NEG = 32768   # -32768 signed = 32768 unsigned (mismo)

# Bloque de lectura — exactamente 6 registros consecutivos (CH:00–CH:05)
_READ_START_ADDR = 0
_READ_COUNT      = 6    # 6 canales AI de la tarjeta

# Pre-inicializar snapshot con canales en estado "sin señal"
# Esto evita que la UI reciba channels:[] en la primera llamada API
V._daq_channel_snapshot = [
    {
        "ch":        entry[1],
        "var":       entry[0],
        "desc":      entry[3],
        "raw":       None,
        "ma":        None,
        "open_wire": True,
    }
    for entry in _INPUT_MAP
]


def _leer_daq_hardware():
    """
    Lee un bloque contiguo de registros Modbus de la DAQ y los deposita
    en los canales raw de V. Se llama una vez por ciclo, antes del
    escalamiento, solo cuando V.b_simular_ai es False.

    Estrategia de un solo request (eficiencia):
      En lugar de N llamadas individuales read_holding_registers,
      se lee TODO el bloque de entradas en un solo request RTU.
      Esto minimiza el tiempo de bus y el riesgo de superar 100 ms.
    """
    client = get_client()
    if client is None:
        # Publicar snapshot de desconexion para que la UI lo refleje
        V._daq_channel_snapshot = [
            {
                "ch": entry[1],  # addr
                "var": entry[0],
                "desc": entry[3],
                "raw": None,
                "ma":  None,
                "open_wire": True,
            }
            for entry in _INPUT_MAP
        ]
        return  # V.b_Error_DAQ ya fue puesto en True por get_client()/mark_disconnected()

    try:
        # Log detallado de la petición a la DAQ
        logger.info(f"→ Enviando peticion Modbus RTU: read_input_registers(addr={_READ_START_ADDR}, count={_READ_COUNT}, slave={DAQ_SLAVE_ID})")
        
        result = client.read_input_registers(
            address=_READ_START_ADDR,
            count=_READ_COUNT,
            slave=DAQ_SLAVE_ID,
        )

        if result.isError():
            logger.warning(f"DAQ read error en addr={_READ_START_ADDR}: {result}")
            mark_disconnected()
            return

        # Distribuir registros a sus variables V según el mapa
        regs = result.registers
        # Construir snapshot de canales para la UI web (lectura + estado)
        channel_snapshot = []
        for (var_name, addr, escala, desc) in _INPUT_MAP:
            idx = addr - _READ_START_ADDR
            if 0 <= idx < len(regs):
                raw_val = regs[idx]
                # Detectar canal abierto / sin señal (open-wire / over-range)
                open_wire = (raw_val == _DAQ_OPEN_WIRE or raw_val == _DAQ_OPEN_WIRE_NEG)
                if open_wire:
                    ma_val = None
                    # Mantener variable en 0 si no hay señal
                    setattr(V, var_name, 0.0)
                else:
                    # Engineering Format: raw / 1000 → mA
                    ma_val = raw_val / escala
                    setattr(V, var_name, ma_val)
                channel_snapshot.append({
                    "ch":   addr,
                    "var":  var_name,
                    "desc": desc,
                    "raw":  raw_val,
                    "ma":   round(ma_val, 3) if ma_val is not None else None,
                    "open_wire": open_wire,
                })
        # Publicar en V para que la API web pueda leerlo
        V._daq_channel_snapshot = channel_snapshot
        # Timestamp del último read exitoso (usado para detectar datos "stale")
        V._daq_last_success = time.monotonic()

        ma_vals = [f"CH{s['ch']}={s['ma']}mA" if not s['open_wire'] else f"CH{s['ch']}=OPEN"
                   for s in channel_snapshot]
        logger.info(f"DAQ canales: {' | '.join(ma_vals)}")
        V.b_Error_DAQ = False

    except Exception as e:
        logger.error(f"Excepción leyendo DAQ: {e}")
        mark_disconnected()


# ─── Conversión Raw → mA (fórmulas exactas del PLC VP-25W6) ─────────────

def raw_to_ma_slot0(raw: int) -> float:
    """Slot 0: 0mA→0, 4mA→6553, 20mA→32767"""
    return (float(raw) - 6553.0) * 16.0 / 26214.0 + 4.0

def raw_to_ma_slot1(raw: int) -> float:
    """Slot 1: 4mA→0, 20mA→32767"""
    return (float(raw) - 0.0) * 16.0 / 32767.0 + 4.0

def raw_to_ma_slot2(raw: int) -> float:
    """Slot 2: 0mA→0, 4mA→6553, 20mA→32767"""
    return (float(raw) - 6553.0) * 16.0 / 26214.0 + 4.0

def inverse_scale_for_sim(eu_val, eu_min, eu_max, raw_min, raw_max):
    """Calcular valor raw desde EU para modo simulación (inverso de SCL)."""
    if (eu_max - eu_min) == 0:
        return raw_min
    return (eu_val - eu_min) * (raw_max - raw_min) / (eu_max - eu_min) + raw_min


# ═════════════════════════════════════════════════════════════════════════════
#  p01_GENERAL (p01_Gene.lsf) — Estado HW, Baterías, Serial
# ═════════════════════════════════════════════════════════════════════════════

def p01_general():
    """
    Migrado de: p01_Gene.lsf
    Validaciones de HW, lectura de botones, baterías, serial del PLC.
    En Python/DAQ: leemos info del host en lugar del PLC VP-25W6.
    """
    if not (V.b_P01_ejec_prog and not V.b_P01_ejec_prog_ant):
        return
    timer = V.t_P01_duracion
    timer.reset()

    # 01. Validaciones de rango (migrado de F_Valida.lsf)
    _f_validaciones()

    # 02. Botones — En DAQ no hay panel físico, se controlan desde HMI/Web
    # V.b_boton_F1..F6 se setean desde la interfaz web

    # 03. Estado del controlador — En Python, siempre OK si estamos corriendo
    V.i_controlador_estado_error = 0
    V.b_controlador_estado_error = False
    V.i_controlador_codigo_error = 0

    # 05. Estado de baterías — No aplica en DAQ, siempre OK
    V.i_estado_bateria_1 = 99
    V.i_estado_bateria_2 = 99
    V.b_estado_bateria_1 = True
    V.b_estado_bateria_2 = True

    # 06. Serial del PLC → UUID del host machine
    _capture_host_serial()

    # 07. Versión del driver → Info del sistema Python
    V.s_get_ver1_os = platform.system()[:10]
    V.s_get_ver1_dr = platform.python_version()[:50]

    V.i_P01_duracion_mSeg = timer.read()


def _capture_host_serial():
    """Capturar serial único del host (equivale a fb_get_sn1 del PLC)."""
    try:
        mac = uuid.getnode()
        # Descomponer MAC en 8 segmentos como el PLC hacía con sn1..sn8
        V.i_get_sn1_sn1 = (mac >> 40) & 0xFF
        V.i_get_sn1_sn2 = (mac >> 32) & 0xFF
        V.i_get_sn1_sn3 = (mac >> 24) & 0xFF
        V.i_get_sn1_sn4 = (mac >> 16) & 0xFF
        V.i_get_sn1_sn5 = (mac >> 8) & 0xFF
        V.i_get_sn1_sn6 = mac & 0xFF
        V.i_get_sn1_sn7 = 0
        V.i_get_sn1_sn8 = 0
    except Exception:
        pass


def _f_validaciones():
    """
    Migrado de: F_Valida.lsf — Validar rangos de parámetros configurables.
    Equivale a F_Vali_i(val, min, max) y F_Vali_r(val, min, max).
    """
    def vali_i(val, lo, hi):
        return max(lo, min(hi, val))

    def vali_r(val, lo, hi):
        return max(lo, min(hi, val))

    # Validar enteros críticos
    V.i_PRUEBA_DESEADA = vali_i(V.i_PRUEBA_DESEADA, 1, 500)
    V.i_PLC_mode_usuario = vali_i(V.i_PLC_mode_usuario, 0, 3)
    V.i_DURACION_PRUEBA_HORAS = vali_i(V.i_DURACION_PRUEBA_HORAS, 0, 48)
    for c in range(1, 4):
        k = f'i_ciclo_{c}_max_mSeg'
        setattr(V, k, vali_i(getattr(V, k), 1000, 60000))
    for i in range(1, 11):
        sel_k = f'i_P{i:02d}_ciclo_selector'
        ref_k = f'i_P{i:02d}_ejec_prog_ref_mSeg'
        setattr(V, sel_k, vali_i(getattr(V, sel_k), -1, 3))
        setattr(V, ref_k, vali_i(getattr(V, ref_k), 0, 60000))

    # Validar reales críticos — escalamientos
    for tag in ['LIT','FT_01','FT_02','FT_04','FT_05','VORTEX_Q_01',
                'VORTEX_T_01','PT','DP_01','TIT','WC','nivel_aux']:
        for suffix in ['InRawMin','InRawMax']:
            k = f'r_SCL_{tag}_{suffix}'
            if hasattr(V, k):
                setattr(V, k, vali_r(getattr(V, k), 0.0, 25.0))

    # Validar PID
    V.r_LEVEL_PID_SP = vali_r(V.r_LEVEL_PID_SP, 0.0, 100.0)
    V.r_LEVEL_PID_03_KP = vali_r(V.r_LEVEL_PID_03_KP, 0.0, 10.0)
    V.r_LEVEL_PID_03_KI = vali_r(V.r_LEVEL_PID_03_KI, 0.0, 10.0)
    V.r_PRESS_PID_SP = vali_r(V.r_PRESS_PID_SP, 0.0, 2000.0)
    V.r_PRESS_PID_03_KP = vali_r(V.r_PRESS_PID_03_KP, 0.0, 10.0)
    V.r_PRESS_PID_03_KI = vali_r(V.r_PRESS_PID_03_KI, 0.0, 10.0)

    # Validar fallas de presión
    V.r_falla_presion_gas = vali_r(V.r_falla_presion_gas, 0.0, 2000.0)
    V.r_falla_presion_crudo = vali_r(V.r_falla_presion_crudo, 0.0, 2000.0)
    V.r_PA = vali_r(V.r_PA, 0.0, 16.0)


# ═════════════════════════════════════════════════════════════════════════════
#  p02_ENTRADAS (P02_ENTR.LSF) — Escalamiento de Entradas Analógicas
# ═════════════════════════════════════════════════════════════════════════════

# Instancias de bloques de función para escalamiento (persistentes)
_scl_LIT = FB_SCL()
_scl_FT_01 = FB_SCL()
_scl_FT_02 = FB_SCL()
_scl_FT_04 = FB_SCL()
_scl_VORTEX_Q = FB_SCL()
_scl_VORTEX_T = FB_SCL()
_scl_PT = FB_SCL()
_scl_DP_01 = FB_SCL()
_scl_TIT = FB_SCL()
_scl_WC = FB_SCL()
_scl_FIT_05 = FB_SCL()
_scl_nivel_aux = FB_SCL()

_hll_LIT = FB_HLL()
_hll_FT_01 = FB_HLL()
_hll_FT_02 = FB_HLL()
_hll_FT_04 = FB_HLL()
_hll_VORTEX_Q = FB_HLL()
_hll_VORTEX_T = FB_HLL()
_hll_PT = FB_HLL()
_hll_TIT = FB_HLL()
_hll_WC = FB_HLL()
_hll_FIT_05 = FB_HLL()
_hll_nivel_aux = FB_HLL()

_sel_gas = FB_SEL()
_sel_viscosidad = FB_SEL()
_div_visc = FB_DIV()


def p02_entradas():
    """
    Migrado de: P02_ENTR.LSF + F05B_MAI.LSF
    Lee señales de la DAQ (o simuladas) y las escala a unidades de ingeniería.
    
    Cadena de procesamiento por señal:
      Raw DAQ → Conversión a mA → Simulación? → SCL (escalar) → HLL (limitar) → Variable EU
    """
    if not (V.b_P02_ejec_prog and not V.b_P02_ejec_prog_ant):
        return
    timer = V.t_P02_duracion
    timer.reset()

    # ─── MODO HARDWARE: leer DAQ física vía Modbus RTU ───────────────────
    # Si b_simular_ai es False, los registros raw se obtienen del hardware.
    # La función deposita los valores en V.r_Local_X_I_ChY directamente,
    # por lo que el escalamiento SCL→HLL de abajo los procesa sin cambios.
    if not V.b_simular_ai:
        _leer_daq_hardware()

    # ─── MODO SIMULACIÓN: generar señales raw desde valores EU ───────────
    if V.b_simular_ai:
        V.r_Local_2_I_Ch0Data = inverse_scale_for_sim(
            V.r_LIT_001_sim, V.r_SCL_LIT_InEUMin, V.r_SCL_LIT_InEUMax,
            V.r_SCL_LIT_InRawMin, V.r_SCL_LIT_InRawMax)
        V.r_Local_2_I_Ch1Data = inverse_scale_for_sim(
            V.r_PDT_01_sim, V.r_SCL_FT_01_InEUMin, V.r_SCL_FT_01_InEUMax,
            V.r_SCL_FT_01_InRawMin, V.r_SCL_FT_01_InRawMax)
        V.r_Local_2_I_Ch3Data = inverse_scale_for_sim(
            V.r_PDT_03_sim, V.r_SCL_FT_04_InEUMin, V.r_SCL_FT_04_InEUMax,
            V.r_SCL_FT_04_InRawMin, V.r_SCL_FT_04_InRawMax)
        V.r_Local_2_I_Ch2Data = inverse_scale_for_sim(
            V.r_Transmisor_Gas_sim, V.r_SCL_VORTEX_Q_01_InEUMin,
            V.r_SCL_VORTEX_Q_01_InEUMax, V.r_SCL_VORTEX_Q_01_InRawMin,
            V.r_SCL_VORTEX_Q_01_InRawMax)
        V.r_nivel_aux_4_20mA = inverse_scale_for_sim(
            V.r_nivel_aux_sim, V.r_SCL_nivel_aux_InEUMin,
            V.r_SCL_nivel_aux_InEUMax, V.r_SCL_nivel_aux_InRawMin,
            V.r_SCL_nivel_aux_InRawMax)
        V.r_flujo_dil_4_20mA = inverse_scale_for_sim(
            V.r_Q_DIL_MEDIDO_sim, V.r_SCL_FIT_05_InEUMin,
            V.r_SCL_FIT_05_InEUMax, V.r_SCL_FIT_05_InRawMin,
            V.r_SCL_FIT_05_InRawMax)
        V.r_Local_4_I_Ch0Data = inverse_scale_for_sim(
            V.r_PDT_02_sim, V.r_SCL_FT_02_InEUMin, V.r_SCL_FT_02_InEUMax,
            V.r_SCL_FT_02_InRawMin, V.r_SCL_FT_02_InRawMax)
        V.r_Local_4_I_Ch1Data = inverse_scale_for_sim(
            V.r_P_Oil_sim, V.r_SCL_DP_01_InEUMin, V.r_SCL_DP_01_InEUMax,
            V.r_SCL_DP_01_InRawMin, V.r_SCL_DP_01_InRawMax)
        V.r_Local_4_I_Ch2Data = inverse_scale_for_sim(
            V.r_T_Oil_C_sim, V.r_SCL_TIT_InEUMin, V.r_SCL_TIT_InEUMax,
            V.r_SCL_TIT_InRawMin, V.r_SCL_TIT_InRawMax)
        V.r_Local_4_I_Ch3Data = inverse_scale_for_sim(
            V.r_Transmisor_Gas_sim, V.r_SCL_VORTEX_Q_01_InEUMin,
            V.r_SCL_VORTEX_Q_01_InEUMax, V.r_SCL_VORTEX_Q_01_InRawMin,
            V.r_SCL_VORTEX_Q_01_InRawMax)
        V.r_Local_4_I_Ch4Data = inverse_scale_for_sim(
            V.r_P_Gas_sim, V.r_SCL_PT_InEUMin, V.r_SCL_PT_InEUMax,
            V.r_SCL_PT_InRawMin, V.r_SCL_PT_InRawMax)
        V.r_Local_4_I_Ch5Data = inverse_scale_for_sim(
            V.r_T_Gas_sim, V.r_SCL_VORTEX_T_01_InEUMin,
            V.r_SCL_VORTEX_T_01_InEUMax, V.r_SCL_VORTEX_T_01_InRawMin,
            V.r_SCL_VORTEX_T_01_InRawMax)

    # ─── Escalamiento: Raw → Unidades de Ingeniería (F05B_MAI.LSF) ──────

    # Nivel (LIT)
    _scl_LIT.execute(V.r_Local_2_I_Ch0Data,
                     V.r_SCL_LIT_InRawMin, V.r_SCL_LIT_InRawMax,
                     V.r_SCL_LIT_InEUMin, V.r_SCL_LIT_InEUMax)
    V.r_LIT_001 = _hll_LIT.execute(_scl_LIT.r_Out, 0.0, 100.0)

    # Temperatura de Aceite (TIT_01)
    _scl_TIT.execute(V.r_Local_4_I_Ch2Data,
                     V.r_SCL_TIT_InRawMin, V.r_SCL_TIT_InRawMax,
                     V.r_SCL_TIT_InEUMin, V.r_SCL_TIT_InEUMax)
    V.r_T_Oil_C = _hll_TIT.execute(_scl_TIT.r_Out, 0.0, 300.0)

    # Flujo Transmisor Gas (selector Vortex / Wedge / MV)
    if V.b_Sw_Wedge_Gas:
        gas_input = V.r_Local_4_I_Ch3Data
    else:
        gas_input = V.r_Local_2_I_Ch2Data
    _scl_VORTEX_Q.execute(gas_input,
                          V.r_SCL_VORTEX_Q_01_InRawMin, V.r_SCL_VORTEX_Q_01_InRawMax,
                          V.r_SCL_VORTEX_Q_01_InEUMin, V.r_SCL_VORTEX_Q_01_InEUMax)
    V.r_Transmisor_Gas = _hll_VORTEX_Q.execute(_scl_VORTEX_Q.r_Out, 0.0, 10000.0)

    # Presión de Gas (PT_01)
    _scl_PT.execute(V.r_Local_4_I_Ch4Data,
                    V.r_SCL_PT_InRawMin, V.r_SCL_PT_InRawMax,
                    V.r_SCL_PT_InEUMin, V.r_SCL_PT_InEUMax)
    V.r_P_Gas = _hll_PT.execute(_scl_PT.r_Out, 0.0, 1000.0)

    # Temperatura de Gas (TIT_02)
    _scl_VORTEX_T.execute(V.r_Local_4_I_Ch5Data,
                          V.r_SCL_VORTEX_T_01_InRawMin, V.r_SCL_VORTEX_T_01_InRawMax,
                          V.r_SCL_VORTEX_T_01_InEUMin, V.r_SCL_VORTEX_T_01_InEUMax)
    V.r_T_Gas = _hll_VORTEX_T.execute(_scl_VORTEX_T.r_Out, 0.0, 300.0)

    # Water Cut (WC)
    _scl_WC.execute(V.r_Local_4_I_Ch7Data,
                    V.r_SCL_WC_InRawMin, V.r_SCL_WC_InRawMax,
                    V.r_SCL_WC_InEUMin, V.r_SCL_WC_InEUMax)
    V.r_WC = _hll_WC.execute(_scl_WC.r_Out, 0.0, 100.0)

    # Flujo Diluente (FIT_05)
    _scl_FIT_05.execute(V.r_flujo_dil_4_20mA,
                        V.r_SCL_FIT_05_InRawMin, V.r_SCL_FIT_05_InRawMax,
                        V.r_SCL_FIT_05_InEUMin, V.r_SCL_FIT_05_InEUMax)
    V.r_Q_DIL_MEDIDO = _hll_FIT_05.execute(_scl_FIT_05.r_Out, 0.0, 10000.0)

    # Flujo Laminar Alta (FT_01 / PDT_01)
    _scl_FT_01.execute(V.r_Local_2_I_Ch1Data,
                       V.r_SCL_FT_01_InRawMin, V.r_SCL_FT_01_InRawMax,
                       V.r_SCL_FT_01_InEUMin, V.r_SCL_FT_01_InEUMax)
    V.r_PDT_01 = _hll_FT_01.execute(_scl_FT_01.r_Out, 0.0, 2000.0)

    # Flujo Wedge (FT_02 / PDT_02)
    _scl_FT_02.execute(V.r_Local_4_I_Ch0Data,
                       V.r_SCL_FT_02_InRawMin, V.r_SCL_FT_02_InRawMax,
                       V.r_SCL_FT_02_InEUMin, V.r_SCL_FT_02_InEUMax)
    V.r_PDT_02 = _hll_FT_02.execute(_scl_FT_02.r_Out, 0.0, 2000.0)

    # Flujo Laminar Baja (FT_04 / PDT_03)
    _scl_FT_04.execute(V.r_Local_2_I_Ch3Data,
                       V.r_SCL_FT_04_InRawMin, V.r_SCL_FT_04_InRawMax,
                       V.r_SCL_FT_04_InEUMin, V.r_SCL_FT_04_InEUMax)
    V.r_PDT_03 = _hll_FT_04.execute(_scl_FT_04.r_Out, 0.0, 1000.0)

    # Presión de Aceite (PT_02 / P_Oil)
    _scl_DP_01.execute(V.r_Local_4_I_Ch1Data,
                       V.r_SCL_DP_01_InRawMin, V.r_SCL_DP_01_InRawMax,
                       V.r_SCL_DP_01_InEUMin, V.r_SCL_DP_01_InEUMax)
    V.r_P_Oil = clamp(_scl_DP_01.r_Out, 0.0, 2000.0)

    V.i_P02_duracion_mSeg = timer.read()


# ═════════════════════════════════════════════════════════════════════════════
#  p08_AUTODIAGNOSTICO (P08_AUTO.LSF) — Lectura mA de diagnóstico
# ═════════════════════════════════════════════════════════════════════════════

def p08_autodiagnostico():
    """
    Migrado de: P08_AUTO.LSF
    Lee las corrientes mA de todos los canales para diagnóstico.
    En el PLC original leía los registros raw IDx_y; en Python/DAQ
    se leen directamente de la tarjeta de adquisición.
    """
    if not (V.b_P08_ejec_prog and not V.b_P08_ejec_prog_ant):
        return
    timer = V.t_P08_duracion
    timer.reset()

    # En modo DAQ, los valores mA se calculan desde las señales ya leídas
    # Aquí simplemente registramos los valores actuales para diagnóstico
    # (Las lecturas reales de la DAQ se harán en p02_entradas via driver)

    V.i_P08_duracion_mSeg = timer.read()
