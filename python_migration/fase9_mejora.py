"""
═══════════════════════════════════════════════════════════════════════════════
  Orinoco SoftPLC — FASE 9: Mejoras y Cálculos IPR/PVT
  Migrado de: P10_MEJO.LSF
  Subfunciones: f_Comun, f_Data_1, f_Calc_1, f_Calc_2,
                f_Darcy, f_Vogel, f_Weller, f_PVT
═══════════════════════════════════════════════════════════════════════════════
  Estas subfunciones implementan los cálculos de Ingeniería de Yacimientos:
  - Darcy:  caudal laminar en medios porosos  Qo = (k·h·ΔP)/(141.2·μ·B)
  - Vogel:  IPR de yacimientos subsaturados   Qo/Qmax = 1 - 0.2(Pwf/Pr) - 0.8(Pwf/Pr)²
  - Weller: IPR compuesto (sobre y bajo Pb)
  - PVT:    propiedades PVT de correlación (Standing, Vasquez-Beggs, etc.)
═══════════════════════════════════════════════════════════════════════════════
"""

import math
import logging
from global_vars import V
from function_blocks import safe_pow, safe_sqrt, safe_log10

logger = logging.getLogger("orinoco.fase9.mejoras")


# ─────────────────────────────────────────────────────────────────────────────
#  f_Comun — Parámetros comunes del yacimiento
# ─────────────────────────────────────────────────────────────────────────────
def f_Comun():
    """Parámetros comunes: presión de burbuja, gradientes, propiedades roca."""
    # Presión de burbuja (si no se usa correlación de laboratorio)
    if not V.b_PB_PVT and V.r_API_2 > 0.0 and V.r_yg > 0.0:
        # Correlación de Standing para Pb
        yg_t = 0.00091 * V.r_T_Yac_F - 0.0125 * V.r_API_2
        if V.r_Rso_PT > 0.0:
            V.r_Pb = 18.0 * safe_pow(10.0, yg_t) * safe_pow(
                V.r_Rso_PT / V.r_yg, 1.0 / 1.204)

    # Gradiente de presión del crudo a condiciones del yacimiento
    if V.r_Bo > 0.0:
        V.r_grad_Oil = V.r_d_Oil_PT * 0.433  # psi/ft


# ─────────────────────────────────────────────────────────────────────────────
#  f_Data_1 — Datos de entrada del yacimiento
# ─────────────────────────────────────────────────────────────────────────────
def f_Data_1():
    """Consolida los datos de entrada del yacimiento para los cálculos IPR."""
    # Radio de daño y skin
    V.r_re_rw = (getattr(V, 'r_re', 1000.0)
                 / getattr(V, 'r_rw', 0.365)) if getattr(V, 'r_rw', 0.0) > 0.0 else 0.0
    V.r_ln_re_rw = math.log(V.r_re_rw) if V.r_re_rw > 0.0 else 0.0


# ─────────────────────────────────────────────────────────────────────────────
#  f_Calc_1 — Caudal máximo Darcy
# ─────────────────────────────────────────────────────────────────────────────
def f_Calc_1():
    """Cálculo del Jindex y Qmax por método Darcy."""
    k   = getattr(V, 'r_k_yac',    10.0)   # permeabilidad, md
    h   = getattr(V, 'r_h_yac',    20.0)   # espesor neto, ft
    miu = V.r_miu_Oil if V.r_miu_Oil > 0.0 else 1.0
    Bo  = V.r_Bo      if V.r_Bo      > 0.0 else 1.0
    S   = getattr(V, 'r_skin',      0.0)
    PR  = getattr(V, 'r_PR_yac',    1000.0)
    Pwf = getattr(V, 'r_Pwf',       0.0)

    ln_re_rw = V.r_ln_re_rw if V.r_ln_re_rw > 0.0 else math.log(2730.0)
    denom = 141.2 * miu * Bo * (ln_re_rw - 0.75 + S)
    if denom > 0.0:
        V.r_J_Darcy = k * h / denom
        V.r_Q_Darcy = V.r_J_Darcy * (PR - Pwf)


# ─────────────────────────────────────────────────────────────────────────────
#  f_Calc_2 — Caudal estimado con reducción por daño
# ─────────────────────────────────────────────────────────────────────────────
def f_Calc_2():
    """Cálculo del caudal efectivo considerando skin."""
    S = getattr(V, 'r_skin', 0.0)
    if S > 0.0 and V.r_ln_re_rw > 0.0:
        eficiencia = (V.r_ln_re_rw - 0.75) / (V.r_ln_re_rw - 0.75 + S)
        V.r_Q_efectivo = getattr(V, 'r_Q_Darcy', 0.0) * eficiencia
    else:
        V.r_Q_efectivo = getattr(V, 'r_Q_Darcy', 0.0)


# ─────────────────────────────────────────────────────────────────────────────
#  f_Darcy — IPR Darcy completa
# ─────────────────────────────────────────────────────────────────────────────
def f_Darcy():
    """IPR lineal de Darcy para yacimientos sobre la presión de burbuja."""
    f_Calc_1()
    f_Calc_2()
    PR  = getattr(V, 'r_PR_yac', 1000.0)
    J   = getattr(V, 'r_J_Darcy', 0.0)
    V.r_Qmax_Darcy = J * PR  # Pwf = 0


# ─────────────────────────────────────────────────────────────────────────────
#  f_Vogel — IPR Vogel (yacimiento bajo presión de burbuja)
# ─────────────────────────────────────────────────────────────────────────────
def f_Vogel():
    """
    IPR de Vogel: Qo/Qmax = 1 - 0.2(Pwf/Pr) - 0.8(Pwf/Pr)²
    Qmax = Qo_actual / (1 - 0.2(Pwf/Pr) - 0.8(Pwf/Pr)²)
    """
    PR  = getattr(V, 'r_PR_yac', 1000.0)
    Pwf = getattr(V, 'r_Pwf', 0.0)
    Qo  = getattr(V, 'r_Q_Crudo_sc_Estimado', 0.0)
    if PR > 0.0:
        ratio = Pwf / PR
        vogel_factor = 1.0 - 0.2 * ratio - 0.8 * ratio * ratio
        vogel_factor = max(vogel_factor, 1e-6)
        V.r_Qmax_Vogel = Qo / vogel_factor if Qo > 0.0 else 0.0
        V.r_AOF_Vogel  = V.r_Qmax_Vogel  # Absolute Open Flow


# ─────────────────────────────────────────────────────────────────────────────
#  f_Weller — IPR compuesta (Darcy sobre Pb + Vogel bajo Pb)
# ─────────────────────────────────────────────────────────────────────────────
def f_Weller():
    """
    Método de Weller para IPR compuesta.
    Sobre Pb: comportamiento lineal (Darcy).
    Bajo Pb:  comportamiento cuadrático (Vogel).
    """
    PR  = getattr(V, 'r_PR_yac', 1000.0)
    Pb  = getattr(V, 'r_Pb',     0.0)
    J   = getattr(V, 'r_J_Darcy', 0.0)
    if PR > 0.0 and Pb > 0.0 and Pb < PR:
        Qb = J * (PR - Pb)          # caudal a Pwf = Pb
        Qmax_Vogel_b = Qb / 1.8 * (1.0 + 0.2 + 0.8)  # fracción Vogel debajo de Pb
        V.r_Qmax_Weller = Qb + Qmax_Vogel_b
    else:
        V.r_Qmax_Weller = getattr(V, 'r_Qmax_Darcy', 0.0)


# ─────────────────────────────────────────────────────────────────────────────
#  f_PVT — Correlaciones PVT adicionales (Vasquez-Beggs, Beal, etc.)
# ─────────────────────────────────────────────────────────────────────────────
def f_PVT():
    """
    Correlaciones PVT complementarias.
    En ISaGRAF estas venían de tablas de laboratorio o correlaciones.
    En Python: se usan correlaciones de Standing / Vasquez-Beggs.
    """
    # Viscosidad muerta del crudo (Beal / Standing)
    T_F = V.r_T_Oil_C * 9.0 / 5.0 + 32.0   # °C → °F
    if V.r_API_2 > 0.0 and T_F > 0.0:
        x    = safe_pow(10.0, (3.0324 - 0.02023 * V.r_API_2)) * safe_pow(T_F, -1.163)
        V.r_miu_muerta = safe_pow(10.0, x) - 1.0

    # Viscosidad saturada (Chew-Connally)
    if getattr(V, 'r_Rso_PT', 0.0) > 0.0 and getattr(V, 'r_miu_muerta', 0.0) > 0.0:
        a = 10.715 * safe_pow(V.r_Rso_PT + 100.0, -0.515)
        b = 5.440  * safe_pow(V.r_Rso_PT + 150.0, -0.338)
        V.r_miu_Oil = a * safe_pow(V.r_miu_muerta, b)


# ═════════════════════════════════════════════════════════════════════════════
#  PROGRAMA PRINCIPAL p10_mejoras
# ═════════════════════════════════════════════════════════════════════════════
def p10_mejoras():
    """Migrado de P10_MEJO.LSF. Orquesta los cálculos de yacimiento."""
    if not (V.b_P10_ejec_prog and not V.b_P10_ejec_prog_ant):
        return

    V.t_P10_duracion.reset()

    f_Comun()
    f_Data_1()
    f_Calc_1()
    f_Calc_2()
    f_Darcy()
    f_Vogel()
    f_Weller()
    f_PVT()

    V.i_P10_duracion_mSeg = V.t_P10_duracion.read()
