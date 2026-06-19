"""
═══════════════════════════════════════════════════════════════════════════════
  Orinoco SoftPLC — FASE 3a: Cálculos de Densidad
  Migrado de: P03_DENS.LSF, F03A_DEN.LSF, F03B_DEN.LSF, F03C_DEN.LSF,
              F03D_DEN.LSF, F03E_DEN.LSF
═══════════════════════════════════════════════════════════════════════════════
  Sub-rutinas:
    f03a → Densidad del Gas (Standing-Katz Z-factor)
    f03b → Densidad del Crudo (ASTM D1250 / API MPMS Ch.11)
    f03c → Densidad del Agua (correlación API)
    f03d → Densidad de la Mezcla multifásica + viscosidad mezcla
    f03e → Densidad del Diluente
═══════════════════════════════════════════════════════════════════════════════
"""

import math
import logging

from global_vars import V
from function_blocks import safe_pow, safe_log10

logger = logging.getLogger("orinoco.fase3.densidad")


# ─────────────────────────────────────────────────────────────────────────────
#  f03a — Densidad del Gas
# ─────────────────────────────────────────────────────────────────────────────

def f03a_densidad_gas():
    """
    Migrado de F03A_DEN.LSF.
    Calcula Z-factor (Standing-Katz polinomial), densidad del gas a P,T
    y peso específico del gas en agua.
    """
    # Rung 0: Z-factor polinomial
    if V.r_Pc_Gas != 0.0:
        pr = (V.r_P_Gas + V.r_PA) / V.r_Pc_Gas
        V.r_Z_Gas_P = (V.r_A_ds * safe_pow(pr, 4.0)
                        + V.r_B_ds * safe_pow(pr, 3.0)
                        + V.r_C_ds * safe_pow(pr, 2.0)
                        + V.r_D_ds * pr
                        + V.r_E_ds)

    # Rung 1: Factor de expansión Ee_PT
    denom1 = (V.r_T_Gas + 273.0) * V.r_Z_Gas_P
    if denom1 != 0.0:
        V.r_Ee_PT = 19.6523 * (V.r_P_Gas + V.r_PA) / denom1

    # Rung 2: Densidad del gas a T,P (g/cm³)
    denom2 = V.r_Z_Gas_P * V.r_R_gas * (V.r_T_Gas + 273.2)
    if denom2 != 0.0:
        V.r_d_Gas_TP = (V.r_P_Gas + V.r_PA) * 6.897 / denom2

    # Rung 3: Peso específico del gas en agua
    V.r_d_Gas_W = 1.223 * V.r_Ee_PT * V.r_SG_Gas


# ─────────────────────────────────────────────────────────────────────────────
#  f03b — Densidad del Crudo
# ─────────────────────────────────────────────────────────────────────────────

def f03b_densidad_crudo():
    """
    Migrado de F03B_DEN.LSF.
    Calcula densidad del crudo a P,T usando ASTM D1250 / API MPMS Ch.11.
    Incluye viscosidad cinemática (Walther-ASTM) y viscosidad dinámica.
    """
    # Rung 0: Coeficiente térmico del crudo
    d_ref_1000 = V.r_d_Oil_ref * 1000.0
    if d_ref_1000 != 0.0:
        V.r_coef_Oil = 341.0957 * safe_pow(d_ref_1000, -2.0)

    # Rung 1: Temperatura del agua = temp crudo, conversión °C→°F
    V.r_T_W_C = V.r_T_Oil_C
    V.r_T_Oil_F = V.r_T_W_C * 9.0 / 5.0 + 32.0

    # Rung 2: Temperatura de yacimiento °C→°F
    V.r_T_Yac_F = V.r_T_Yac_C * 9.0 / 5.0 + 32.0

    # Rung 3: Densidad de referencia del crudo
    V.r_d_Oil_ref = V.r_S_Oil_ref * 0.9990121

    # Rung 4: Factor de compresibilidad ZL del crudo a T
    V.r_ZL_Oil_T = (safe_pow(10.0, -5.0)
                     * safe_pow(2.7182817,
                                (-1.9947
                                 + 0.00013427 * V.r_T_Oil_F
                                 + 0.79549 * safe_pow(V.r_S_Oil_ref, -2.0)
                                 + 0.0023306 * V.r_T_Oil_F * safe_pow(V.r_S_Oil_ref, -2.0))))

    # Rung 5: Gravedad específica del crudo a P,T
    zl_factor = 1.0 - (V.r_ZL_Oil_T * (V.r_P_Gas + V.r_PA))
    if zl_factor != 0.0:
        thermal = safe_pow(2.718282,
                           (-V.r_coef_Oil * (V.r_T_Oil_F - 60.0)
                            * (1.0 + 0.8 * V.r_coef_Oil * (V.r_T_Oil_F - 60.0))))
        V.r_S_Oil_PT = (1.0 / zl_factor) * V.r_S_Oil_ref * thermal

    # Rung 6: Densidad del crudo a P,T
    V.r_d_Oil_PT = V.r_S_Oil_PT * 0.9990121

    # Rung 7: Factor de corrección volumétrico Coil
    if zl_factor != 0.0:
        thermal = safe_pow(2.718282,
                           (-V.r_coef_Oil * (V.r_T_Oil_F - 60.0)
                            * (1.0 + 0.8 * V.r_coef_Oil * (V.r_T_Oil_F - 60.0))))
        V.r_Coil = (1.0 / zl_factor) * thermal

    # Rung 8: Corte de crudo (Oil Cut)
    V.r_OC = 100.0 - V.r_WC - V.r_GVoidF

    # Rung 9-10: Constantes de Walther-ASTM para viscosidad cinemática
    log_t1 = safe_log10(V.r_t1 + 273.2)
    log_t2 = safe_log10(V.r_t2 + 273.2)
    if (log_t1 - log_t2) != 0.0:
        v1_term = safe_log10(safe_log10(V.r_v1 + 0.7)) if (V.r_v1 + 0.7) > 1.0 else 0.0
        v2_term = safe_log10(safe_log10(V.r_v2 + 0.7)) if (V.r_v2 + 0.7) > 1.0 else 0.0
        V.r_A_v = v1_term + log_t1 * (v2_term - v1_term) / (log_t1 - log_t2)
        V.r_B_v = (v2_term - v1_term) / (log_t1 - log_t2)

    # Rung 11: Viscosidad cinemática calculada
    exp_term = V.r_A_v - V.r_B_v * safe_log10(V.r_T_W_C + 273.2)
    inner = safe_pow(10.0, exp_term)
    V.r_v_oil_calc = safe_pow(10.0, inner) - 0.7

    # Rung 15-16: Viscosidad dinámica (selección: calculada vs medida)
    if V.b_IHM_PB_miu:
        V.r_miu_Oil = V.r_v_oil_calc * V.r_d_m_PT
    else:
        V.r_miu_Oil = V.r_v_oil_medida * V.r_d_m_PT


# ─────────────────────────────────────────────────────────────────────────────
#  f03c — Densidad del Agua
# ─────────────────────────────────────────────────────────────────────────────

def f03c_densidad_agua():
    """
    Migrado de F03C_DEN.LSF.
    Calcula densidad del agua a T,P (API MPMS) y densidad del líquido.
    """
    # Rung 0: Temperatura agua en °F
    V.r_T_W_F = 9.0 * V.r_T_W_C / 5.0 + 32.0

    # Rung 1: Factor de corrección volumétrica del agua CW(T,P)
    dt = V.r_T_W_F - 60.0
    V.r_CW_TP = ((1.0
                   - 8.7517e-5 * dt
                   - 1.7927e-6 * safe_pow(dt, 2.0)
                   + 7.959e-9 * safe_pow(dt, 3.0)
                   - 5.8549e-11 * safe_pow(dt, 4.0)
                   + 3.492e-13 * safe_pow(dt, 5.0))
                  * (1.0 + 3.059e-6 * V.r_P_Gas))

    # Rung 2: Densidad del agua a T,P
    V.r_d_W_TP = V.r_CW_TP * V.r_d_W_ref

    # Rung 3: Densidad del líquido (mezcla agua + crudo, sin gas)
    V.r_d_Lg_TP = (V.r_WC / 100.0 * V.r_d_W_TP
                    + (1.0 - V.r_WC / 100.0) * V.r_d_Oil_PT)


# ─────────────────────────────────────────────────────────────────────────────
#  f03d — Densidad de la Mezcla
# ─────────────────────────────────────────────────────────────────────────────

def f03d_densidad_mezcla():
    """
    Migrado de F03D_DEN.LSF.
    Calcula densidad de la mezcla multifásica (crudo+agua+gas),
    viscosidad del agua y viscosidad de la mezcla (PTOI).
    """
    # Rung 1: Densidad mezcla multifásica
    V.r_d_m_PT = ((100.0 - V.r_WC) / 100.0 * V.r_d_Oil_PT
                   + V.r_WC / 100.0 * V.r_d_W_TP
                   + V.r_GVoidF / 100.0 * (V.r_d_Gas_TP / 1000.0))

    # Rung 2
    V.r_d_m_PT_2 = V.r_d_m_PT * V.r_d_m_PT

    # Rung 3-4: Viscosidad del agua
    if not V.b_externa:
        V.r_miu_W = (4.33
                      - 0.07 * V.r_T_Oil_F
                      + 4.73e-4 * safe_pow(V.r_T_Oil_F, 2.0)
                      - 1.415e-6 * safe_pow(V.r_T_Oil_F, 3.0)
                      + 1.56e-9 * safe_pow(V.r_T_Oil_F, 4.0))
    else:
        if V.r_T_W_C > 0.0:
            V.r_miu_W = 0.0168 * V.r_d_W_TP * 1000.0 * safe_pow(V.r_T_W_C, -0.88)

    # Rung 5: Factor K3 PTOI
    if V.r_miu_W != 0.0:
        V.r_K3_PTOI = (V.r_K1_PTOI * V.r_miu_Oil / V.r_miu_W
                        * safe_pow(2.718282, V.r_K2_PTOI * V.r_PTOI_ds))

    # Rung 6-7: Viscosidad de la mezcla (modelo PTOI)
    if V.r_WC <= V.r_PTOI_ds:
        V.r_miu_Mezcla = (V.r_miu_Oil * V.r_K1_PTOI
                           * safe_pow(2.718282, V.r_K2_PTOI * V.r_WC))
    else:
        V.r_miu_Mezcla = (V.r_miu_W * V.r_K3_PTOI
                           * safe_pow(2.718282, V.r_K4_PTOI * (V.r_PTOI_ds - V.r_WC)))


# ─────────────────────────────────────────────────────────────────────────────
#  f03e — Densidad del Diluente
# ─────────────────────────────────────────────────────────────────────────────

def f03e_densidad_diluente():
    """
    Migrado de F03E_DEN.LSF.
    Calcula densidad del diluente a partir del API y corrección térmica.
    """
    # Rung 0: Gravedad específica del diluente
    if (V.r_API_1 + 131.5) != 0.0:
        V.r_S_D_ref = 141.5 / (V.r_API_1 + 131.5)

    # Rung 1: Densidad de referencia del diluente
    V.r_d_D_ref = V.r_S_D_ref * V.r_d_W_ref

    # Rung 2: Coeficiente térmico del diluente
    d_dil_1000 = 1000.0 * V.r_d_D_ref
    d_dil_sq = safe_pow(d_dil_1000, 2.0)
    if d_dil_sq != 0.0:
        V.r_coef_Dil = (192.4571 + 0.2438 * d_dil_1000) / d_dil_sq

    # Rung 3: Temperatura del diluente °C→°F
    V.r_T_Dil_F = 9.0 * V.r_T_Dil_C / 5.0 + 32.0

    # Rung 4: Factor de corrección térmica del diluente
    V.r_C_Dil_T = safe_pow(2.718282,
                            (-V.r_coef_Dil * (V.r_T_Dil_F - 60.0)
                             * (1.0 + 0.8 * V.r_coef_Dil * (V.r_T_Dil_F - 60.0))))

    # Rung 5: Factor de corrección térmica del diluente a temp de crudo
    V.r_C_Dil_T2 = safe_pow(2.718282,
                             (-V.r_coef_Dil * (V.r_T_Oil_F - 60.0)
                              * (1.0 + 0.8 * V.r_coef_Dil * (V.r_T_Oil_F - 60.0))))


# ═════════════════════════════════════════════════════════════════════════════
#  PROGRAMA PRINCIPAL p03_densidad
# ═════════════════════════════════════════════════════════════════════════════

def p03_densidad():
    """
    Programa principal de cálculos de densidad.
    Migrado de P03_DENS.LSF.
    Se ejecuta cada 1 segundo (controlado por systim).
    """
    # A. Ejecución cada 1 segundo
    if V.i_systim_r1_ss_ant == V.i_systim_r1_ss:
        return

    # B. Solo si el programa está habilitado
    if not (V.b_P03_ejec_prog and not V.b_P03_ejec_prog_ant):
        return

    V.t_P03_duracion.reset()

    # C. Contenido — solo si protección activa
    if V.b_BIT_PROTECTION:
        f03a_densidad_gas()

    if V.b_BIT_PROTECTION:
        f03b_densidad_crudo()

    if V.b_BIT_PROTECTION:
        f03c_densidad_agua()

    if V.b_BIT_PROTECTION:
        f03d_densidad_mezcla()

    if V.b_BIT_PROTECTION:
        f03e_densidad_diluente()

    # D. Fin del programa
    V.i_P03_duracion_mSeg = V.t_P03_duracion.read()
