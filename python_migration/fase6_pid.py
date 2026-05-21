"""
═══════════════════════════════════════════════════════════════════════════════
  Orinoco SoftPLC — FASE 6: Control PID
  Migrado de: P07_PID_.LSF
  Ejecutar cada 1 segundo (requerido por FB_PIDE).
═══════════════════════════════════════════════════════════════════════════════
"""

import logging
from global_vars import V

logger = logging.getLogger("orinoco.fase6.pid")


def p07_pid():
    """Migrado de P07_PID_.LSF. PID de nivel (LCV) y presión/gas (PCV)."""
    if not (V.b_P07_ejec_prog and not V.b_P07_ejec_prog_ant):
        return

    V.t_P07_duracion.reset()

    # Selector PV: LIT_001 vs DP_Simeflum según switch de posición
    V.fb_SEL_03_pid.execute(V.r_LIT_001, V.r_DP_Simeflum, V.b_PID_POSIC_SW)
    pv_nivel = V.fb_SEL_03_pid.r_Out

    # PV del PID de gas: nivel o presión según b_Control_PID_Gas
    V.r_PRESS_PID_PV = pv_nivel if V.b_Control_PID_Gas else V.r_P_Gas

    # Acción de control PID gas (inversa cuando es de presión)
    V.b_PRESS_PID_CA = not V.b_Control_PID_Gas

    # PID Nivel → válvula de líquido (LCV-03)
    V.fb_BNOT_05.execute(V.b_MAN_LC)
    V.fb_LEVEL_PID.execute(
        r_PV              = pv_nivel,
        b_ControlAction   = True,
        b_ProgOverrideReq = V.b_DESHABILITA_PID,
        b_OperAutoReq     = V.fb_BNOT_05.b_Out,
        b_OperManualReq   = V.b_MAN_LC,
        r_SP              = V.r_LEVEL_PID_SP,
        r_CVOverride      = V.r_LEVEL_PID_03_CVOverride,
        r_CVOper          = V.r_LEVEL_PID_03_CVOper,
        r_KP              = V.r_LEVEL_PID_03_KP,
        r_KI              = V.r_LEVEL_PID_03_KI,
        r_KD              = V.r_LEVEL_PID_03_KD,
        t_TS_seconds      = V.t_LEVEL_PID_03_TS,
        r_FI_in           = V.r_LEVEL_PID_03_Factor_I,
    )
    V.r_LEVEL_PID_03_Factor_I = V.fb_LEVEL_PID.r_FI_out
    V.fb_SCL_LCV_03.execute(
        V.fb_LEVEL_PID.r_CVEU,
        V.r_SCL_LCV_03_InRawMin, V.r_SCL_LCV_03_InRawMax,
        V.r_SCL_LCV_03_InEUMin,  V.r_SCL_LCV_03_InEUMax,
    )
    V.r_Local_2_O_Ch0Data = V.fb_SCL_LCV_03.r_Out

    # PID Presión → válvula de gas (PCV-03)
    V.fb_BNOT_06.execute(V.b_MAN_PC)
    V.fb_PRESS_PID.execute(
        r_PV              = V.r_PRESS_PID_PV,
        b_ControlAction   = V.b_PRESS_PID_CA,
        b_ProgOverrideReq = V.b_DESHABILITA_PID,
        b_OperAutoReq     = V.fb_BNOT_06.b_Out,
        b_OperManualReq   = V.b_MAN_PC,
        r_SP              = V.r_PRESS_PID_SP,
        r_CVOverride      = V.r_PRESS_PID_03_CVOverride,
        r_CVOper          = V.r_PRESS_PID_03_CVOper,
        r_KP              = V.r_PRESS_PID_03_KP,
        r_KI              = V.r_PRESS_PID_03_KI,
        r_KD              = V.r_PRESS_PID_03_KD,
        t_TS_seconds      = V.t_PRESS_PID_03_TS,
        r_FI_in           = V.r_PRESS_PID_03_Factor_I,
    )
    V.r_PRESS_PID_03_Factor_I = V.fb_PRESS_PID.r_FI_out
    V.fb_SCL_PCV_03.execute(
        V.fb_PRESS_PID.r_CVEU,
        V.r_SCL_PCV_03_InRawMin, V.r_SCL_PCV_03_InRawMax,
        V.r_SCL_PCV_03_InEUMin,  V.r_SCL_PCV_03_InEUMax,
    )
    V.r_Local_2_O_Ch1Data = V.fb_SCL_PCV_03.r_Out

    # Espejo de salidas CV para display
    V.fb_LEVEL_PID_r_CVEU = V.fb_LEVEL_PID.r_CVEU
    V.fb_PRESS_PID_r_CVEU = V.fb_PRESS_PID.r_CVEU

    # Actualizar CVOper cuando está en modo automático
    if not V.b_MAN_LC:
        V.r_LEVEL_PID_03_CVOper = V.fb_LEVEL_PID_r_CVEU
    if not V.b_MAN_PC:
        V.r_PRESS_PID_03_CVOper = V.fb_PRESS_PID_r_CVEU

    V.i_P07_duracion_mSeg = V.t_P07_duracion.read()
