"""
═══════════════════════════════════════════════════════════════════════════════
  Orinoco SoftPLC — FASE 3b: Cálculos de Caudal
  Migrado de: P04_CAUD.LSF, F04A_CAU.LSF … F04J_CAU.LSF
═══════════════════════════════════════════════════════════════════════════════
  Sub-rutinas:
    f04a → Caudal de Gas (condiciones estándar)
    f04b → Caudal Laminar (Hagen-Poiseuille + correcciones)
    f04c → Caudal Wedge (medidor cuña)
    f04d → Condiciones Estándar (PVT: Bo, Rso, Ee_PT_Oil)
    f04e → Selector Wedge/Laminar (caudales línea)
    f04f → Selector Wedge/Laminar (caudales condiciones estándar)
    f04g → Volúmenes acumulados y estimados
    f04h → Volumen de diluente
    f04i → Proyección de volúmenes
    f04j → Promedios de presión, temperatura, viscosidad
═══════════════════════════════════════════════════════════════════════════════
"""

import math
import logging

from global_vars import V
from function_blocks import safe_pow, safe_sqrt, FB_HLL, FB_SEL

logger = logging.getLogger("orinoco.fase3.caudal")

# ---------------------------------------------------------------------------
# Instancias de FB_HLL y FB_SEL para F04E (caudales de línea)
# Equivalen a los bloques fb_HLL_xx_cd / fb_SEL_xx_cd de ISaGRAF
# ---------------------------------------------------------------------------
_hll = {i: FB_HLL() for i in [1, 2, 3, 6, 7, 8, 25, 26, 27, 28,
                                11, 12, 13, 14, 15, 16, 17, 18, 19, 20]}
_sel = {i: FB_SEL() for i in [1, 2, 3, 6, 7, 8, 9, 10, 16, 17]}


def _hll_lim(n: int):
    """Devuelve (LowLimit, HighLimit) para el HLL n desde V o defaults."""
    lo = getattr(V, f"r_HLL_{n:02d}_cd_LowLimit", 0.0)
    hi = getattr(V, f"r_HLL_{n:02d}_cd_HighLimit", 1.0e9)
    return lo, hi


# ─────────────────────────────────────────────────────────────────────────────
#  F04A — Caudal de Gas (condiciones estándar)
# ─────────────────────────────────────────────────────────────────────────────
def f04a_caudal_gas():
    """Migrado de F04A_CAU.LSF. Rung 0: Q_gas_STD = Q_gas * Ee_PT."""
    V.r_Q_gas_STD = V.r_Q_gas * V.r_Ee_PT


# ─────────────────────────────────────────────────────────────────────────────
#  F04B — Caudal Laminar
# ─────────────────────────────────────────────────────────────────────────────
def f04b_caudal_laminar():
    """Migrado de F04B_CAU.LSF. Caudal por medidor laminar Hagen-Poiseuille."""
    # Rung 0: parámetro x (adimensional)
    denom0 = (V.r_d_Oil_PT * 1000.0 * safe_pow(V.r_v_oil_medida, 2.0)) * safe_pow(10.0, 7.0)
    if denom0 != 0.0:
        V.r_x = V.r_DP_L / (V.r_d_Oil_PT * 1000.0
                             * safe_pow(V.r_v_oil_medida, 2.0)) * safe_pow(10.0, 7.0)

    # Rung 1: coeficiente k_cd cuadrático en x
    V.r_k_cd = V.r_AK_L * safe_pow(V.r_x, 2.0) + V.r_BK_L * V.r_x + V.r_CK_L

    # Rung 2: caudal mezcla laminar (m³/s)
    denom2a = 128.0 * (safe_pow(V.r_d_L, 4.0) * V.r_N_Tubos * 1000.0)
    denom2b = (V.r_miu_Oil * V.r_L) * (V.r_DP_L * 248.84)
    if denom2a != 0.0 and denom2b != 0.0:
        V.r_Q_Mezcla_L = (3.1415925 * V.r_k_cd / 128.0
                          * (safe_pow(V.r_d_L, 4.0) * V.r_N_Tubos * 1000.0)
                          / (V.r_miu_Oil * V.r_L)
                          * (V.r_DP_L * 248.84))

    # Rung 3: caudal mezcla en bbl/día (display)
    V.d_Qb_Mezcla_L = int(V.r_Q_Mezcla_L * 3600.0 * 151.0)

    # Rung 4: caudal líquido (sin gas)
    V.r_Q_Liquido_L = (1.0 - V.r_GVoidF / 100.0) * V.r_Q_Mezcla_L

    # Rung 5: bbl/día líquido laminar
    V.r_Qb_Liquido_L = V.r_Q_Liquido_L * 3600.0 * 151.0

    # Rung 6: bbl/día líquido sc laminar
    V.r_Qb_Liquido_sc_L = V.r_Q_Crudo_sc_L + V.r_Q_W_sc_L

    # Rung 7: caudal crudo laminar (bbl/día)
    V.r_Q_Crudo_L = (1.0 - V.r_WC / 100.0) * V.r_Q_Liquido_L * 3600.0 * 151.0

    # Rung 8: crudo condiciones estándar
    if V.r_Bo != 0.0:
        V.r_Q_Crudo_sc_L = V.r_Coil * (1.0 / V.r_Bo) * V.r_Q_Crudo_L

    # Rung 13: caudal agua laminar
    V.r_Q_W_L = V.r_WC / 100.0 * V.r_Qb_Liquido_L

    # Rung 14: agua sc
    V.r_Q_W_sc_L = V.r_Q_W_L * V.r_CW_TP

    # Rung 15: gas atrapado laminar (MMPCD)
    V.r_Q_gat_L = (V.r_GVoidF / 100.0 * V.r_Q_Mezcla_L
                   * 35.31467 * 3600.0 * 24.0)

    # Rung 17: gas atrapado sc
    V.r_Q_gat_sc_L = V.r_Ee_PT_Oil * V.r_Q_gat_L

    # Rung 18: caudal gas total laminar
    V.r_Q_gas_T_L = V.r_Q_gas + (V.r_Q_gat_sc_L / 1000.0)

    # Rung 19: gas disuelto laminar
    V.r_Qgsol_L = V.r_Rso_PT * V.r_Q_Crudo_sc_L

    # Rung 20: gas total sc laminar
    V.r_Q_gas_T_sc_L = V.r_Q_gas_STD + ((V.r_Q_gat_sc_L + V.r_Qgsol_L) / 1000.0)

    # Rung 22: número de Reynolds laminar
    denom_re = (3.1415925 * (V.r_d_L / 4.0)
                * (V.r_miu_Oil / 1000.0 * V.r_N_Tubos))
    if denom_re != 0.0:
        V.r_RE_L = (V.r_d_m_PT * 1000.0 * V.r_Q_Mezcla_L / denom_re)


# ─────────────────────────────────────────────────────────────────────────────
#  F04C — Caudal Wedge (medidor cuña)
# ─────────────────────────────────────────────────────────────────────────────
def f04c_caudal_wedge():
    """Migrado de F04C_CAU.LSF. Caudal por medidor cuña (wedge)."""
    # Rung 0-1: geometría
    V.r_z = V.r_m * V.r_D_Wedge
    V.r_D_Wedge1 = V.r_D_Wedge / 25.4

    # Rung 2: ángulo fi
    if V.r_D_Wedge != 0.0:
        arg = 1.0 - 2.0 * V.r_z / V.r_D_Wedge
        arg = max(-1.0, min(1.0, arg))
        V.r_fi = 2.0 * math.acos(arg)

    # Rung 3: área total sección circular
    V.r_A_cd = 3.141593 * safe_pow(V.r_D_Wedge, 2.0) / 4.0

    # Rung 4: área abierta (sin cuña)
    if V.r_D_Wedge != 0.0:
        V.r_Ao_cd = (V.r_A_cd
                     - safe_pow(V.r_D_Wedge, 2.0)
                     * (2.0 * 3.141593 - V.r_fi
                        + 2.0 * (1.0 - 2.0 * V.r_z / V.r_D_Wedge)
                        * math.sin(V.r_fi / 2.0)) / 8.0)

    # Rung 5: Beta (ratio de área)
    if V.r_D_Wedge != 0.0:
        ratio = V.r_z / V.r_D_Wedge
        inner = ratio - safe_pow(ratio, 2.0)
        V.r_Beta_cd = safe_sqrt(
            V.r_fi / (2.0 * 3.141593)
            - (1.0 / 3.141593)
            * (1.0 - 2.0 * V.r_z / V.r_D_Wedge)
            * safe_sqrt(inner))

    # Rung 6: coeficiente de descarga Cd
    V.r_Cd_Beta = 0.5433 + 0.2453 * (1.0 - safe_pow(V.r_Beta_cd, 2.0))

    # Rung 7: caudal mezcla wedge (m³/s)
    if V.r_d_m_PT != 0.0:
        V.r_Q_Mezcla_W = (V.r_K_wedge * V.r_Cd_Beta
                          * V.r_Ao_cd / 1_000_000.0
                          * safe_sqrt(2.0 * V.r_DP_W * 248.84
                                      / (V.r_d_m_PT * 1000.0))
                          + V.r_AK_W / 543_600.0)

    # Rung 8-9: líquido wedge
    V.r_Q_Liquido_W = (1.0 - V.r_GVoidF / 100.0) * V.r_Q_Mezcla_W
    V.r_Qb_Liquido_W = V.r_Q_Liquido_W * 3600.0 * 151.0

    # Rung 10: bbl/día líquido sc wedge
    V.r_Qb_Liquido_sc_W = V.r_Q_Crudo_sc_W + V.r_Q_W_sc_W

    # Rung 11: crudo wedge (bbl/día)
    V.r_Q_Crudo_W = (1.0 - V.r_WC / 100.0) * V.r_Q_Liquido_W * 3600.0 * 151.0

    # Rung 12: crudo sc wedge
    if V.r_Bo != 0.0:
        V.r_Q_Crudo_sc_W = V.r_Coil * (1.0 / V.r_Bo) * V.r_Q_Crudo_W

    # Rung 17: zeros (AFI deshabilitadas)
    V.r_Q_Dil_lina_W = 0.0
    V.r_Q_Dil_sc_W = 0.0
    V.r_Q_Crudo_W_neto = 0.0
    V.r_Q_Crudo_sc_W_neto = 0.0

    # Rung 18: agua wedge
    if V.r_Q_Liquido_W != 0.0:
        V.r_Q_W_W = V.r_WC / 100.0 * V.r_Q_Liquido_W * 3600.0 * 151.0

    # Rung 19: agua sc wedge
    V.r_Q_W_sc_W = V.r_Q_W_W * V.r_CW_TP

    # Rung 20: gas atrapado wedge
    if V.r_Q_Mezcla_W != 0.0:
        V.r_Q_gat_W = (V.r_GVoidF / 100.0 * V.r_Q_Mezcla_W
                       * 35.31467 * 3600.0 * 24.0)

    # Rung 22: gas atrapado sc wedge
    V.r_Q_gat_sc_W = V.r_Ee_PT * V.r_Q_gat_W

    # Rung 23: gas total wedge
    V.r_Q_gas_T_W = V.r_Q_gas + (V.r_Q_gat_sc_W / 1000.0)

    # Rung 24: gas disuelto wedge
    V.r_Qgsol_W = V.r_Rso_PT * V.r_Q_Crudo_sc_W

    # Rung 25: gas total sc wedge
    V.r_Q_gas_T_sc_W = V.r_Q_gas_STD + ((V.r_Q_gat_sc_W + V.r_Qgsol_W) / 1000.0)

    # Rung 26: número de Reynolds wedge
    if V.r_miu_Oil != 0.0 and V.r_D_Wedge != 0.0:
        denom_rew = (3.1415925 / 4.0
                     * V.r_miu_Oil / 1000.0
                     * V.r_D_Wedge / 1000.0)
        if denom_rew != 0.0:
            V.r_RE_W = V.r_d_m_PT * 1000.0 * V.r_Q_Mezcla_W / denom_rew


# ─────────────────────────────────────────────────────────────────────────────
#  F04D — Condiciones Estándar (PVT)
# ─────────────────────────────────────────────────────────────────────────────
def f04d_condiciones_estandar():
    """Migrado de F04D_CAU.LSF. Calcula Ee_PT_Oil, Bo, Rso."""
    # Rung 0: factor expansión a temp de crudo
    denom0 = (V.r_T_Oil_C + 273.0) * V.r_Z_Gas_P
    if denom0 != 0.0:
        V.r_Ee_PT_Oil = 19.6523 * (V.r_P_Gas + V.r_PA) / denom0

    # Rung 1: gravedad específica referencia (API)
    V.r_S_Oil_ref = 141.5 / (131.5 + V.r_API_2)

    # Rung 2: exponent Yg_T para Standing
    V.r_Yg_T = 0.00091 * V.r_T_Yac_F - 0.0125 * V.r_API_2

    # Rung 3: Rso calculado (Standing)
    V.r_Rso_PT1 = V.r_yg * safe_pow(
        (V.r_P_Gas + V.r_PA) / (18.0 * safe_pow(10.0, V.r_Yg_T)), 1.204)

    # Rung 4: función F_PT para Bo
    V.r_F_PT = (V.r_Rso_PT * safe_sqrt(V.r_yg / V.r_S_Oil_ref)
                + 1.25 * V.r_T_Yac_F)

    # Rung 5: Bo calculado (Standing)
    V.r_Bo1 = 0.972 + 0.000147 * safe_pow(V.r_F_PT, 1.175)

    # Rung 6-7: selección Bo y Rso (correlación vs PVT laboratorio)
    if not V.b_PB_PVT:
        V.r_Bo = V.r_Bo1
        V.r_Rso_PT = V.r_Rso_PT1
    if V.b_PB_PVT:
        V.r_Bo = V.r_Bo2
        V.r_Rso_PT = V.r_Rso_PT2


# ─────────────────────────────────────────────────────────────────────────────
#  F04E — Selector Wedge/Laminar (caudales de línea)
# ─────────────────────────────────────────────────────────────────────────────
def f04e_selector_linea():
    """Migrado de F04E_CAU.LSF. Selecciona entre Wedge y Laminar con limitadores."""
    w = V.b_Wedge

    # Líquido: HLL_01(L) vs HLL_06(W) → SEL_01
    lo1, hi1 = _hll_lim(1);  _hll[1].execute(V.r_Qb_Liquido_L, lo1, hi1)
    lo6, hi6 = _hll_lim(6);  _hll[6].execute(V.r_Qb_Liquido_W, lo6, hi6)
    V.r_Q_Liquido = _sel[1].execute(_hll[1].r_Out, _hll[6].r_Out, w)

    # Crudo: HLL_02(L) vs HLL_07(W) → SEL_02
    lo2, hi2 = _hll_lim(2);  _hll[2].execute(V.r_Q_Crudo_L, lo2, hi2)
    lo7, hi7 = _hll_lim(7);  _hll[7].execute(V.r_Q_Crudo_W, lo7, hi7)
    V.r_Q_Crudo = _sel[2].execute(_hll[2].r_Out, _hll[7].r_Out, w)

    # Agua: HLL_03(L) vs HLL_08(W) → SEL_03
    lo3, hi3 = _hll_lim(3);  _hll[3].execute(V.r_Q_W_L, lo3, hi3)
    lo8, hi8 = _hll_lim(8);  _hll[8].execute(V.r_Q_W_W, lo8, hi8)
    V.r_Q_W = _sel[3].execute(_hll[3].r_Out, _hll[8].r_Out, w)

    # Gas total: HLL_28(L) vs HLL_26(W) → SEL_17
    lo28, hi28 = _hll_lim(28); _hll[28].execute(V.r_Q_gas_T_L, lo28, hi28)
    lo26, hi26 = _hll_lim(26); _hll[26].execute(V.r_Q_gas_T_W, lo26, hi26)
    V.r_Q_gas_T = _sel[17].execute(_hll[28].r_Out, _hll[26].r_Out, w)

    # Gas atrapado: HLL_27(L) vs HLL_25(W) → SEL_16
    lo27, hi27 = _hll_lim(27); _hll[27].execute(V.r_Q_gat_L, lo27, hi27)
    lo25, hi25 = _hll_lim(25); _hll[25].execute(V.r_Q_gat_W, lo25, hi25)
    V.r_Q_gat = _sel[16].execute(_hll[27].r_Out, _hll[25].r_Out, w)


# ─────────────────────────────────────────────────────────────────────────────
#  F04F — Selector Wedge/Laminar (condiciones estándar)
# ─────────────────────────────────────────────────────────────────────────────
def f04f_selector_sc():
    """Migrado de F04F_CAU.LSF. Selecciona entre Wedge y Laminar en sc."""
    w = V.b_Wedge

    # Líquido sc: HLL_11(L) vs HLL_19(W) → SEL_06
    lo11, hi11 = _hll_lim(11); _hll[11].execute(V.r_Qb_Liquido_sc_L, lo11, hi11)
    lo19, hi19 = _hll_lim(19); _hll[19].execute(V.r_Qb_Liquido_sc_W, lo19, hi19)
    V.r_Qb_Liquido_sc = _sel[6].execute(_hll[11].r_Out, _hll[19].r_Out, w)

    # Agua sc: HLL_20(L) vs HLL_13(W) → SEL_07
    lo20, hi20 = _hll_lim(20); _hll[20].execute(V.r_Q_W_sc_L, lo20, hi20)
    lo13, hi13 = _hll_lim(13); _hll[13].execute(V.r_Q_W_sc_W, lo13, hi13)
    V.r_Q_W_sc = _sel[7].execute(_hll[20].r_Out, _hll[13].r_Out, w)

    # Gas total sc: HLL_17(L) vs HLL_18(W) → SEL_08
    lo17, hi17 = _hll_lim(17); _hll[17].execute(V.r_Q_gas_T_sc_L, lo17, hi17)
    lo18, hi18 = _hll_lim(18); _hll[18].execute(V.r_Q_gas_T_sc_W, lo18, hi18)
    V.r_Q_gas_T_sc = _sel[8].execute(_hll[17].r_Out, _hll[18].r_Out, w)

    # Crudo sc: HLL_15(L) vs HLL_16(W) → SEL_09
    lo15, hi15 = _hll_lim(15); _hll[15].execute(V.r_Q_Crudo_sc_L, lo15, hi15)
    lo16, hi16 = _hll_lim(16); _hll[16].execute(V.r_Q_Crudo_sc_W, lo16, hi16)
    V.r_Q_Crudo_sc = _sel[9].execute(_hll[15].r_Out, _hll[16].r_Out, w)

    # Gas atrapado sc: HLL_14(L) vs HLL_12(W) → SEL_10
    lo14, hi14 = _hll_lim(14); _hll[14].execute(V.r_Q_gat_sc_L, lo14, hi14)
    lo12, hi12 = _hll_lim(12); _hll[12].execute(V.r_Q_gat_sc_W, lo12, hi12)
    V.r_Q_gat_sc = _sel[10].execute(_hll[14].r_Out, _hll[12].r_Out, w)


# ─────────────────────────────────────────────────────────────────────────────
#  F04G — Volúmenes acumulados
# ─────────────────────────────────────────────────────────────────────────────
def f04g_volumen():
    """Migrado de F04G_CAU.LSF. Acumula volúmenes de prueba."""
    V.r_Q_Dil_linea = 0.0
    V.r_Q_Crudo_neto = 0.0

    pep = V.b_Prueba_en_Progreso
    cond = V.b_condicion_wedge or V.b_condicion_laminar
    t7 = V.ad_TIEMPO_prueba[7]

    # Rung 1: acumular volúmenes cuando hay condición válida
    if pep and cond:
        V.r_Vol_Liquido = V.r_Q_Liquido / 86400.0
        V.r_Vol_Liquido_Total += V.r_Vol_Liquido
        V.r_Vol_Crudo = V.r_Q_Crudo / 86400.0
        V.r_Vol_Crudo_Total += V.r_Vol_Crudo
        V.r_Vol_W = V.r_Q_W / 86400.0
        V.r_Vol_W_Total += V.r_Vol_W
        V.r_Vol_gat = V.r_Q_gat / 86400.0
        V.r_Vol_gat_Total += V.r_Vol_gat
        V.r_Vol_gas = V.r_Q_gas_T / 86400.0
        V.r_Vol_gas_Total += V.r_Vol_gas

    # Rung 2: sin condición → usar auxiliares previos
    if pep and not V.b_condicion_wedge and not V.b_condicion_laminar:
        V.r_Vol_Liquido_Total += V.r_VOL_LIQUIDO_AUX
        V.r_Vol_Crudo_Total   += V.r_VOL_CRUDO_AUX
        V.r_Vol_W_Total       += V.r_VOL_W_AUX
        V.r_Vol_gat_Total     += V.r_VOL_GAT_AUX
        V.r_Vol_gas_Total     += V.r_VOL_GAS_AUX

    # Rung 3: guardar auxiliares
    if pep and cond:
        V.r_VOL_LIQUIDO_AUX    = V.r_Vol_Liquido
        V.r_VOL_CRUDO_AUX      = V.r_Vol_Crudo
        V.r_VOL_W_AUX          = V.r_Vol_W
        V.r_VOL_GAT_AUX        = V.r_Vol_gat
        V.r_VOL_GAS_AUX        = V.r_Vol_gas
        V.r_VOL_CRUDO_NETO_AUX = V.r_Vol_Crudo_neto
        V.r_VOL_DIL_AUX        = V.r_Vol_Dil

    # Rung 4: limpiar auxiliares al terminar prueba (ONS)
    if not pep and not V.b_PULSO_2:
        V.r_VOL_LIQUIDO_AUX = V.r_VOL_CRUDO_AUX = 0.0
        V.r_VOL_W_AUX = V.r_VOL_GAT_AUX = V.r_VOL_GAS_AUX = 0.0
        V.r_VOL_CRUDO_NETO_AUX = V.r_VOL_DIL_AUX = 0.0
    V.b_PULSO_2 = not pep

    # Rung 5: reset totales fuera de prueba y parada
    if not pep and not V.b_Parada_en_Progreso:
        V.r_Vol_Liquido_Total = V.r_Vol_Crudo_Total = 0.0
        V.r_Vol_Crudo_Total_neto = V.r_Vol_W_Total = 0.0
        V.r_Vol_Dil_Total = V.r_Vol_gat_Total = V.r_Vol_gas_Total = 0.0

    # Rung 6: caudales estimados
    if pep and t7 > 0:
        V.r_Q_Crudo_Estimado    = V.r_Vol_Crudo_Total   / t7 * 86400.0
        V.r_Q_W_Estimado        = V.r_Vol_W_Total        / t7 * 86400.0
        V.r_Qb_Liquido_Estimado = V.r_Vol_Liquido_Total  / t7 * 86400.0
        V.r_Q_gat_Estimado      = V.r_Vol_gat_Total      / t7 * 86400.0
        V.r_Q_gas_Estimado      = V.r_Vol_gas_Total      / t7 * 86400.0

    # Rung 7: acumular volúmenes sc
    if pep and cond:
        V.r_Vol_Liquido_sc = V.r_Qb_Liquido_sc / 86400.0
        V.r_Vol_Liquido_Total_sc += V.r_Vol_Liquido_sc
        V.r_Vol_Crudo_sc = V.r_Q_Crudo_sc / 86400.0
        V.r_Vol_Crudo_Total_sc += V.r_Vol_Crudo_sc
        V.r_Vol_W_sc = V.r_Q_W_sc / 86400.0
        V.r_Vol_W_Total_sc += V.r_Vol_W_sc
        V.r_Vol_m_sc = V.r_Qb_Liquido_sc / 86400.0
        V.r_Vol_m_Total_sc += V.r_Vol_m_sc
        V.r_Vol_gat_sc = V.r_Q_gat_sc / 86400.0
        V.r_Vol_gat_Total_sc += V.r_Vol_gat_sc
        V.r_Vol_gas_sc = V.r_Q_gas_T_sc / 86400.0
        V.r_Vol_gas_Total_sc += V.r_Vol_gas_sc

    # Rung 8: guardar auxiliares sc
    if pep and cond:
        V.r_Vol_Liquido_sc_AUX = V.r_Vol_Liquido_sc
        V.r_Vol_Crudo_sc_AUX   = V.r_Vol_Crudo_sc
        V.r_Vol_W_sc_AUX       = V.r_Vol_W_sc
        V.r_Vol_m_sc_AUX       = V.r_Vol_m_sc
        V.r_Vol_gat_sc_AUX     = V.r_Vol_gat_sc
        V.r_Vol_gas_sc_AUX     = V.r_Vol_gas_sc

    # Rung 9: sin condición → usar auxiliares sc
    if pep and not V.b_condicion_laminar and not V.b_condicion_wedge:
        V.r_Vol_Liquido_Total_sc += V.r_Vol_Liquido_sc_AUX
        V.r_Vol_Crudo_Total_sc   += V.r_Vol_Crudo_sc_AUX
        V.r_Vol_W_Total_sc       += V.r_Vol_W_sc_AUX
        V.r_Vol_m_Total_sc       += V.r_Vol_m_sc_AUX
        V.r_Vol_gat_Total_sc     += V.r_Vol_gat_sc_AUX
        V.r_Vol_gas_Total_sc     += V.r_Vol_gas_sc_AUX

    # Rung 10-11: reset sc totales y auxiliares
    if not pep and not V.b_Parada_en_Progreso:
        V.r_Vol_Crudo_Total_sc = V.r_Vol_Liquido_Total_sc = 0.0
        V.r_Vol_Crudo_Total_neto_sc = V.r_Vol_W_Total_sc = 0.0
        V.r_Vol_m_Total_sc = V.r_Vol_Dil_Total_sc = 0.0
        V.r_Vol_gat_Total_sc = V.r_Vol_gas_Total_sc = 0.0
        V.r_Vol_Crudo_sc_AUX = V.r_Vol_Liquido_sc_AUX = 0.0
        V.r_Vol_W_sc_AUX = V.r_Vol_m_sc_AUX = 0.0
        V.r_Vol_gat_sc_AUX = V.r_Vol_gas_sc_AUX = 0.0

    # Rung 12: estimados sc
    if pep and t7 > 0:
        V.r_Q_Crudo_sc_Estimado    = V.r_Vol_Crudo_Total_sc  / t7 * 86400.0
        V.r_Q_W_sc_Estimado        = V.r_Vol_W_Total_sc       / t7 * 86400.0
        V.r_Qb_Liquido_sc_Estimado = V.r_Vol_Liquido_Total_sc / t7 * 86400.0
        V.r_Q_gat_sc_Estimado      = V.r_Vol_gat_Total_sc     / t7 * 86400.0
        V.r_Q_gas_sc_Estimado      = V.r_Vol_gas_Total_sc     / t7 * 86400.0

    # Rung nuevo (Oct 2023): sumatoria y gas x1000
    if pep:
        V.r_Q_Crudo_Sumatoria       = V.r_Q_Crudo_sc_Estimado + V.r_Q_W_sc_Estimado
        V.r_Q_gas_sc_Estimado_x_mil = V.r_Q_gas_sc_Estimado * 1000.0

    # Rung 13: GOR total
    if pep and V.r_Q_Crudo_Sumatoria != 0.0:
        V.r_GOR = V.r_Q_gas_sc_Estimado_x_mil / V.r_Q_Crudo_Sumatoria

    # Rung 14: GOR neto
    if pep and V.r_Q_Crudo_sc_Estimado != 0.0:
        neto_denom = V.r_Q_Crudo_sc_Estimado - V.r_caudal_dil_BM
        if neto_denom != 0.0:
            V.r_GOR_Neto = V.r_Q_gas_sc_Estimado_x_mil / neto_denom

    # Rung 15: WC en condiciones estándar
    if V.r_Bo != 0.0:
        denom15 = ((V.r_WC * V.r_CW_TP
                    + (100.0 - V.r_WC - V.r_GVoidF))
                   * (V.r_Coil / V.r_Bo))
        if denom15 != 0.0:
            V.r_WC_sc = (V.r_WC * V.r_CW_TP * 100.0 / denom15)

    # Rung 16-17: WC neto
    if pep and V.r_Vol_Crudo > 0.0:
        V.r_WC_neto = V.r_Vol_W / V.r_Vol_Liquido * 100.0
    if not pep:
        V.r_WC_neto = V.r_WC

    # Rung 18-19: volumen mezcla y GVF
    if pep:
        V.r_V_mezcla = (V.r_Q_gas_sc_Estimado_x_mil / 5.614
                        + V.r_Q_W_sc_Estimado
                        + V.r_Q_Crudo_sc_Estimado)
        if V.r_V_mezcla != 0.0:
            V.r_GVF = V.r_Q_gas_sc_Estimado_x_mil * 100.0 / 5.614 / V.r_V_mezcla


# ─────────────────────────────────────────────────────────────────────────────
#  F04H — Volumen de Diluente
# ─────────────────────────────────────────────────────────────────────────────
def f04h_volumen_diluente():
    """Migrado de F04H_CAU.LSF. Acumula caudal de diluente."""
    t7 = V.ad_TIEMPO_prueba[7]
    pep = V.b_Prueba_en_Progreso

    # Rung 0
    if pep and t7 > 0:
        V.r_Vol_Dil_Total = V.r_caudal_dil_BM / 86400.0
        V.r_Vol_dil_total_real += V.r_Vol_Dil_Total
        V.r_Qb_Dil_Estimado = V.r_Vol_dil_total_real / t7 * 86400.0
        V.r_Q_Crudo_Neto_Estimado = V.r_Q_Crudo_Estimado - V.r_Qb_Dil_Estimado
        V.r_Vol_Crudo_Total_neto = V.r_Vol_Crudo_Total - V.r_Vol_Dil_Total

    # Rung 1
    if pep:
        if t7 != 0:
            V.r_Qb_Dil_Estimado_sc = V.r_Vol_dil_total_real / t7 * 86400.0
        V.r_Q_Crudo_Neto_Estimado_sc = V.r_Q_Crudo_sc_Estimado - V.r_Qb_Dil_Estimado_sc
        V.r_Vol_Dil_Total_sc = V.r_Vol_dil_total_real
        V.r_Vol_Crudo_Total_neto_sc = V.r_Vol_Crudo_Total_sc - V.r_Vol_Dil_Total_sc

    # Rung 2: reset al terminar
    if not pep and not V.b_Parada_en_Progreso:
        V.r_Vol_dil_total_real = 0.0


# ─────────────────────────────────────────────────────────────────────────────
#  F04I — Proyección de Volúmenes
# ─────────────────────────────────────────────────────────────────────────────
def f04i_proyeccion():
    """Migrado de F04I_CAU.LSF. Proyecta volúmenes a tiempo objetivo."""
    t7 = V.ad_TIEMPO_prueba[7]
    if t7 == 0:
        return
    V.d_TIEMPO_prueba_proy_seg = V.i_TIEMPO_prueba_proy_H * 3600
    ts = float(V.d_TIEMPO_prueba_proy_seg)
    V.r_Vol_m_Total_Proy             = ts * V.r_Vol_m_Total              / t7
    V.r_Vol_m_Total_sc_Proy          = ts * V.r_Vol_m_Total_sc           / t7
    V.r_Vol_Crudo_Total_Proy         = ts * V.r_Vol_Crudo_Total          / t7
    V.r_Vol_Crudo_Total_sc_Proy      = ts * V.r_Vol_Crudo_Total_sc       / t7
    V.r_Vol_Crudo_Total_neto_Proy    = ts * V.r_Vol_Crudo_Total_neto     / t7
    V.r_Vol_Crudo_Total_neto_sc_Proy = ts * V.r_Vol_Crudo_Total_neto_sc  / t7
    V.r_Vol_Dil_Total_Proy           = ts * V.r_Vol_Dil_Total            / t7
    V.r_Vol_Dil_Total_sc_Proy        = ts * V.r_Vol_Dil_Total_sc         / t7
    V.r_Vol_W_Total_Proy             = ts * V.r_Vol_W_Total              / t7
    V.r_Vol_W_Total_sc_Proy          = ts * V.r_Vol_W_Total_sc           / t7
    V.r_Vol_gat_Total_Proy           = ts * V.r_Vol_gat_Total            / t7
    V.r_Vol_gat_Total_sc_Proy        = ts * V.r_Vol_gat_Total_sc         / t7
    V.r_Vol_gas_Total_sc_Proy        = ts * V.r_Vol_gas_Total_sc         / t7


# ─────────────────────────────────────────────────────────────────────────────
#  F04J — Promedios de condiciones de proceso
# ─────────────────────────────────────────────────────────────────────────────
def f04j_promedios():
    """Migrado de F04J_CAU.LSF. Promedios acumulados de P, T, viscosidad."""
    t7 = V.ad_TIEMPO_prueba[7]
    pep = V.b_Prueba_en_Progreso

    # Rung 0: acumular y promediar
    if pep and t7 > 0:
        V.r_P_Gas_total     += V.r_P_Gas
        V.r_P_Gas_promedio   = V.r_P_Gas_total  / t7
        V.r_T_Oil_C_Total   += V.r_T_Oil_C
        V.r_T_Oil_C_promedio = V.r_T_Oil_C_Total / t7
        V.r_miu_Oil_total   += V.r_miu_Oil
        V.r_miu_Oil_promedio = V.r_miu_Oil_total / t7

    # Rung 1: fuera de prueba → valor instantáneo
    if not pep:
        V.r_P_Gas_promedio   = V.r_P_Gas
        V.r_T_Gas_promedio   = V.r_T_Gas
        V.r_T_Oil_C_promedio = V.r_T_Oil_C
        V.r_miu_Oil_promedio = V.r_miu_Oil

    # Rung 2: reset acumuladores al terminar
    if not pep:
        V.r_WC_total = V.r_P_Gas_total = 0.0
        V.r_T_Oil_C_Total = V.r_miu_Oil_total = 0.0

    # Rung 3: gas temp (AFI deshabilitada)
    V.r_T_Gas_total = 0.0


# ═════════════════════════════════════════════════════════════════════════════
#  PROGRAMA PRINCIPAL p04_caudal
# ═════════════════════════════════════════════════════════════════════════════
def p04_caudal():
    """
    Programa principal de cálculos de caudal.
    Migrado de P04_CAUD.LSF.
    Se ejecuta cada 1 segundo (controlado por systim).
    """
    # A. Ejecución cada 1 segundo
    if V.i_systim_r1_ss_ant == V.i_systim_r1_ss:
        return

    # B. Solo si el programa está habilitado
    if not (V.b_P04_ejec_prog and not V.b_P04_ejec_prog_ant):
        return

    V.t_P04_duracion.reset()

    # C. Contenido del programa

    # Rung 0: relaciones delta para selección automática
    if V.b_BIT_PROTECTION:
        V.r_Relacion_Delta = safe_sqrt(V.r_DP_W)
        if V.r_miu_Oil != 0.0:
            V.r_Relacion_Delta_miu = V.r_Relacion_Delta / V.r_miu_Oil

    # Rung 1: relación delta para laminar
    if V.b_BIT_PROTECTION:
        if V.r_miu_Oil != 0.0:
            V.r_Relacion_Delta_miu_laminar = V.r_DP_L / V.r_miu_Oil

    # Rung 2: selector Automático/Manual Wedge-Laminar
    if not V.b_sw_AM_Laminar_Wedge_x:
        V.i_sw_AM_Laminar_Wedge = 8 if V.b_sw_AM_Laminar_Wedge_y else 4
    else:
        V.i_sw_AM_Laminar_Wedge = 2
    V.fb_sw_AM_Laminar_Wedge.execute(V.i_sw_AM_Laminar_Wedge)
    fb = V.fb_sw_AM_Laminar_Wedge

    cond_wedge_auto = (fb.b2_
                       and ((not V.b_SEL_LAMINAR
                             and V.r_Relacion_Delta_miu > 0.03
                             and V.r_RE_W > V.r_RE_W_M)
                            or (V.b_SEL_LAMINAR
                                and V.r_RE_L > V.r_RE_L_M)))
    if V.b_BIT_PROTECTION and (cond_wedge_auto or fb.b4_):
        V.b_Wedge = True
        V.b_Laminar = False
        V.i_Tipo_medidor = 2
        V.b_condicion_wedge = True
    else:
        V.b_condicion_wedge = False

    # Rung 3: relación laminar
    V.r_relacion_laminar = 0.03477 * V.r_v_oil_medida

    # Rung 4: desactivar laminar si ambas condiciones activas
    V.b_desactiva_laminar = (V.b_condicion_laminar and V.b_condicion_wedge)

    # Rung 5: selección laminar
    cond_lam_auto = (fb.b2_
                     and ((not V.b_SEL_LAMINAR
                           and V.r_Relacion_Delta_miu_laminar < V.r_relacion_laminar
                           and V.r_RE_L < V.r_RE_L_M)
                          or (V.b_SEL_LAMINAR
                              and V.r_RE_L < V.r_RE_L_M)))
    if V.b_BIT_PROTECTION and (cond_lam_auto or fb.b3_):
        if not V.b_desactiva_laminar:
            V.b_Laminar = True
            V.b_Wedge = False
            V.i_Tipo_medidor = 1
        V.b_condicion_laminar = True
    else:
        V.b_condicion_laminar = False

    # Rung 6: caudal diluente medido
    if V.b_SW_DIL_MEDIDO_CALC:
        V.r_caudal_dil_BM = V.r_Q_DIL_MEDIDO

    # Rungs 7-16: llamadas a subfunciones
    if V.b_BIT_PROTECTION:
        f04a_caudal_gas()
    if V.b_BIT_PROTECTION:
        f04b_caudal_laminar()
    if V.b_BIT_PROTECTION:
        f04c_caudal_wedge()
    if V.b_BIT_PROTECTION:
        f04d_condiciones_estandar()
    if V.b_BIT_PROTECTION:
        f04e_selector_linea()
    if V.b_BIT_PROTECTION:
        f04f_selector_sc()
    if V.b_BIT_PROTECTION:
        f04g_volumen()
    if V.b_BIT_PROTECTION:
        f04h_volumen_diluente()
    if V.b_BIT_PROTECTION:
        f04i_proyeccion()
    if V.b_BIT_PROTECTION:
        f04j_promedios()

    # D. Fin del programa
    V.i_P04_duracion_mSeg = V.t_P04_duracion.read()
