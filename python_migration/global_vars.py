"""
Orinoco SoftPLC — Variables Globales
Migrado de: appli.H (4,647 líneas de definiciones)

Estructura: Diccionario centralizado con prefijos de tipo ISaGRAF:
  b_  → Booleanas       i_  → Enteros
  r_  → Reales (float)  s_  → Strings
  d_  → Double/Long     ar_ → Arrays de reales
  ai_ → Arrays de ints  as_ → Arrays de strings
"""

import math
from datetime import datetime
from plc_timers import TON, TOF, ScanTimer, CycleTimer
from function_blocks import (
    FB_SCL, FB_HLL, FB_ALARM, FB_PIDE, FB_BNOT, FB_SEL, FB_SW_AM
)


class GlobalVars:
    """Contenedor centralizado de todas las variables del SoftPLC."""

    def __init__(self):
        # ═══════════════════════════════════════════════════════════════
        #  BOOLEANAS — Estados, switches, flags
        # ═══════════════════════════════════════════════════════════════
        self.b_primer_scan = True
        self.instrument_overrides = {}
        self.b_aaaaa = False
        self.b_fijar_valores_defecto = False
        self.b_fijar_valores_defecto_ton = False
        self.b_fijar_valores_defecto_usuario = False

        # Habilitadores de módulos
        self.b_habilitar_MBus_Son = False
        self.b_habilitar_MBus_Vis = False
        self.b_habilitar_F_HART = True
        self.b_habilitar_Str_ModB = False
        self.b_habilitar_Loggers = False
        self.b_habilitar_Loggers_ant = False
        self.b_habilitar_Loggers_Individual = True
        self.b_inhabilitar_Loggers_Individual = False

        # Habilitadores de loggers individuales
        self.b_habilitar_L_Config = False
        self.b_habilitar_L_Evento = False
        self.b_habilitar_L_Alarma = False
        self.b_habilitar_L_Data_G = False
        self.b_habilitar_L_Data_C = False
        self.b_habilitar_L_Prueba = False
        self.b_habilitar_L_ResPba = False

        # Status de reinicio
        self.b_logger_status_reinicia = False
        self.b_pba_pozo_status_reinicia = False
        self.b_list_combo_box_status_reinicia = False

        # Control PID
        self.b_DESHABILITA_PID = False
        self.b_MAN_LC = False
        self.b_MAN_PC = False
        self.b_Control_PID_Gas = False
        self.b_PID_POSIC_SW = False
        self.b_PB_DESHABILITA_PID = False
        self.b_PB_HABILITA_PID = False
        self.b_PB_DESHABILITA_PID_FS = False

        # Protección / Licencia
        self.b_BIT_PROTECTION = False
        self.b_BIT_PROTECTION_1 = False

        # Estado de comunicación DAQ (Modbus RTU)
        self.b_Error_DAQ = False   # True si la tarjeta DAQ no responde

        # Switches de proceso
        self.b_Sw_Wedge_Gas = False
        self.b_Sw_Wedge_Gas_2 = False
        self.b_SW_DIL_MEDIDO_CALC = False
        self.b_sw_AM_Laminar_Wedge_x = False
        self.b_sw_AM_Laminar_Wedge_y = False
        self.b_SEL_LAMINAR = False
        self.b_SEL_T_baja = False
        self.b_sel_tipo_instrum_dil = False
        self.b_Wedge = False
        self.b_Laminar = False
        self.b_condicion_wedge = False
        self.b_condicion_laminar = False
        self.b_desactiva_laminar = False
        self.b_GVF_EN = False
        self.b_IHM_PB_miu = False

        # Válvulas
        self.b_VLV_01 = False
        self.b_VLV_02 = False
        self.b_VLV_03 = False
        self.b_ON_VLV_GAS_01 = False
        self.b_SEL_VLV_GAS_01 = False
        self.b_AUTO_GAS_01 = False
        self.b_AUX_RELE = False
        self.b_AUX_CUNA_ALTA = False
        self.b_AUX_CUNA_BAJA = False

        # Salidas digitales
        self.b_Local_1_O_Data_0 = False
        self.b_Local_1_O_Data_1 = False
        self.b_Local_1_O_Data_2 = False
        self.b_Local_1_O_Data_3 = False
        self.b_Local_1_O_Data_4 = False
        self.b_Local_1_O_Data_5 = False

        # Simulación
        self.b_simular_ai = False

        # Pruebas de pozo
        self.b_PRUEBA_EN_PROGRESO = False
        self.b_PB_INICIO_PRUEBA = False
        self.b_PB_PARADA_PRUEBA = False
        self.b_IHM_VALIDAR_PRUEBA = False
        self.b_IHM_ABORTAR_PRUEBA = False
        self.b_PARADA_EN_PROGRESO = False
        self.b_TIMER_Parada_de_Prueba = False
        self.b_TIMER_Parada_de_Prueba_ant = False

        # PLC control
        self.b_PLC_reiniciar_ton = False
        self.b_PLC_reiniciar_usuario = False
        self.b_Borra_todos_Reg_ton = False
        self.b_Borra_todos_Reg_usuario = False
        self.b_Borra_todos_Registros = False
        self.b_reset_tiempo_ejec_prog = False
        self.b_T_ON_INICIO = False
        self.b_AUX_T_ON_INICIO = False
        self.b_T_ON_RELE = False
        self.b_coldboot = False
        self.b_warmboot = False
        self.b_i_reset = False
        self.b_PRESS_PID_CA = False

        # Evaluación de tiempo de respuesta
        self.b_evaluar_tiempo_resp_habilitar = False
        self.b_evaluar_tiempo_resp_1 = False
        self.b_evaluar_tiempo_resp_2 = False

        # Ejecución de programas (ciclos)
        for i in range(1, 11):
            setattr(self, f'b_P{i:02d}_ejec_prog', True)
            setattr(self, f'b_P{i:02d}_ejec_prog_ant', False)

        # HART
        self.b_HART_1_HAB_COMUNIC = False
        self.b_HART_2_HAB_COMUNIC = False
        self.b_HART_RESET = False

        # Botones
        for i in range(1, 7):
            setattr(self, f'b_boton_F{i}', False)

        # Estado del controlador
        self.b_controlador_estado_error = False
        self.b_estado_bateria_1 = True
        self.b_estado_bateria_2 = True

        # ═══════════════════════════════════════════════════════════════
        #  ENTEROS
        # ═══════════════════════════════════════════════════════════════
        self.i_aaaaa = 0
        self.i_sw_AM_Laminar_Wedge = 2
        self.i_Tipo_medidor = 0
        self.i_PLC_scan_mSeg = 0
        self.i_PLC_mode_actual = 0
        self.i_PLC_mode_usuario = 0
        self.i_PLC_reiniciar_seg = 0
        self.i_fijar_valores_defecto_seg = 0
        self.i_HART_Disp_n = 0                 # Número de dispositivos HART configurados
        self.i_combo_box_1_lineas = 0          # Cantidad de líneas en archivo combo box 1
        self.i_combo_box_2_lineas = 0          # Cantidad de líneas en archivo combo box 2

        # Fecha/Hora del sistema
        self.i_sysdat_r1_yy = 0
        self.i_sysdat_r1_mm = 0
        self.i_sysdat_r1_dd = 0
        self.i_systim_r1_hh = 0
        self.i_systim_r1_mm = 0
        self.i_systim_r1_ss = 0
        self.i_systim_r1_ss_ant = -1
        self.i_systim_r1_mm_ant = -1

        # Duración de programas
        for p in ['PrA','PrB','P01','P02','P03','P04','P05','P06',
                   'P07','P08','P09','P10','PrY','PrZ']:
            setattr(self, f'i_{p}_duracion_mSeg', 0)

        # Ciclos de ejecución
        for i in range(1, 4):
            setattr(self, f'i_ciclo_{i}_mSeg', 0)
            setattr(self, f'i_ciclo_{i}_max_mSeg', [0, 1000, 5000, 10000][i])

        for i in range(1, 11):
            setattr(self, f'i_P{i:02d}_ciclo_selector', 0)
            setattr(self, f'i_P{i:02d}_ejec_prog_ref_mSeg', 0)

        # Serial del PLC (host machine)
        for i in range(1, 9):
            setattr(self, f'i_get_sn1_sn{i}', 0)

        # Status de loggers y pruebas
        self.i_logger_status_codigo = 0
        self.i_logger_status_year = 0
        self.i_logger_status_mes = 0
        self.i_logger_status_dia = 0
        self.i_logger_status_hora = 0
        self.i_logger_status_min = 0
        self.i_logger_status_seg = 0

        self.i_controlador_estado_error = 0
        self.i_controlador_codigo_error = 0
        self.i_estado_bateria_1 = 99
        self.i_estado_bateria_2 = 99
        self.i_PRUEBA_DESEADA = 0
        self.i_DURACION_PRUEBA_HORAS = 0

        # Error status
        self.i_STATUS_ERROR_API_MEZCLA = 0
        self.i_STATUS_ERROR_CAUDAL_NETO = 0
        self.i_STATUS_ERROR_CAUDAL_NETO_Dil = 0
        self.i_STATUS_ERROR_CAUDAL_TOTAL = 0

        # Canales crudos de slots analógicos (autodiagnóstico)
        for ch in range(6):
            setattr(self, f'ID0_{ch}', 0)
        for ch in range(8):
            setattr(self, f'ID1_{ch}', 0)
        for ch in range(8):
            setattr(self, f'ID2_{ch}', 0)

        # ═══════════════════════════════════════════════════════════════
        #  REALES (FLOAT)
        # ═══════════════════════════════════════════════════════════════
        self.r_aaaaa = 0.0

        # Entradas analógicas (raw → mA → EU)
        self.r_Local_2_I_Ch0Data = 0.0  # Nivel LIT
        self.r_Local_2_I_Ch1Data = 0.0  # Flujo Lam Alta FT_01
        self.r_Local_2_I_Ch2Data = 0.0  # Flujo Gas Vortex
        self.r_Local_2_I_Ch3Data = 0.0  # Flujo Lam Baja FT_04
        self.r_Local_4_I_Ch0Data = 0.0  # Flujo MV HART FT_02
        self.r_Local_4_I_Ch1Data = 0.0  # Presión MV HART PT_02
        self.r_Local_4_I_Ch2Data = 0.0  # Temp MV HART TIT_01
        self.r_Local_4_I_Ch3Data = 0.0  # Flujo Gas MV HART
        self.r_Local_4_I_Ch4Data = 0.0  # Presión Gas HART PT_01
        self.r_Local_4_I_Ch5Data = 0.0  # Temp Gas HART TIT_02
        self.r_Local_4_I_Ch7Data = 0.0  # Water Cut WC
        self.r_nivel_aux_4_20mA = 0.0
        self.r_flujo_dil_4_20mA = 0.0

        # Salidas analógicas
        self.r_Local_2_O_Ch0Data = 0.0  # LCV - Válvula Líquido
        self.r_Local_2_O_Ch1Data = 0.0  # PCV - Válvula Gas

        # Variables de proceso (escaladas)
        self.r_LIT_001 = 0.0       # Nivel
        self.r_PDT_01 = 0.0        # DP Laminar Alta
        self.r_PDT_02 = 0.0        # DP Wedge
        self.r_PDT_03 = 0.0        # DP Laminar Baja
        self.r_Transmisor_Gas = 0.0
        self.r_Q_gas = 0.0
        self.r_Q_GAT = 0.0
        self.r_DP_gas = 0.0
        self.r_P_Gas = 0.0
        self.r_P_Oil = 0.0
        self.r_PA = 0.0            # Presión atmosférica
        self.r_T_Oil_C = 0.0
        self.r_T_Oil_F = 0.0
        self.r_T_Gas = 0.0
        self.r_T_W_C = 0.0
        self.r_WC = 0.0
        self.r_OC = 0.0
        self.r_GVoidF = 0.0
        self.r_Q_DIL_MEDIDO = 0.0
        self.r_DP_Simeflum = 0.0
        self.r_nivel_aux = 0.0

        # Densidades
        self.r_d_Oil_ref = 0.0
        self.r_S_Oil_ref = 0.0
        self.r_d_Oil_PT = 0.0
        self.r_S_Oil_PT = 0.0
        self.r_d_W_ref = 0.9990121
        self.r_d_m_PT = 0.0
        self.r_coef_Oil = 0.0
        self.r_ZL_Oil_T = 0.0
        self.r_Coil = 0.0

        # Viscosidad
        self.r_v_oil_calc = 0.0
        self.r_v_oil_medida = 0.0
        self.r_miu_Oil = 0.0
        self.r_A_v = 0.0
        self.r_B_v = 0.0

        # Caudales
        self.r_DP_W = 0.0
        self.r_DP_L = 0.0
        self.r_Relacion_Delta = 0.0
        self.r_Relacion_Delta_miu = 0.0
        self.r_Relacion_Delta_miu_laminar = 0.0
        self.r_relacion_laminar = 0.0
        self.r_caudal_dil_BM = 0.0
        self.r_caudal_nETO_Dil = 0.0
        self.r_RE_W = 0.0
        self.r_RE_W_M = 0.0
        self.r_RE_L = 0.0
        self.r_RE_L_M = 0.0

        # Cálculos teóricos
        self.r_CAUDAL_NETO_TEORICO = 0.0
        self.r_CAUDAL_NETO_Dil_TEORICO = 0.0
        self.r_CAUDAL_TOTAL_TEORICO = 0.0
        self.r_API_MEZCLA_TEORICO = 0.0
        self.r_API_formacion_BM = 0.0
        self.r_API_1 = 0.0
        self.r_API_2 = 0.0
        self.r_ERROR_API_MEZCLA = 0.0
        self.r_ERROR_CAUDAL_NETO = 0.0
        self.r_ERROR_CAUDAL_NETO_Dil = 0.0
        self.r_ERROR_CAUDAL_TOTAL = 0.0
        self.r_Q_Crudo_sc_Estimado = 0.0
        self.r_Q_W_sc_Estimado = 0.0
        self.r_Qb_Liquido_sc_Estimado = 0.0

        # Wedge Gas
        self.r_D_wedge = 0.0
        self.r_D_wedge_gas = 0.0
        self.r_h_wedge_gas = 0.0
        self.r_k_mp = 0.0
        self.r_T_Yac_C = 0.0
        self.r_T_Yac_F = 0.0
        self.r_TIPO_EQUIPO = 0.0

        # PID
        self.r_LEVEL_PID_SP = 50.0
        self.r_LEVEL_PID_03_CVOverride = 50.0
        self.r_LEVEL_PID_03_CVOper = 0.0
        self.r_LEVEL_PID_03_KP = 1.0
        self.r_LEVEL_PID_03_KI = 0.1
        self.r_LEVEL_PID_03_KD = 0.0
        self.r_LEVEL_PID_03_Factor_I = 0.0
        self.r_PRESS_PID_SP = 50.0
        self.r_PRESS_PID_PV = 0.0
        self.r_PRESS_PID_03_CVOverride = 50.0
        self.r_PRESS_PID_03_CVOper = 0.0
        self.r_PRESS_PID_03_KP = 1.0
        self.r_PRESS_PID_03_KI = 0.1
        self.r_PRESS_PID_03_KD = 0.0
        self.r_PRESS_PID_03_Factor_I = 0.0
        self.fb_LEVEL_PID_r_CVEU = 0.0
        self.fb_PRESS_PID_r_CVEU = 0.0

        # Escalamientos (configurables por usuario)
        for tag in ['LIT','FT_01','FT_02','FT_04','FT_05','VORTEX_Q_01',
                     'VORTEX_T_01','PT','DP_01','TIT','WC','nivel_aux']:
            setattr(self, f'r_SCL_{tag}_InRawMin', 4.0)
            setattr(self, f'r_SCL_{tag}_InRawMax', 20.0)
            setattr(self, f'r_SCL_{tag}_InEUMin', 0.0)
            setattr(self, f'r_SCL_{tag}_InEUMax', 100.0)

        # Fallas de presión
        self.r_falla_presion_gas = 500.0
        self.r_falla_presion_crudo = 500.0

        # Simulación
        for tag in ['LIT_001','PDT_01','PDT_02','PDT_03','P_Oil','P_Gas',
                     'T_Oil_C','T_Gas','Transmisor_Gas','Q_DIL_MEDIDO','nivel_aux']:
            setattr(self, f'r_{tag}_sim', 0.0)

        # Corrientes mA calculadas de slots analógicos (autodiagnóstico)
        for ch in range(6):
            setattr(self, f'r_ID0_{ch}_mA', 0.0)
        for ch in range(8):
            setattr(self, f'r_ID1_{ch}_mA', 0.0)
        for ch in range(8):
            setattr(self, f'r_ID2_{ch}_mA', 0.0)

        # ═══════════════════════════════════════════════════════════════
        #  VARIABLES FASE 3: Densidades y propiedades de fluidos
        # ═══════════════════════════════════════════════════════════════

        # Gas — Z-factor polinomial (Standing-Katz)
        self.r_Pc_Gas = 46.0       # Presión crítica gas (bar)
        self.r_A_ds = 0.0
        self.r_B_ds = 0.0
        self.r_C_ds = 0.0
        self.r_D_ds = 0.0
        self.r_E_ds = 1.0
        self.r_R_gas = 8.314       # Constante universal de gases
        self.r_SG_Gas = 0.86       # Gravedad específica del gas
        self.r_Z_Gas_P = 1.0
        self.r_Ee_PT = 0.0         # Factor de expansión
        self.r_Ee_PT_Oil = 0.0     # Factor expansión a T de crudo
        self.r_d_Gas_TP = 0.0      # Densidad gas a T,P
        self.r_d_Gas_W = 0.0       # Peso específico gas en agua

        # Crudo — densidades y correcciones
        self.r_d_m_PT_2 = 0.0
        self.r_T_W_C = 0.0         # Temperatura del agua °C
        self.r_T_W_F = 0.0         # Temperatura del agua °F
        self.r_CW_TP = 0.0         # Factor corrección agua
        self.r_d_W_TP = 0.0        # Densidad agua a T,P
        self.r_d_Lg_TP = 0.0       # Densidad líquido

        # Viscosidad
        self.r_miu_W = 0.0         # Viscosidad dinámica agua
        self.r_miu_Mezcla = 0.0    # Viscosidad mezcla
        self.r_K1_PTOI = 1.0
        self.r_K2_PTOI = 0.02
        self.r_K3_PTOI = 0.0
        self.r_K4_PTOI = 0.08
        self.r_PTOI_ds = 30.0
        self.b_externa = False      # Selección fórmula viscosidad agua

        # Viscosidad cinemática — parámetros Walther-ASTM
        self.r_t1 = 30.0
        self.r_t2 = 40.0
        self.r_v1 = 100.0
        self.r_v2 = 70.0

        # Diluente
        self.r_S_D_ref = 0.0
        self.r_d_D_ref = 0.0
        self.r_coef_Dil = 0.0
        self.r_T_Dil_C = 32.0
        self.r_T_Dil_F = 0.0
        self.r_C_Dil_T = 0.0
        self.r_C_Dil_T2 = 0.0

        # PVT / Condiciones estándar
        self.r_yg = 0.86
        self.r_Yg_T = 0.0
        self.r_Rso_PT = 0.0
        self.r_Rso_PT1 = 0.0
        self.r_Rso_PT2 = 0.0
        self.r_Bo = 1.0
        self.r_Bo1 = 0.0
        self.r_Bo2 = 1.0
        self.r_F_PT = 0.0
        self.b_PB_PVT = False

        # Gas — caudal
        self.r_Q_gas_STD = 0.0

        # ═══════════════════════════════════════════════════════════════
        #  VARIABLES FASE 3b: Cálculos de Caudal
        # ═══════════════════════════════════════════════════════════════

        # Laminar
        self.r_x = 0.0
        self.r_k_cd = 0.0
        self.r_AK_L = 0.0
        self.r_BK_L = 0.0
        self.r_CK_L = 1.0
        self.r_d_L = 0.004         # Diámetro tubos laminar (m = 4mm)
        self.r_N_Tubos = 19.0      # Número de tubos
        self.r_L = 0.3             # Longitud de tubos (m = 300mm)
        self.r_Q_Mezcla_L = 0.0
        self.r_Q_Liquido_L = 0.0
        self.r_Qb_Liquido_L = 0.0
        self.r_Qb_Liquido_sc_L = 0.0
        self.r_Q_Crudo_L = 0.0
        self.r_Q_Crudo_sc_L = 0.0
        self.r_Q_W_L = 0.0
        self.r_Q_W_sc_L = 0.0
        self.r_Q_gat_L = 0.0
        self.r_Q_gat_sc_L = 0.0
        self.r_Q_gas_T_L = 0.0
        self.r_Q_gas_T_sc_L = 0.0
        self.r_Qgsol_L = 0.0
        self.d_Qb_Mezcla_L = 0

        # Wedge
        self.r_m = 0.3             # Relación cuña
        self.r_D_Wedge = 24.3      # Diámetro wedge (mm)
        self.r_D_Wedge1 = 0.0
        self.r_z = 0.0
        self.r_fi = 0.0
        self.r_A_cd = 0.0
        self.r_Ao_cd = 0.0
        self.r_Beta_cd = 0.0
        self.r_Cd_Beta = 0.0
        self.r_K_wedge = 1.0
        self.r_AK_W = 0.0
        self.r_Q_Mezcla_W = 0.0
        self.r_Q_Liquido_W = 0.0
        self.r_Qb_Liquido_W = 0.0
        self.r_Qb_Liquido_sc_W = 0.0
        self.r_Q_Crudo_W = 0.0
        self.r_Q_Crudo_sc_W = 0.0
        self.r_Q_W_W = 0.0
        self.r_Q_W_sc_W = 0.0
        self.r_Q_gat_W = 0.0
        self.r_Q_gat_sc_W = 0.0
        self.r_Q_gas_T_W = 0.0
        self.r_Q_gas_T_sc_W = 0.0
        self.r_Qgsol_W = 0.0
        self.r_Q_Dil_lina_W = 0.0
        self.r_Q_Dil_sc_W = 0.0
        self.r_Q_Crudo_W_neto = 0.0
        self.r_Q_Crudo_sc_W_neto = 0.0

        # Selección Wedge/Laminar (resultados finales)
        self.r_Q_Liquido = 0.0
        self.r_Q_Crudo = 0.0
        self.r_Q_W = 0.0
        self.r_Q_gas_T = 0.0
        self.r_Q_gat = 0.0
        self.r_Qb_Liquido_sc = 0.0
        self.r_Q_W_sc = 0.0
        self.r_Q_gas_T_sc = 0.0
        self.r_Q_Crudo_sc = 0.0
        self.r_Q_gat_sc = 0.0

        # Volúmenes acumulados
        self.r_Vol_Liquido = 0.0
        self.r_Vol_Liquido_Total = 0.0
        self.r_Vol_Crudo = 0.0
        self.r_Vol_Crudo_Total = 0.0
        self.r_Vol_W = 0.0
        self.r_Vol_W_Total = 0.0
        self.r_Vol_gat = 0.0
        self.r_Vol_gat_Total = 0.0
        self.r_Vol_gas = 0.0
        self.r_Vol_gas_Total = 0.0
        self.r_Vol_Crudo_neto = 0.0
        self.r_Vol_Crudo_Total_neto = 0.0
        self.r_Vol_Dil = 0.0
        self.r_Vol_Dil_Total = 0.0
        self.r_Q_Dil_linea = 0.0
        self.r_Q_Crudo_neto = 0.0

        # Volúmenes auxiliares
        self.r_VOL_LIQUIDO_AUX = 0.0
        self.r_VOL_CRUDO_AUX = 0.0
        self.r_VOL_W_AUX = 0.0
        self.r_VOL_GAT_AUX = 0.0
        self.r_VOL_GAS_AUX = 0.0
        self.r_VOL_CRUDO_NETO_AUX = 0.0
        self.r_VOL_DIL_AUX = 0.0
        self.b_PULSO_2 = False

        # Volúmenes standard conditions
        self.r_Vol_Liquido_sc = 0.0
        self.r_Vol_Liquido_Total_sc = 0.0
        self.r_Vol_Crudo_sc = 0.0
        self.r_Vol_Crudo_Total_sc = 0.0
        self.r_Vol_W_sc = 0.0
        self.r_Vol_W_Total_sc = 0.0
        self.r_Vol_m_sc = 0.0
        self.r_Vol_m_Total_sc = 0.0
        self.r_Vol_gat_sc = 0.0
        self.r_Vol_gat_Total_sc = 0.0
        self.r_Vol_gas_sc = 0.0
        self.r_Vol_gas_Total_sc = 0.0
        self.r_Vol_Crudo_neto_sc = 0.0
        self.r_Vol_Crudo_Total_neto_sc = 0.0
        self.r_Vol_Dil_sc = 0.0
        self.r_Vol_Dil_Total_sc = 0.0

        # Volúmenes sc auxiliares
        self.r_Vol_Liquido_sc_AUX = 0.0
        self.r_Vol_Crudo_sc_AUX = 0.0
        self.r_Vol_W_sc_AUX = 0.0
        self.r_Vol_m_sc_AUX = 0.0
        self.r_Vol_gat_sc_AUX = 0.0
        self.r_Vol_gas_sc_AUX = 0.0

        # Estimados de caudal
        self.r_Q_Crudo_Estimado = 0.0
        self.r_Q_W_Estimado = 0.0
        self.r_Qb_Liquido_Estimado = 0.0
        self.r_Q_gat_Estimado = 0.0
        self.r_Q_gas_Estimado = 0.0
        self.r_Q_Crudo_Neto_Estimado = 0.0
        self.r_Qb_Dil_Estimado = 0.0
        self.r_Q_gas_sc_Estimado = 0.0
        self.r_Q_Crudo_Neto_Estimado_sc = 0.0
        self.r_Qb_Dil_Estimado_sc = 0.0
        self.r_Q_Crudo_Sumatoria = 0.0
        self.r_Q_gas_sc_Estimado_x_mil = 0.0
        self.r_Vol_dil_total_real = 0.0

        # GOR, WC neto, GVF
        self.r_GOR = 0.0
        self.r_GOR_Neto = 0.0
        self.r_WC_sc = 0.0
        self.r_WC_neto = 0.0
        self.r_V_mezcla = 0.0
        self.r_GVF = 0.0

        # Proyecciones
        self.i_TIEMPO_prueba_proy_H = 0
        self.d_TIEMPO_prueba_proy_seg = 0
        self.r_Vol_m_Total = 0.0
        self.r_Vol_m_Total_Proy = 0.0
        self.r_Vol_m_Total_sc_Proy = 0.0
        self.r_Vol_Crudo_Total_Proy = 0.0
        self.r_Vol_Crudo_Total_sc_Proy = 0.0
        self.r_Vol_Crudo_Total_neto_Proy = 0.0
        self.r_Vol_Crudo_Total_neto_sc_Proy = 0.0
        self.r_Vol_Dil_Total_Proy = 0.0
        self.r_Vol_Dil_Total_sc_Proy = 0.0
        self.r_Vol_W_Total_Proy = 0.0
        self.r_Vol_W_Total_sc_Proy = 0.0
        self.r_Vol_gat_Total_Proy = 0.0
        self.r_Vol_gat_Total_sc_Proy = 0.0
        self.r_Vol_gas_Total_sc_Proy = 0.0

        # Promedios
        self.r_P_Gas_total = 0.0
        self.r_P_Gas_promedio = 0.0
        self.r_T_Oil_C_Total = 0.0
        self.r_T_Oil_C_promedio = 0.0
        self.r_T_Gas_total = 0.0
        self.r_T_Gas_promedio = 0.0
        self.r_miu_Oil_total = 0.0
        self.r_miu_Oil_promedio = 0.0
        self.r_WC_total = 0.0

        # Prueba de pozo
        self.b_Prueba_en_Progreso = False
        self.b_Parada_en_Progreso = False
        self.ad_TIEMPO_prueba = [0] * 10

        # Transmisor baja
        self.b_transmisor_baja = False

        # ═══════════════════════════════════════════════════════════════
        #  VARIABLES FASE 4: Control principal y alarmas
        # ═══════════════════════════════════════════════════════════════

        # Reloj del sistema (array ISaGRAF ad_CLOCK[0..5])
        self.ad_CLOCK = [0] * 6
        self.ad_CLOCK_0 = 0
        self.ad_CLOCK_1 = 0
        self.ad_CLOCK_2 = 0
        self.ad_CLOCK_3 = 0
        self.ad_CLOCK_4 = 0
        self.ad_CLOCK_5 = 0

        # Estado del controlador
        self.b_KEY_SWITCH_RUN     = False
        self.b_KEY_SWITCH_REM_RUN = False

        # Selector transmisor baja/alta
        self.b_Sel_T_baja = False         # alias de b_SEL_T_baja
        self.r_MAX_MIN_TRANSBAJA = 0.5    # umbral de conmutación (inHO)

        # Parámetros de proceso manual
        self.r_VI_MAN    = 0.0  # viscosidad manual
        self.i_WC_MAN    = 0    # WC manual (int)
        self.i_GVF_MAN   = 0    # GVF manual (int)
        self.b_VI_SW     = False
        self.b_WC_SW     = False
        self.b_GVF_SW    = False

        # --- Datos de Pruebas de Pozo (Arrays para históricos) ---
        self.ad_TIEMPO_inicio_prueba = [0.0] * 400
        self.ad_TIEMPO_final_prueba = [0.0] * 400
        self.ai_DURACION_prueba = [0] * 400
        self.i_indice_prueba = 0
        
        # --- Banderas de Control de Pruebas ---
        self.b_PB_inicio_prueba     = False
        self.b_PB_parada_prueba     = False
        self.b_PB_parada_prueba_ant = False
        self.b_IHM_Validar_Prueba   = False
        self.b_IHM_Abortar_Prueba   = False
        self.b_Prueba_en_Progreso   = False
        self.b_Parada_en_Progreso   = False
        self.b_Bit_5                = False  # Bit de estado de parada
        self.b_inicio_prueba        = False
        self.b_prueba_en_progreso   = False

        # --- Variables específicas para Fase 5 (Prueba de Pozo) ---
        self.ad_IHM_TIEMPO_prueba = [0] * 5
        self.ad_IHM_HORA_inicio = [0] * 6
        self.ar_TIEMPO_prueba_TOTAL = [0.0] * 10
        
        # Bits de un solo disparo (ONS) y auxiliares
        for b in [0, 1, 2, 6, 8, 10, 11]:
            setattr(self, f'b_Bit_{b}', False)

        # Cadenas para histórico de pozo
        self.as_Codigo_pozo_01 = '_'
        self.as_Codigo_pozo_16 = ''
        self.as_Codigo_pozo_19 = ''
        self.as_Codigo_pozo_15 = ''
        self.as_Codigo_pozo_11 = ''
        self.as_Codigo_pozo_13 = ''
        self.as_Fecha_Inicio_Prueba_0 = '/'
        self.as_Fecha_Inicio_Prueba_4 = ''
        self.as_Hora_Inicio_Prueba_0 = ':'
        self.as_Hora_Inicio_Prueba_4 = ''
        
        self.i_Numero_Prueba = 1
        self.i_Ultima_Prueba = 1
        self.i_duracion_prueba_horas = 0
        self.i_posicion_combo_box_1 = 0   # Índice selector método de producción
        self.i_posicion_combo_box_2 = 0   # Índice selector inyección de diluente
        self.i_ESTATUS = 0
        
        for i in range(6):
            setattr(self, f'ad_TIEMPO_inicio_prueba_{i}', 0)
            
        self.ar_TIEMPO_prueba_TOTAL_3 = 0.0
        self.ar_TIEMPO_prueba_TOTAL_5 = 0.0
        self.ar_TIEMPO_prueba_TOTAL_6 = 0.0

        # --- Configuración de Escalamiento de Válvulas (PID) ---
        from config import SCALE_LCV_03, SCALE_PCV_03
        self.r_SCL_LCV_03_InRawMin, self.r_SCL_LCV_03_InRawMax, \
        self.r_SCL_LCV_03_InEUMin, self.r_SCL_LCV_03_InEUMax = SCALE_LCV_03
        
        self.r_SCL_PCV_03_InRawMin, self.r_SCL_PCV_03_InRawMax, \
        self.r_SCL_PCV_03_InEUMin, self.r_SCL_PCV_03_InEUMax = SCALE_PCV_03

        # --- Modbus RTU / TCP (Registros) ---
        # Datos Modbus Sonar (Sonalog / CiDRA GVF)
        for i in range(4, 42, 2):
            setattr(self, f'r_MBS_ORINOCO_I1_Data_{i}', 0.0)
        self.r_visco_modbus    = 0.0
        self.r_GVF_modbus_data = 0.0

        # Salidas Modbus
        self.r_MBS_ORINOCO_O1_Data_1 = 0.0
        self.r_MBS_ORINOCO_O1_Data_3 = 0.0

        # Variables intermedias salidas faltantes
        self.r_Salida_Falt_S3OCh2  = 0.0
        self.r_Salida_falt_L3OCh3  = 0.0
        self.fb_SEL_03_pr_r_Out    = 0.0
        self.r_DP_gas              = 0.0

        # Wedge Gas (F05E)
        self.r_pi         = math.pi
        self.r_P1_Gas     = 0.0
        self.r_P2_Gas     = 0.0
        self.r_P3_Gas     = 0.0
        self.r_DP_gas_PK  = 0.0
        self.r_A1         = 0.0
        self.r_fi_gas     = 0.0
        self.r_Beta_mp    = 0.0
        self.r_C_B        = 0.0
        self.r_A_mp       = 0.0
        self.r_Ao_mp      = 0.0
        self.r_Y1a        = 0.0
        self.r_Y1b        = 0.0
        self.r_Y1         = 0.0
        self.r_d_Gas      = 0.0
        self.r_Q_gas_1    = 0.0

        # Escalamientos adicionales (que faltaban en el bucle original)
        for tag in ['VIT', 'GVF', 'VORTEX_P', 'FIT_05',
                    'TIT_B', 'PIT_B', 'PIT_B_01']:
            setattr(self, f'r_SCL_{tag}_InRawMin', 4.0)
            setattr(self, f'r_SCL_{tag}_InRawMax', 20.0)
            setattr(self, f'r_SCL_{tag}_InEUMin',  0.0)
            setattr(self, f'r_SCL_{tag}_InEUMax',  100.0)
        # Rangos derivados para TIT_B y PIT_B
        self.r_SCL_TIT_B_InRawMin   = 0.0
        self.r_SCL_TIT_B_InRawMax   = 100.0
        self.r_SCL_TIT_B_InEUMin    = 0.0
        self.r_SCL_TIT_B_InEUMax    = 100.0
        self.r_SCL_PIT_B_InRawMin   = 0.0
        self.r_SCL_PIT_B_InRawMax   = 100.0
        self.r_SCL_PIT_B_InEUMin    = 0.0
        self.r_SCL_PIT_B_InEUMax    = 100.0
        self.r_SCL_PIT_B_01_InRawMin = 0.0
        self.r_SCL_PIT_B_01_InRawMax = 100.0
        self.r_SCL_PIT_B_01_InEUMin  = 0.0
        self.r_SCL_PIT_B_01_InEUMax  = 100.0
        self.r_SCL_FIT_05_InRawMin   = 4.0
        self.r_SCL_FIT_05_InRawMax   = 20.0
        self.r_SCL_FIT_05_InEUMin    = 0.0
        self.r_SCL_FIT_05_InEUMax    = 100.0

        # Límites de los FB_HLL del módulo principal (_mp)
        for n in [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 15, 16, 17, 18]:
            setattr(self, f'r_HLL_{n:02d}_mp_LowLimit',  0.0)
            setattr(self, f'r_HLL_{n:02d}_mp_HighLimit', 1.0e9)
        self.r_HLL_nivel_aux_LowLimit  = 0.0
        self.r_HLL_nivel_aux_HighLimit = 1.0e9

        # Configuración de alarmas (LL, L, H, HH, DB, TIME)
        _alarm_tags_config = [
            'DP_01', 'FT_01', 'FT_02', 'FT_03', 'FT_04', 'FT_05',
            'GVF', 'LIT', 'PT_01', 'PT_02', 'TIT_01', 'TIT_02', 'VIT', 'WC']
        for tag in _alarm_tags_config:
            setattr(self, f'r_ALARM_{tag}_LL_LIMIT', 0.0)
            setattr(self, f'r_ALARM_{tag}_L_LIMIT',  10.0)
            setattr(self, f'r_ALARM_{tag}_H_LIMIT',  90.0)
            setattr(self, f'r_ALARM_{tag}_HH_LIMIT', 100.0)
            setattr(self, f'r_ALARM_{tag}_DB',       0.5)
            setattr(self, f'r_ALARM_{tag}_TIME',     2.0)

        # PID Control TS (Sampling Time en segundos)
        self.t_LEVEL_PID_03_TS = 1.0
        self.t_PRESS_PID_03_TS = 1.0

        # Salidas booleanas de las alarmas (espejeo de FB_ALARM)
        for tag in _alarm_tags_config:
            for lvl in ['AHH', 'AH', 'AL', 'ALL']:
                setattr(self, f'fb_ALARM_{tag}_b_{lvl}', False)

        # ═══════════════════════════════════════════════════════════════
        #  STRINGS
        # ═══════════════════════════════════════════════════════════════
        self.s_aaaaa = ''
        self.s_ok = 'OK'
        self.s_logger_status_mensaje = 'OK'
        self.s_pba_pozo_status_mensaje = 'OK'
        self.s_list_combo_box_status_mensaje = 'OK'
        self.s_get_ver1_os = ''
        self.s_get_ver1_dr = ''
        self.s_HART_Mensaje_Status = ''        # Estatus descriptivo de comunicación HART
        
        # Líneas de combo boxes cargadas dinámicamente desde archivos de configuración
        self.s_combo_box_1_linea_01 = ''
        self.s_combo_box_1_linea_02 = ''
        self.s_combo_box_1_linea_03 = ''
        self.s_combo_box_1_linea_04 = ''
        self.s_combo_box_1_linea_05 = ''
        self.s_combo_box_1_linea_06 = ''
        self.s_combo_box_1_linea_07 = ''
        self.s_combo_box_1_linea_08 = ''
        self.s_combo_box_1_linea_09 = ''
        self.s_combo_box_1_linea_10 = ''
        
        self.s_combo_box_2_linea_01 = ''
        self.s_combo_box_2_linea_02 = ''
        self.s_combo_box_2_linea_03 = ''
        self.s_combo_box_2_linea_04 = ''
        self.s_combo_box_2_linea_05 = ''
        self.s_combo_box_2_linea_06 = ''
        self.s_combo_box_2_linea_07 = ''
        self.s_combo_box_2_linea_08 = ''
        self.s_combo_box_2_linea_09 = ''
        self.s_combo_box_2_linea_10 = ''

        # ═══════════════════════════════════════════════════════════════
        #  DOUBLES / LONG
        # ═══════════════════════════════════════════════════════════════
        self.d_vacio = 0
        self.d_LSI_PROTECCION = 0
        self.d_VOX_ANALIZER = -1071649436
        self.d_T_EQUIPO = 1
        self.d_CONTROLLER_STATUS = 12640

        # ═══════════════════════════════════════════════════════════════
        #  ARRAYS
        # ═══════════════════════════════════════════════════════════════
        self.ar_Sonar_real = [0.0] * 22
        self.ar_HART_SV = [0.0] * 3
        self.ar_HART_TV = [0.0] * 3
        self.ar_HART_FV = [0.0] * 3
        self.ai_string_desglosado = [0] * 84
        self.as_Codigo_pozo_03 = ''
        self.as_Codigo_pozo_06 = ''
        self.as_Codigo_pozo_08 = ''
        self.as_Codigo_pozo_17 = ''
        self.as_Codigo_pozo_18 = ''

        # ═══════════════════════════════════════════════════════════════
        #  TEMPORIZADORES (instancias)
        # ═══════════════════════════════════════════════════════════════
        self.ton_aaaaa = TON()
        self.ton_T_ON_INICIO = TON()
        self.ton_T_ON_RELE = TON()
        self.ton_fijar_valores_defecto = TON()
        self.ton_PLC_reiniciar = TON()
        self.ton_Borra_todos_Reg = TON()
        self.ton_reset_sim = TON()

        # Temporizadores de scan
        self.t_PLC_scan = ScanTimer()
        for p in ['PrA','PrB','P01','P02','P03','P04','P05','P06',
                   'P07','P08','P09','P10','PrY','PrZ']:
            setattr(self, f't_{p}_duracion', ScanTimer())

        # Ciclos
        self.cycle_timers = [CycleTimer() for _ in range(4)]

        # ═══════════════════════════════════════════════════════════════
        #  BLOQUES DE FUNCIÓN (instancias)
        # ═══════════════════════════════════════════════════════════════
        self.fb_LEVEL_PID = FB_PIDE()
        self.fb_PRESS_PID = FB_PIDE()
        self.fb_SEL_03_pid = FB_SEL()
        self.fb_BNOT_05 = FB_BNOT()
        self.fb_BNOT_06 = FB_BNOT()
        self.fb_sw_AM_Laminar_Wedge = FB_SW_AM()

        # Escalamientos
        self.fb_SCL_LCV_03 = FB_SCL()
        self.fb_SCL_PCV_03 = FB_SCL()

        # Alarmas (una instancia por tag)
        alarm_tags = ['DP_01','FT_01','FT_02','FT_03','FT_04','FT_05',
                       'GVF','LIT','PT_01','PT_02','TIT_01','TIT_02','VIT','WC']
        for tag in alarm_tags:
            setattr(self, f'fb_ALARM_{tag}', FB_ALARM())

    def update_datetime(self):
        """Actualizar fecha/hora del sistema (equivale a fb_sysdat_r1 + fb_systim_r1)."""
        now = datetime.now()
        self.i_sysdat_r1_yy = now.year
        self.i_sysdat_r1_mm = now.month
        self.i_sysdat_r1_dd = now.day
        self.i_systim_r1_hh = now.hour
        self.i_systim_r1_mm = now.minute
        self.i_systim_r1_ss = now.second

    def apply_overrides(self):
        """Aplica los valores manuales de instrumentos si están en override."""
        for tag, val in self.instrument_overrides.items():
            setattr(self, tag, val)


# Instancia global singleton
V = GlobalVars()
