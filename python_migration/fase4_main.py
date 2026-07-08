"""
═══════════════════════════════════════════════════════════════════════════════
  Orinoco SoftPLC — FASE 4: Lógica de Control Principal
  Migrado de: P05_MAIN.LSF, F05A_MAI.LSF … F05F_MAI.LSF
═══════════════════════════════════════════════════════════════════════════════
  Sub-rutinas:
    f05a → GET_CONTROLLER_STATUS  (reloj, estado del controlador)
    f05b → Analogicas             (escalamiento señales analógicas)
    f05c → Wedge_Laminar          (escalamiento DPs y presión)
    f05d → Alarmas                (evaluación de alarmas proceso)
    f05e → Wedge_Gas              (caudal de gas por cuña)
    f05f → LADDER                 (Sonar GVF + Viscosímetro Modbus)
═══════════════════════════════════════════════════════════════════════════════
"""

import math
import logging
import datetime

from global_vars import V
from function_blocks import (
    safe_pow, safe_sqrt,
    FB_HLL, FB_SEL, FB_SCL, FB_DIV,
)
from plc_timers import TON as FB_TON

logger = logging.getLogger("orinoco.fase4.main")

# ─────────────────────────────────────────────────────────────────────────────
#  Instancias de FB persistentes para F05B y F05C (_mp = main program)
# ─────────────────────────────────────────────────────────────────────────────
_fb_DIV_02        = FB_DIV()

_fb_SEL_01_mp     = FB_SEL()
_fb_SEL_03_pr     = FB_SEL()
_fb_SEL_05_mp     = FB_SEL()
_fb_SEL_06_mp     = FB_SEL()

_fb_HLL_mp = {n: FB_HLL() for n in [1,2,3,4,5,6,7,8,9,10,11,12,13,15,16,17,18]}
_fb_HLL_nivel_aux = FB_HLL()

_fb_SCL = {}
for _tag in ['WC','LIT','TIT','TIT_B','VORTEX_Q_01','PT','PIT_B_01',
             'VORTEX_T_01','FIT_05','FT_01','FT_02','FT_04','DP_01','nivel_aux']:
    _fb_SCL[_tag] = FB_SCL()

# Timers del programa principal
_ton_T_ON_INICIO = FB_TON()
_ton_T_ON_RELE   = FB_TON()


def _scl_params(tag: str):
    """Devuelve (RawMin, RawMax, EUMin, EUMax) de V para un tag SCL."""
    return (
        getattr(V, f'r_SCL_{tag}_InRawMin', 4.0),
        getattr(V, f'r_SCL_{tag}_InRawMax', 20.0),
        getattr(V, f'r_SCL_{tag}_InEUMin',  0.0),
        getattr(V, f'r_SCL_{tag}_InEUMax',  100.0),
    )

def _hll_mp(n: int):
    """Devuelve (LowLimit, HighLimit) del HLL _mp n desde V."""
    return (
        getattr(V, f'r_HLL_{n:02d}_mp_LowLimit',  0.0),
        getattr(V, f'r_HLL_{n:02d}_mp_HighLimit',  1e9),
    )


# ─────────────────────────────────────────────────────────────────────────────
#  F05A — GET_CONTROLLER_STATUS
# ─────────────────────────────────────────────────────────────────────────────
def f05a_get_controller_status():
    """Migrado de F05A_MAI.LSF. Lee reloj del sistema y estado del controlador."""
    # Rung 1: capturar fecha/hora
    now = datetime.datetime.now()
    V.ad_CLOCK[0] = now.year
    V.ad_CLOCK[1] = now.month
    V.ad_CLOCK[2] = now.day
    V.ad_CLOCK[3] = now.hour
    V.ad_CLOCK[4] = now.minute
    V.ad_CLOCK[5] = now.second

    V.ad_CLOCK_0 = V.ad_CLOCK[0]
    V.ad_CLOCK_1 = V.ad_CLOCK[1]
    V.ad_CLOCK_2 = V.ad_CLOCK[2]
    V.ad_CLOCK_3 = V.ad_CLOCK[3]
    V.ad_CLOCK_4 = V.ad_CLOCK[4]
    V.ad_CLOCK_5 = V.ad_CLOCK[5]

    # Rung 2: estado del controlador (SoftPLC: siempre en RUN)
    V.b_KEY_SWITCH_RUN     = True
    V.b_KEY_SWITCH_REM_RUN = False

    # Rung 3: PID habilitado (igual que P05_MAIN Rung 0)
    if V.b_primer_scan or V.b_PB_DESHABILITA_PID:
        V.b_DESHABILITA_PID = True
        if V.b_DESHABILITA_PID:
            V.b_PB_DESHABILITA_PID = False
    if V.b_DESHABILITA_PID and V.b_PB_HABILITA_PID:
        V.b_DESHABILITA_PID = False
        V.b_PB_HABILITA_PID = False


# ─────────────────────────────────────────────────────────────────────────────
#  F05B — Analogicas
# ─────────────────────────────────────────────────────────────────────────────
def f05b_analogicas():
    """Migrado de F05B_MAI.LSF. Escalamiento de señales analógicas."""
    # Viscosidad: VI / densidad → selector manual/auto → HLL
    _fb_DIV_02.execute(V.r_VI_MAN, V.r_d_m_PT_2)
    _fb_SEL_01_mp.execute(_fb_DIV_02.r_Out, V.r_visco_modbus, V.b_VI_SW)
    lo, hi = _hll_mp(1)
    _fb_HLL_mp[1].execute(_fb_SEL_01_mp.r_Out, lo, hi)
    V.r_v_oil_medida = _fb_HLL_mp[1].r_Out

    # WC: señal analógica escalada → selector manual/auto → HLL
    rm, rx, em, ex = _scl_params('WC')
    _fb_SCL['WC'].execute(V.r_Local_4_I_Ch7Data, rm, rx, em, ex)
    _fb_SEL_06_mp.execute(float(V.i_WC_MAN), _fb_SCL['WC'].r_Out, V.b_WC_SW)
    lo, hi = _hll_mp(2)
    _fb_HLL_mp[2].execute(_fb_SEL_06_mp.r_Out, lo, hi)
    V.r_WC = _fb_HLL_mp[2].r_Out

    # GVF: selector manual/Modbus → HLL
    _fb_SEL_05_mp.execute(float(V.i_GVF_MAN), V.r_GVF_modbus_data, V.b_GVF_SW)
    lo, hi = _hll_mp(3)
    _fb_HLL_mp[3].execute(_fb_SEL_05_mp.r_Out, lo, hi)
    V.r_GVoidF = _fb_HLL_mp[3].r_Out

    # LIT: nivel de tanque
    rm, rx, em, ex = _scl_params('LIT')
    _fb_SCL['LIT'].execute(V.r_Local_2_I_Ch0Data, rm, rx, em, ex)
    lo, hi = (getattr(V,'r_HLL_04_mp_LowLimit',0.0),
              getattr(V,'r_HLL_04_mp_HighLimit',1e9))
    _fb_HLL_mp[4].execute(_fb_SCL['LIT'].r_Out, lo, hi)
    V.r_LIT_001 = _fb_HLL_mp[4].r_Out

    # T_Oil: temperatura aceite
    rm, rx, em, ex = _scl_params('TIT')
    _fb_SCL['TIT'].execute(V.r_Local_4_I_Ch2Data, rm, rx, em, ex)
    lo, hi = _hll_mp(7)
    _fb_HLL_mp[7].execute(_fb_SCL['TIT'].r_Out, lo, hi)
    V.r_T_Oil_C = _fb_HLL_mp[7].r_Out
    # Señal de salida para fallo S3
    rm2, rx2, em2, ex2 = (V.r_SCL_TIT_B_InRawMin, V.r_SCL_TIT_B_InRawMax,
                          V.r_SCL_TIT_B_InEUMin,  V.r_SCL_TIT_B_InEUMax)
    _fb_SCL['TIT_B'].execute(_fb_HLL_mp[7].r_Out, rm2, rx2, em2, ex2)
    V.r_Salida_Falt_S3OCh2 = _fb_SCL['TIT_B'].r_Out

    # Transmisor Gas (o DP Gas según switch)
    _fb_SEL_03_pr.execute(V.r_Local_2_I_Ch2Data,
                          V.r_Local_4_I_Ch3Data,
                          V.b_Sw_Wedge_Gas)
    rm, rx, em, ex = _scl_params('VORTEX_Q_01')
    _fb_SCL['VORTEX_Q_01'].execute(_fb_SEL_03_pr.r_Out, rm, rx, em, ex)
    lo, hi = _hll_mp(16)
    _fb_HLL_mp[16].execute(_fb_SCL['VORTEX_Q_01'].r_Out, lo, hi)
    V.r_Transmisor_Gas = _fb_HLL_mp[16].r_Out
    V.fb_SEL_03_pr_r_Out = _fb_SEL_03_pr.r_Out

    # P_Gas: presión de gas
    rm, rx, em, ex = _scl_params('PT')
    _fb_SCL['PT'].execute(V.r_Local_4_I_Ch4Data, rm, rx, em, ex)
    lo, hi = _hll_mp(18)
    _fb_HLL_mp[18].execute(_fb_SCL['PT'].r_Out, lo, hi)
    V.r_P_Gas = _fb_HLL_mp[18].r_Out
    rm2 = V.r_SCL_PIT_B_01_InRawMin;  rx2 = V.r_SCL_PIT_B_01_InRawMax
    em2 = V.r_SCL_PIT_B_01_InEUMin;   ex2 = V.r_SCL_PIT_B_01_InEUMax
    _fb_SCL['PIT_B_01'].execute(_fb_HLL_mp[18].r_Out, rm2, rx2, em2, ex2)
    V.r_Salida_falt_L3OCh3 = _fb_SCL['PIT_B_01'].r_Out

    # T_Gas: temperatura gas
    rm, rx, em, ex = _scl_params('VORTEX_T_01')
    _fb_SCL['VORTEX_T_01'].execute(V.r_Local_4_I_Ch5Data, rm, rx, em, ex)
    lo, hi = _hll_mp(17)
    _fb_HLL_mp[17].execute(_fb_SCL['VORTEX_T_01'].r_Out, lo, hi)
    V.r_T_Gas = _fb_HLL_mp[17].r_Out

    # Q_DIL_MEDIDO: caudal de diluente medido
    rm, rx, em, ex = _scl_params('FIT_05')
    _fb_SCL['FIT_05'].execute(V.r_flujo_dil_4_20mA, rm, rx, em, ex)
    lo, hi = _hll_mp(15)
    _fb_HLL_mp[15].execute(_fb_SCL['FIT_05'].r_Out, lo, hi)
    V.r_Q_DIL_MEDIDO = _fb_HLL_mp[15].r_Out


# ─────────────────────────────────────────────────────────────────────────────
#  F05C — Wedge_Laminar (escalamiento de transmisores de presión diferencial)
# ─────────────────────────────────────────────────────────────────────────────
def f05c_wedge_laminar():
    """Migrado de F05C_MAI.LSF. Escala PDT_01, PDT_02, PDT_03, P_Oil y nivel."""
    # PDT_01 (transmisor FT_01, baja presión diferencial)
    rm, rx, em, ex = _scl_params('FT_01')
    _fb_SCL['FT_01'].execute(V.r_Local_2_I_Ch1Data, rm, rx, em, ex)
    lo, hi = _hll_mp(5)
    _fb_HLL_mp[5].execute(_fb_SCL['FT_01'].r_Out, lo, hi)
    V.r_PDT_01 = _fb_HLL_mp[5].r_Out

    # PDT_03 (transmisor FT_04)
    rm, rx, em, ex = _scl_params('FT_04')
    _fb_SCL['FT_04'].execute(V.r_Local_2_I_Ch3Data, rm, rx, em, ex)
    lo, hi = _hll_mp(13)
    _fb_HLL_mp[13].execute(_fb_SCL['FT_04'].r_Out, lo, hi)
    V.r_PDT_03 = _fb_HLL_mp[13].r_Out

    # PDT_02 (transmisor FT_02, wedge)
    rm, rx, em, ex = _scl_params('FT_02')
    _fb_SCL['FT_02'].execute(V.r_Local_4_I_Ch0Data, rm, rx, em, ex)
    lo, hi = _hll_mp(6)
    _fb_HLL_mp[6].execute(_fb_SCL['FT_02'].r_Out, lo, hi)
    V.r_PDT_02 = _fb_HLL_mp[6].r_Out

    # P_Oil (presión de crudo, transmisor DP_01)
    rm, rx, em, ex = _scl_params('DP_01')
    _fb_SCL['DP_01'].execute(V.r_Local_4_I_Ch1Data, rm, rx, em, ex)
    lo, hi = _hll_mp(12)
    _fb_HLL_mp[12].execute(_fb_SCL['DP_01'].r_Out, lo, hi)
    V.r_P_Oil = _fb_HLL_mp[12].r_Out

    # Nivel auxiliar / Simeflum
    rm, rx, em, ex = _scl_params('nivel_aux')
    _fb_SCL['nivel_aux'].execute(V.r_nivel_aux_4_20mA, rm, rx, em, ex)
    _fb_HLL_nivel_aux.execute(_fb_SCL['nivel_aux'].r_Out,
                              V.r_HLL_nivel_aux_LowLimit,
                              V.r_HLL_nivel_aux_HighLimit)
    V.r_DP_Simeflum = _fb_HLL_nivel_aux.r_Out
    V.r_nivel_aux   = V.r_DP_Simeflum


# ─────────────────────────────────────────────────────────────────────────────
#  F05D — Alarmas
# ─────────────────────────────────────────────────────────────────────────────
def f05d_alarmas():
    """Migrado de F05D_MAI.LSF. Ejecuta bloques FB_ALARM para todas las variables."""
    _alarm_map = [
        ('DP_01',  V.r_DP_Simeflum),
        ('FT_01',  V.r_PDT_01),
        ('FT_02',  V.r_PDT_02),
        ('FT_03',  V.r_Q_gas),
        ('FT_04',  V.r_PDT_03),
        ('FT_05',  V.r_caudal_dil_BM),
        ('GVF',    V.r_GVoidF),
        ('LIT',    V.r_LIT_001),
        ('PT_01',  V.r_P_Gas),
        ('PT_02',  V.r_P_Oil),
        ('TIT_01', V.r_T_Oil_C),
        ('TIT_02', V.r_T_Gas),
        ('VIT',    V.r_v_oil_medida),
        ('WC',     V.r_WC),
    ]
    for tag, pv in _alarm_map:
        fb = getattr(V, f'fb_ALARM_{tag}')
        ll  = getattr(V, f'r_ALARM_{tag}_LL_LIMIT', 0.0)
        l   = getattr(V, f'r_ALARM_{tag}_L_LIMIT',  10.0)
        h   = getattr(V, f'r_ALARM_{tag}_H_LIMIT',  90.0)
        hh  = getattr(V, f'r_ALARM_{tag}_HH_LIMIT', 100.0)
        db  = getattr(V, f'r_ALARM_{tag}_DB',        0.5)
        tm  = getattr(V, f'r_ALARM_{tag}_TIME',      2.0)
        fb.execute(pv, ll, l, h, hh, db, tm)
        # Espejo de salidas booleanas hacia V
        setattr(V, f'fb_ALARM_{tag}_b_AHH', fb.b_AHH)
        setattr(V, f'fb_ALARM_{tag}_b_AH',  fb.b_AH)
        setattr(V, f'fb_ALARM_{tag}_b_AL',  fb.b_AL)
        setattr(V, f'fb_ALARM_{tag}_b_ALL', fb.b_ALL)


# ─────────────────────────────────────────────────────────────────────────────
#  F05E — Wedge Gas (caudal de gas por medidor cuña)
# ─────────────────────────────────────────────────────────────────────────────
def f05e_wedge_gas():
    """Migrado de F05E_MAI.LSF. Calcula Q_gas a partir de DP_gas y geometría cuña."""
    # Rung 1: presiones absolutas
    V.r_P2_Gas   = (V.r_P_Gas + V.r_PA) * 6894.75
    V.r_P1_Gas   = V.r_P2_Gas + (248.84 * V.r_DP_gas)
    V.r_DP_gas_PK = V.r_DP_gas * 0.24884

    # Rung 2: geometría cuña de gas
    if V.r_D_wedge_gas != 0.0:
        V.r_A1 = 1.0 - (2.0 * V.r_h_wedge_gas / V.r_D_wedge_gas)
    else:
        V.r_A1 = 0.0

    # Rung 3: ángulo fi
    arg = max(-1.0, min(1.0, V.r_A1))
    V.r_fi_gas = 2.0 * math.acos(arg)

    # Rung 4: Beta (por raíz cuadrada compuesta)
    if V.r_D_wedge_gas != 0.0:
        ratio   = V.r_h_wedge_gas / V.r_D_wedge_gas
        ratio2  = V.r_h_wedge_gas / safe_pow(V.r_D_wedge_gas, 2.0)
        inner   = ratio - ratio2
        arg_sq  = (V.r_fi_gas / (2.0 * V.r_pi)
                   - (2.0 / V.r_pi) * V.r_A1 * safe_sqrt(inner))
        V.r_Beta_mp = safe_sqrt(max(0.0, arg_sq))

    # Rung 5: coeficiente de descarga
    V.r_C_B = 0.5433 + (0.2453 * (1.0 - safe_pow(V.r_Beta_mp, 2.0)))

    # Rung 6-7: áreas de sección
    V.r_A_mp  = V.r_pi * safe_pow(V.r_D_wedge_gas, 2.0) / 4.0
    V.r_Ao_mp = (V.r_A_mp
                 - (safe_pow(V.r_D_wedge_gas, 2.0)
                    * (2.0 * V.r_pi - V.r_fi_gas
                       + (2.0 * V.r_A1 * math.sin(V.r_fi_gas / 2.0)))
                    / 8.0))

    # Rung 8-11: factor de expansión Y1
    if V.r_P1_Gas != 0.0:
        V.r_P3_Gas = V.r_P2_Gas / V.r_P1_Gas
    V.r_Y1a = ((1.0 - safe_pow(V.r_Beta_mp, 4.0))
               * (V.r_k_mp / (V.r_k_mp - 1.0))
               * safe_pow(V.r_P3_Gas, 2.0 / V.r_k_mp)
               * (1.0 - safe_pow(V.r_P3_Gas, (V.r_k_mp - 1.0) / V.r_k_mp)))
    V.r_Y1b = ((1.0 - (safe_pow(V.r_Beta_mp, 4.0)
                        * safe_pow(V.r_P3_Gas, 2.0 / V.r_k_mp)))
               * (1.0 - V.r_P3_Gas))
    if V.r_Y1b != 0.0:
        V.r_Y1 = safe_pow(V.r_Y1a / V.r_Y1b, 0.5)

    # Rung 12: caudal volumétrico gas 1
    V.r_d_Gas = V.r_d_Gas_TP
    denom_b4  = safe_sqrt(1.0 - safe_pow(V.r_Beta_mp, 4.0))
    if denom_b4 != 0.0 and V.r_d_Gas != 0.0:
        V.r_Q_gas_1 = (4.47214e-5 * V.r_Y1 * V.r_Ao_mp / denom_b4
                       * safe_sqrt(V.r_DP_gas_PK / V.r_d_Gas))

    # Rung 13: caudal final
    if V.r_Y1b != 0.0:
        V.r_Q_gas = 3.05119e3 * V.r_C_B * V.r_Q_gas_1
    else:
        V.r_Q_gas = 0.0


# ─────────────────────────────────────────────────────────────────────────────
#  F05F — LADDER (Sonar GVF + Viscosímetro Modbus)
# ─────────────────────────────────────────────────────────────────────────────
def f05f_ladder():
    """Migrado de F05F_MAI.LSF. Selecciona GVF del Sonar y viscosidad del Modbus."""
    # fb_MoveSONAR_01: cuando GVF_EN, selecciona ar_Sonar_real[9] como GVF
    if V.b_GVF_EN and len(V.ar_Sonar_real) > 9:
        V.r_GVF_modbus_data = V.ar_Sonar_real[9]
    else:
        V.r_GVF_modbus_data = 0.0

    # fb_MoveVISCO_01: selección de viscosidad Modbus (registros 4, 6, 8)
    d4 = getattr(V, 'r_MBS_ORINOCO_I1_Data_4', 0.0)
    d6 = getattr(V, 'r_MBS_ORINOCO_I1_Data_6', 0.0)
    d8 = getattr(V, 'r_MBS_ORINOCO_I1_Data_8', 0.0)
    # El FB selecciona el canal cuya densidad coincide con d_m_PT_2
    # En la implementación original: r_VISCOSIDAD_03 = tercer canal de visco
    V.r_visco_modbus = d8  # canal viscosidad 3 (índice 8 = VISCOSIDAD_03)


# ═════════════════════════════════════════════════════════════════════════════
#  PROGRAMA PRINCIPAL p05_main
# ═════════════════════════════════════════════════════════════════════════════
def p05_main():
    """
    Programa principal de lógica de control.
    Migrado de P05_MAIN.LSF.
    Se ejecuta en cada scan (coordinado por scan_engine).
    """
    if not (V.b_P05_ejec_prog and not V.b_P05_ejec_prog_ant):
        return

    V.t_P05_duracion.reset()

    # Rung 0: deshabilitar PID por falla de presión
    if (V.b_primer_scan or V.b_PB_DESHABILITA_PID
            or V.r_P_Gas  >= V.r_falla_presion_gas
            or V.r_P_Oil  >= V.r_falla_presion_crudo):
        V.b_DESHABILITA_PID = True
        if V.b_DESHABILITA_PID:
            V.b_PB_DESHABILITA_PID = False
    if V.b_DESHABILITA_PID and (V.b_PB_HABILITA_PID or V.b_PB_DESHABILITA_PID_FS):
        V.b_DESHABILITA_PID = False
        V.b_PB_HABILITA_PID = False

    # Rung 1-2: timer de inicio (5s) → habilita PID al arranque
    if V.b_primer_scan or V.b_AUX_T_ON_INICIO:
        V.b_T_ON_INICIO   = True
        V.b_AUX_T_ON_INICIO = True
    else:
        V.b_T_ON_INICIO = False
    _ton_T_ON_INICIO.execute(V.b_T_ON_INICIO, 5.0)
    if _ton_T_ON_INICIO.q:
        V.b_PB_DESHABILITA_PID_FS = True
        V.b_AUX_T_ON_INICIO       = False
    else:
        V.b_PB_DESHABILITA_PID_FS = False

    # Rung 3: tipo de equipo
    if V.b_BIT_PROTECTION:
        V.r_TIPO_EQUIPO = float(V.d_T_EQUIPO)

    # Rung 4: cargar límites superiores de HLL desde rangos de SCL
    if V.b_BIT_PROTECTION:
        V.r_HLL_01_mp_HighLimit = V.r_SCL_VIT_InEUMax
        V.r_HLL_02_mp_HighLimit = V.r_SCL_WC_InEUMax
        V.r_HLL_03_mp_HighLimit = V.r_SCL_GVF_InEUMax
        V.r_HLL_05_mp_HighLimit = V.r_SCL_FT_01_InEUMax
        V.r_HLL_06_mp_HighLimit = V.r_SCL_FT_02_InEUMax
        V.r_HLL_13_mp_HighLimit = V.r_SCL_FT_04_InEUMax
        V.r_HLL_07_mp_HighLimit = V.r_SCL_TIT_InEUMax
        V.r_HLL_16_mp_HighLimit = V.r_SCL_VORTEX_Q_01_InEUMax
        V.r_HLL_09_mp_HighLimit = getattr(V, 'r_SCL_VORTEX_P_InEUMax', 1e9)
        V.r_HLL_10_mp_HighLimit = V.r_SCL_VORTEX_T_01_InEUMax
        V.r_HLL_17_mp_HighLimit = V.r_SCL_VORTEX_T_01_InEUMax
        V.r_HLL_11_mp_HighLimit = V.r_SCL_PT_InEUMax
        V.r_HLL_12_mp_HighLimit = V.r_SCL_DP_01_InEUMax

    # Rung 5-6: límites LIT según sentido (flujo o rebose)
    if V.b_BIT_PROTECTION and V.r_SCL_LIT_InEUMin == 0.0:
        V.r_HLL_04_mp_LowLimit  = V.r_SCL_LIT_InEUMin
        V.r_HLL_04_mp_HighLimit = V.r_SCL_LIT_InEUMax
    if V.b_BIT_PROTECTION and V.r_SCL_LIT_InEUMin == 100.0:
        V.r_HLL_04_mp_HighLimit = V.r_SCL_LIT_InEUMin
        V.r_HLL_04_mp_LowLimit  = V.r_SCL_LIT_InEUMax

    # Rung 7: asignar DP Wedge
    if V.b_BIT_PROTECTION:
        V.r_DP_W = V.r_PDT_02

    # Rung 8: parámetros de escalamiento derivados TIT_B y PIT_B
    if V.b_BIT_PROTECTION:
        V.r_SCL_TIT_B_InRawMin = V.r_SCL_TIT_InEUMin
        V.r_SCL_TIT_B_InRawMax = V.r_SCL_TIT_InEUMax
        V.r_SCL_PIT_B_InRawMin = getattr(V, 'r_SCL_VORTEX_P_InEUMin', 0.0)
        V.r_SCL_PIT_B_InRawMax = getattr(V, 'r_SCL_VORTEX_P_InEUMax', 100.0)

    # Rung 9: selección transmisor Laminar (baja o alta presión diferencial)
    if V.b_BIT_PROTECTION:
        if (V.r_PDT_01 < V.r_MAX_MIN_TRANSBAJA) or not V.b_Sel_T_baja:
            V.r_DP_L            = V.r_PDT_03
            V.b_transmisor_baja = True
        else:
            V.b_transmisor_baja = False
    if V.b_BIT_PROTECTION and V.b_Sel_T_baja and (V.r_PDT_01 >= V.r_MAX_MIN_TRANSBAJA):
        V.r_DP_L = V.r_PDT_01

    # Rung 10-11: caudal gas (vortex o wedge gas)
    if V.b_BIT_PROTECTION and not V.b_Sw_Wedge_Gas:
        V.r_Q_gas  = V.r_Transmisor_Gas / 1000.0
    if V.b_BIT_PROTECTION and V.b_Sw_Wedge_Gas:
        V.r_DP_gas = V.r_Transmisor_Gas

    # Rungs 12-16: subfunciones
    if V.b_BIT_PROTECTION:
        f05a_get_controller_status()
    if V.b_BIT_PROTECTION:
        f05b_analogicas()
    if V.b_BIT_PROTECTION:
        f05c_wedge_laminar()
    if V.b_BIT_PROTECTION:
        f05d_alarmas()
    if V.b_BIT_PROTECTION and V.b_Sw_Wedge_Gas:
        f05e_wedge_gas()

    # Rung 17-18: BIT_PROTECTION (protección de software / serial del PLC)
    # Habilitado de forma permanente para el entorno de migración en PC
    V.d_LSI_PROTECCION = V.d_VOX_ANALIZER
    V.b_BIT_PROTECTION   = True
    V.b_BIT_PROTECTION_1 = V.b_BIT_PROTECTION

    # Rung 19-21: relé de vigilancia (watchdog 1 minuto)
    V.b_T_ON_RELE = V.b_BIT_PROTECTION
    _ton_T_ON_RELE.execute(V.b_T_ON_RELE, 60.0)
    if not _ton_T_ON_RELE.q and V.b_BIT_PROTECTION:
        V.b_AUX_RELE = False
    if _ton_T_ON_RELE.q:
        V.b_AUX_RELE = True

    # Rung 22: salida relé y válvula gas
    V.b_Local_1_O_Data_5 = V.b_AUX_RELE
    V.b_ON_VLV_GAS_01    = V.b_AUX_RELE

    # Rung 23: habilitación GVF (Sonar)
    if (V.b_BIT_PROTECTION
            and len(V.ar_Sonar_real) > 9
            and 0.0 <= V.ar_Sonar_real[9] <= 100.0):
        V.b_GVF_EN = True
    else:
        V.b_GVF_EN = False

    # Rung 24: LADDER (siempre)
    f05f_ladder()

    # Rung 25-33: cálculos de mezcla API y error de caudal
    if V.b_BIT_PROTECTION:
        denom25 = V.r_API_formacion_BM - V.r_API_2
        if denom25 != 0.0:
            V.r_CAUDAL_NETO_TEORICO = ((V.r_API_2 - V.r_API_1)
                                       / denom25 * V.r_caudal_dil_BM)
        denom26 = V.r_caudal_dil_BM + V.r_caudal_nETO_Dil
        if denom26 != 0.0:
            V.r_API_MEZCLA_TEORICO = ((V.r_caudal_nETO_Dil * V.r_API_formacion_BM
                                       + V.r_caudal_dil_BM * V.r_API_1)
                                      / denom26)
        V.r_CAUDAL_NETO_Dil_TEORICO = V.r_CAUDAL_NETO_TEORICO + V.r_caudal_dil_BM
        V.r_caudal_nETO_Dil         = V.r_Q_Crudo_sc_Estimado - V.r_caudal_dil_BM
        V.r_CAUDAL_TOTAL_TEORICO    = (V.r_CAUDAL_NETO_TEORICO
                                       + V.r_caudal_dil_BM
                                       + V.r_Q_W_sc_Estimado)
        if V.r_API_MEZCLA_TEORICO != 0.0:
            V.r_ERROR_API_MEZCLA = ((V.r_API_2 - V.r_API_MEZCLA_TEORICO)
                                    * 100.0 / V.r_API_MEZCLA_TEORICO)
        if V.r_CAUDAL_NETO_TEORICO != 0.0:
            V.r_ERROR_CAUDAL_NETO = ((V.r_caudal_nETO_Dil - V.r_CAUDAL_NETO_TEORICO)
                                     * 100.0 / V.r_CAUDAL_NETO_TEORICO)
        if V.r_CAUDAL_NETO_Dil_TEORICO != 0.0:
            V.r_ERROR_CAUDAL_NETO_Dil = ((V.r_Q_Crudo_sc_Estimado
                                           - V.r_CAUDAL_NETO_Dil_TEORICO)
                                          * 100.0 / V.r_CAUDAL_NETO_Dil_TEORICO)
        if V.r_CAUDAL_TOTAL_TEORICO != 0.0:
            V.r_ERROR_CAUDAL_TOTAL = ((V.r_Qb_Liquido_sc_Estimado
                                       - V.r_CAUDAL_TOTAL_TEORICO)
                                      * 100.0 / V.r_CAUDAL_TOTAL_TEORICO)

    # Rung 34-37: clasificación de errores (1=OK, 2=WARN, 3=ALARM)
    def _classify(err, thresholds):
        lo1, hi1, lo2, hi2 = thresholds
        if lo1 < err < hi1:
            return 1
        if lo2 < err <= lo1 or hi1 <= err < hi2:
            return 2
        return 3

    V.i_STATUS_ERROR_API_MEZCLA    = _classify(V.r_ERROR_API_MEZCLA,
                                                (-20.0, 20.0, -40.0, 40.0))
    V.i_STATUS_ERROR_CAUDAL_NETO   = _classify(V.r_ERROR_CAUDAL_NETO,
                                                (-20.0, 20.0, -40.0, 40.0))
    V.i_STATUS_ERROR_CAUDAL_NETO_Dil = _classify(V.r_ERROR_CAUDAL_NETO_Dil,
                                                  (-10.0, 10.0, -15.0, 15.0))
    V.i_STATUS_ERROR_CAUDAL_TOTAL  = _classify(V.r_ERROR_CAUDAL_TOTAL,
                                                (-20.0, 20.0, -40.0, 40.0))

    # Rungs 38-57: mapeo datos Sonar desde registros Modbus
    for idx, reg in enumerate(range(20, 42)):
        val = getattr(V, f'r_MBS_ORINOCO_I1_Data_{reg}', 0.0)
        if idx < len(V.ar_Sonar_real):
            V.ar_Sonar_real[idx] = val

    # Rungs 60-61: reenvío de P y T a Modbus de salida
    V.r_MBS_ORINOCO_O1_Data_1 = V.r_P_Oil
    V.r_MBS_ORINOCO_O1_Data_3 = V.r_T_Oil_C

    # Rungs 62-63: control automático válvulas de gas
    if V.b_BIT_PROTECTION:
        gas_bajo  = ((V.r_Transmisor_Gas <= 5.0   and V.b_AUTO_GAS_01)
                     or (not V.b_SEL_VLV_GAS_01   and not V.b_AUTO_GAS_01))
        gas_alto  = ((V.r_Transmisor_Gas >= 248.0  and V.b_AUTO_GAS_01)
                     or (V.b_SEL_VLV_GAS_01         and not V.b_AUTO_GAS_01))
        if gas_bajo:
            V.b_VLV_01 = V.b_VLV_02 = V.b_VLV_03 = True
        if gas_alto:
            V.b_VLV_01 = V.b_VLV_02 = V.b_VLV_03 = False

    # Rungs 64-68: salidas digitales válvulas (lógica directa/inversa)
    V.b_Local_1_O_Data_0 = not V.b_VLV_01
    V.b_Local_1_O_Data_1 = V.b_VLV_02
    V.b_Local_1_O_Data_2 = V.b_VLV_03
    V.b_Local_1_O_Data_3 = not V.b_VLV_02
    V.b_Local_1_O_Data_4 = not V.b_VLV_03

    # Rungs 69-70: geometría cuña de gas según rango de válvulas (ONS)
    cuna_baja = V.b_Local_1_O_Data_1 or V.b_Local_1_O_Data_2
    cuna_alta = V.b_Local_1_O_Data_3 or V.b_Local_1_O_Data_4
    if cuna_baja and not V.b_AUX_CUNA_BAJA:
        V.r_D_wedge_gas = 40.89
        V.r_h_wedge_gas = 8.2
        V.r_k_mp        = 1.1
    V.b_AUX_CUNA_BAJA = cuna_baja
    if cuna_alta and not V.b_AUX_CUNA_ALTA:
        V.r_D_wedge_gas = 52.5
        V.r_h_wedge_gas = 34.13
        V.r_k_mp        = 1.1
    V.b_AUX_CUNA_ALTA = cuna_alta

    # Aplicar overrides manuales de instrumentos (bypasea el escalamiento de f05b/f05c)
    V.apply_overrides()

    # Fin del programa
    V.i_P05_duracion_mSeg = V.t_P05_duracion.read()
