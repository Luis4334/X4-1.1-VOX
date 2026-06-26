"""
═══════════════════════════════════════════════════════════════════════════════
  Orinoco SoftPLC — FASE 1: Sistema y Comunicaciones
═══════════════════════════════════════════════════════════════════════════════
  Migrado de:  PRA_SIST.LSF, PRB_INIC.LSF, F_Consta.LSF, F_Instal.LSF,
               MBus_Son.lsf, MBus_Vis.lsf, STR_MODB.LSF
  
  Funciones:
    prA_sistema()  → Temporizadores globales, desglose string→Modbus
    prB_inicio()   → RTC, Loggers, Modbus externo, HART, ciclos de ejecución
    f_instalacion()→ Inicialización de timers, retained vars, config HART
═══════════════════════════════════════════════════════════════════════════════
"""

import logging
import struct
import os

from global_vars import V
from function_blocks import int2msg, FB_FILT_C

logger = logging.getLogger("orinoco.fase1")


# ═════════════════════════════════════════════════════════════════════════════
#  INSTALACIÓN INICIAL (F_Instal.LSF) — Se ejecuta una sola vez al arranque
# ═════════════════════════════════════════════════════════════════════════════

def f_instalacion():
    """
    Migrado de: F_Instal.LSF
    Se ejecuta una sola vez al primer scan del PLC.
    Inicializa timers, carga variables retenidas y configura HART.
    """
    logger.info("Ejecutando F_Instalacion — inicialización del sistema")

    # 01. Inicializar todos los timers de duración
    for name in ['PrA','PrB','P01','P02','P03','P04','P05','P06',
                 'P07','P08','P09','P10','PrY','PrZ']:
        getattr(V, f't_{name}_duracion').reset()
    V.t_PLC_scan.reset()
    for ct in V.cycle_timers:
        ct.reset()

    # 02-04. Cargar variables retenidas desde disco (si existen)
    _load_retained_vars()

    # 05. Modo de ejecución del PLC
    V.i_PLC_mode_actual = V.i_PLC_mode_usuario

    # 07. Configuración HART
    V.s_HART_Mensaje_Status = 'Por favor envie un comando HART ...'
    V.i_HART_Disp_n = 2  # Cantidad de dispositivos HART

    # 08-09. Cargar archivos de combo box (listas de producción/diluente)
    _load_combo_box_files()

    logger.info("F_Instalacion completada exitosamente")


def _load_retained_vars():
    """Cargar variables retenidas desde archivo JSON (equivale a VarRet_B/N/F)."""
    import json
    retained_path = os.path.join(os.path.dirname(__file__), "retained_vars.json")
    if os.path.exists(retained_path):
        try:
            with open(retained_path, 'r') as f:
                data = json.load(f)
            for key, value in data.items():
                if hasattr(V, key):
                    setattr(V, key, value)
            logger.info(f"Variables retenidas cargadas: {len(data)} variables")
        except Exception as e:
            logger.warning(f"Error cargando variables retenidas: {e}")
    else:
        logger.info("No se encontró archivo de variables retenidas — usando defaults")


def save_retained_vars():
    """Guardar variables retenidas a disco (llamar al apagar)."""
    import json
    retained_path = os.path.join(os.path.dirname(__file__), "retained_vars.json")
    # Variables que deben persistir entre reinicios
    keys_to_retain = [
        # Escalamientos (configurables por SCADA/HMI)
        'r_SCL_LIT_InRawMin', 'r_SCL_LIT_InRawMax', 'r_SCL_LIT_InEUMin', 'r_SCL_LIT_InEUMax',
        'r_SCL_FT_01_InRawMin', 'r_SCL_FT_01_InRawMax', 'r_SCL_FT_01_InEUMin', 'r_SCL_FT_01_InEUMax',
        'r_SCL_FT_02_InRawMin', 'r_SCL_FT_02_InRawMax', 'r_SCL_FT_02_InEUMin', 'r_SCL_FT_02_InEUMax',
        'r_SCL_FT_04_InRawMin', 'r_SCL_FT_04_InRawMax', 'r_SCL_FT_04_InEUMin', 'r_SCL_FT_04_InEUMax',
        'r_SCL_PT_InRawMin', 'r_SCL_PT_InRawMax', 'r_SCL_PT_InEUMin', 'r_SCL_PT_InEUMax',
        'r_SCL_TIT_InRawMin', 'r_SCL_TIT_InRawMax', 'r_SCL_TIT_InEUMin', 'r_SCL_TIT_InEUMax',
        'r_SCL_WC_InRawMin', 'r_SCL_WC_InRawMax', 'r_SCL_WC_InEUMin', 'r_SCL_WC_InEUMax',
        'r_SCL_VORTEX_Q_01_InRawMin', 'r_SCL_VORTEX_Q_01_InRawMax',
        'r_SCL_VORTEX_Q_01_InEUMin', 'r_SCL_VORTEX_Q_01_InEUMax',
        'r_SCL_VORTEX_T_01_InRawMin', 'r_SCL_VORTEX_T_01_InRawMax',
        'r_SCL_VORTEX_T_01_InEUMin', 'r_SCL_VORTEX_T_01_InEUMax',
        # PID
        'r_LEVEL_PID_SP', 'r_LEVEL_PID_03_KP', 'r_LEVEL_PID_03_KI', 'r_LEVEL_PID_03_KD',
        'r_PRESS_PID_SP', 'r_PRESS_PID_03_KP', 'r_PRESS_PID_03_KI', 'r_PRESS_PID_03_KD',
        # Proceso
        'r_S_Oil_ref', 'r_PA', 'r_API_formacion_BM', 'r_API_1',
        'r_falla_presion_gas', 'r_falla_presion_crudo',
        'r_D_Wedge', 'r_K_wedge', 'r_T_Yac_C',
        # Switches
        'b_Sw_Wedge_Gas', 'b_Sw_Wedge_Gas_2', 'b_SW_DIL_MEDIDO_CALC',
        'b_SEL_LAMINAR', 'b_SEL_T_baja', 'b_habilitar_Loggers',
        'b_Control_PID_Gas', 'b_PID_POSIC_SW',
    ]
    data = {}
    for key in keys_to_retain:
        if hasattr(V, key):
            data[key] = getattr(V, key)
    try:
        with open(retained_path, 'w') as f:
            json.dump(data, f, indent=2)
        logger.info(f"Variables retenidas guardadas: {len(data)} variables")
    except Exception as e:
        logger.error(f"Error guardando variables retenidas: {e}")


def _load_combo_box_files():
    """Cargar archivos de listas combo box (Métodos de producción, Inyección)."""
    cb_path = os.path.join(os.path.dirname(__file__), "config_files")
    os.makedirs(cb_path, exist_ok=True)

    files = [
        ("Listado_Combo_Box_1_Metodos_de_Produccion.txt", "combo_box_1"),
        ("Listado_Combo_Box_2_Inyeccion_de_Diluente.txt", "combo_box_2"),
    ]
    for filename, prefix in files:
        filepath = os.path.join(cb_path, filename)
        if os.path.exists(filepath):
            try:
                with open(filepath, 'r') as f:
                    lines = f.readlines()
                setattr(V, f'i_{prefix}_lineas', len(lines))
                for i, line in enumerate(lines[:10], 1):
                    setattr(V, f's_{prefix}_linea_{i:02d}', line.strip())
                logger.info(f"Combo box '{filename}': {len(lines)} líneas cargadas")
            except Exception as e:
                logger.warning(f"Error cargando {filename}: {e}")
        else:
            logger.info(f"Archivo combo box no encontrado: {filepath}")


# ═════════════════════════════════════════════════════════════════════════════
#  prA_SISTEMA (PRA_SIST.LSF) — Temporizadores y string→Modbus
# ═════════════════════════════════════════════════════════════════════════════

def prA_sistema():
    """
    Migrado de: PRA_SIST.LSF
    Gestión de temporizadores globales y mapeo de cadenas string a Modbus.
    """
    timer = V.t_PrA_duracion
    timer.reset()

    # ─── Temporizador global cíclico de 30 segundos ──────────────────────
    b_aaaaa_ton = not V.ton_aaaaa.q
    V.ton_aaaaa.execute(b_aaaaa_ton, 30.0)
    V.i_aaaaa = V.ton_aaaaa.et_ms
    V.r_aaaaa = V.ton_aaaaa.et
    if V.ton_aaaaa.q:
        V.b_aaaaa = not V.b_aaaaa
    V.s_aaaaa = f"Test{V.i_aaaaa}"

    # ─── Desglose de string a registros Modbus ───────────────────────────
    s_string = V.s_aaaaa
    length = min(len(s_string), 82)
    V.ai_string_desglosado[0] = length
    for i in range(1, length + 1):
        if i <= len(s_string):
            V.ai_string_desglosado[i] = ord(s_string[i - 1])

    # Asignar a registros Modbus individuales (1001..1010)
    # En Python con Modbus TCP server, esto se hace directamente al datastore

    V.i_PrA_duracion_mSeg = timer.read()


# ═════════════════════════════════════════════════════════════════════════════
#  prB_INICIO (PRB_INIC.LSF) — RTC, Loggers, Modbus, HART, Ciclos
# ═════════════════════════════════════════════════════════════════════════════

def prB_inicio():
    """
    Migrado de: PRB_INIC.LSF
    Lectura del reloj RTC, inicialización de loggers, comunicación Modbus/HART,
    gestión de temporizadores de ciclo, fijar valores por defecto, etc.
    """
    # ─── 01. Lectura de Fecha y Hora del sistema ─────────────────────────
    V.update_datetime()

    s_yy = int2msg(V.i_sysdat_r1_yy, 4)
    s_mm = int2msg(V.i_sysdat_r1_mm, 2)
    s_dd = int2msg(V.i_sysdat_r1_dd, 2)
    s_hh = int2msg(V.i_systim_r1_hh, 2)
    s_mi = int2msg(V.i_systim_r1_mm, 2)
    s_ss = int2msg(V.i_systim_r1_ss, 2)

    # ─── 02. Activación inicial ──────────────────────────────────────────
    if V.b_primer_scan:
        V.b_logger_status_reinicia = True
        V.b_pba_pozo_status_reinicia = True
        V.b_list_combo_box_status_reinicia = True

    # ─── 03. Reinicio del status de loggers ──────────────────────────────
    if V.b_logger_status_reinicia:
        V.s_logger_status_mensaje = V.s_ok
        V.i_logger_status_codigo = 0
        V.i_logger_status_year = V.i_sysdat_r1_yy
        V.i_logger_status_mes = V.i_sysdat_r1_mm
        V.i_logger_status_dia = V.i_sysdat_r1_dd
        V.i_logger_status_hora = V.i_systim_r1_hh
        V.i_logger_status_min = V.i_systim_r1_mm
        V.i_logger_status_seg = V.i_systim_r1_ss
        V.b_logger_status_reinicia = False

    # ─── 04. Reinicio del status de pruebas de pozo ──────────────────────
    if V.b_pba_pozo_status_reinicia:
        V.s_pba_pozo_status_mensaje = V.s_ok
        V.b_pba_pozo_status_reinicia = False

    # ─── 05. Reinicio del status de combo box ────────────────────────────
    if V.b_list_combo_box_status_reinicia:
        V.s_list_combo_box_status_mensaje = V.s_ok
        V.b_list_combo_box_status_reinicia = False

    # ─── 06. Constantes (primer scan) ────────────────────────────────────
    if V.b_primer_scan:
        from config import (D_VOX_ANALIZER, R_D_W_REF, R_SG_GAS, R_PI,
                             R_T1, R_T2, R_V1, R_V2, R_MAX_MIN_TRANSBAJA,
                             LEVEL_PID_CV_OVERRIDE, PRESS_PID_CV_OVERRIDE)
        V.d_VOX_ANALIZER = D_VOX_ANALIZER
        V.r_d_W_ref = R_D_W_REF
        V.r_LEVEL_PID_03_CVOverride = LEVEL_PID_CV_OVERRIDE
        V.r_PRESS_PID_03_CVOverride = PRESS_PID_CV_OVERRIDE

    # ─── 07. Instalación (primer scan) ───────────────────────────────────
    if V.b_primer_scan:
        f_instalacion()

    # ─── 09. Cálculo del PLC scan mSeg ───────────────────────────────────
    V.i_PLC_scan_mSeg = V.t_PLC_scan.read_and_reset()

    # ─── 14. Loggers (habilitación individual) ───────────────────────────
    if V.b_habilitar_Loggers_Individual:
        V.b_habilitar_L_Config = True
        V.b_habilitar_L_Evento = True
        V.b_habilitar_L_Alarma = True
        V.b_habilitar_L_Data_G = True
        V.b_habilitar_L_Data_C = True
        V.b_habilitar_L_Prueba = True
        V.b_habilitar_L_ResPba = True
        V.b_habilitar_Loggers_Individual = False

    if V.b_inhabilitar_Loggers_Individual:
        V.b_habilitar_L_Config = False
        V.b_habilitar_L_Evento = False
        V.b_habilitar_L_Alarma = False
        V.b_habilitar_L_Data_G = False
        V.b_habilitar_L_Data_C = False
        V.b_habilitar_L_Prueba = False
        V.b_habilitar_L_ResPba = False
        V.b_inhabilitar_Loggers_Individual = False

    V.b_habilitar_Loggers_ant = V.b_habilitar_Loggers
    V.b_TIMER_Parada_de_Prueba_ant = V.b_TIMER_Parada_de_Prueba

    # ─── 15. Fijar valores por defecto ───────────────────────────────────
    V.ton_fijar_valores_defecto.execute(V.b_fijar_valores_defecto_ton, 60.0)
    V.i_fijar_valores_defecto_seg = 60 - V.ton_fijar_valores_defecto.et_ms // 1000
    if V.ton_fijar_valores_defecto.q:
        V.b_fijar_valores_defecto_ton = False
    if not V.b_fijar_valores_defecto_ton:
        V.b_fijar_valores_defecto_usuario = False
    if V.b_fijar_valores_defecto_ton and V.b_fijar_valores_defecto_usuario:
        V.b_fijar_valores_defecto_ton = False
        V.b_fijar_valores_defecto_usuario = False
        V.b_fijar_valores_defecto = True

    # ─── 16. Reiniciar controlador (temporizador 60s) ────────────────────
    V.ton_PLC_reiniciar.execute(V.b_PLC_reiniciar_ton, 60.0)
    V.i_PLC_reiniciar_seg = 60 - V.ton_PLC_reiniciar.et_ms // 1000
    if V.ton_PLC_reiniciar.q:
        V.b_PLC_reiniciar_ton = False
    if not V.b_PLC_reiniciar_ton:
        V.b_PLC_reiniciar_usuario = False

    # ─── 17. Borrar todos los registros ──────────────────────────────────
    V.ton_Borra_todos_Reg.execute(V.b_Borra_todos_Reg_ton, 60.0)
    if V.ton_Borra_todos_Reg.q:
        V.b_Borra_todos_Reg_ton = False
    if not V.b_Borra_todos_Reg_ton:
        V.b_Borra_todos_Reg_usuario = False
    if V.b_Borra_todos_Reg_ton and V.b_Borra_todos_Reg_usuario:
        V.b_Borra_todos_Reg_ton = False
        V.b_Borra_todos_Reg_usuario = False
        V.b_Borra_todos_Registros = True

    # ─── 18. Desactivación automática de simulación (1 hora) ─────────────
    V.ton_reset_sim.execute(V.b_simular_ai, 3600.0)
    if V.ton_reset_sim.q:
        V.b_simular_ai = False
        logger.info("Simulación desactivada automáticamente (timeout 1 hora)")

    # ─── 20. Ciclos de ejecución de programas ────────────────────────────
    for i in range(1, 11):
        ant_key = f'b_P{i:02d}_ejec_prog_ant'
        prog_key = f'b_P{i:02d}_ejec_prog'
        setattr(V, ant_key, getattr(V, prog_key))

    # Actualizar ciclos
    for c in range(1, 4):
        ct = V.cycle_timers[c]
        max_ms = getattr(V, f'i_ciclo_{c}_max_mSeg')
        if ct.check_and_reset(max_ms):
            for i in range(1, 11):
                if getattr(V, f'i_P{i:02d}_ciclo_selector') == c:
                    setattr(V, f'b_P{i:02d}_ejec_prog', False)

    # Leer tiempos de ciclo actuales
    for c in range(1, 4):
        setattr(V, f'i_ciclo_{c}_mSeg', V.cycle_timers[c].read())

    # Evaluar ejecución por selector
    for i in range(1, 11):
        selector = getattr(V, f'i_P{i:02d}_ciclo_selector')
        ref_ms = getattr(V, f'i_P{i:02d}_ejec_prog_ref_mSeg')

        if selector == 0:
            # Ejecutar cada scan
            setattr(V, f'b_P{i:02d}_ejec_prog', True)
            setattr(V, f'b_P{i:02d}_ejec_prog_ant', False)
        elif 1 <= selector <= 3:
            cycle_ms = getattr(V, f'i_ciclo_{selector}_mSeg')
            if cycle_ms >= ref_ms:
                setattr(V, f'b_P{i:02d}_ejec_prog', True)

    # ─── 21. Reset tiempo de ejecución de programas ──────────────────────
    if V.b_reset_tiempo_ejec_prog:
        for p in ['PrA','PrB','P01','P02','P03','P04','P05','P06',
                   'P07','P08','P09','P10','PrY','PrZ']:
            setattr(V, f'i_{p}_duracion_mSeg', 0)
        V.b_reset_tiempo_ejec_prog = False

    # ─── 22. Reset primer_scan ───────────────────────────────────────────
    V.b_primer_scan = False

    # ─── Medir duración de prB ───────────────────────────────────────────
    V.i_PrB_duracion_mSeg = V.t_PrB_duracion.read()
    V.t_PrB_duracion.reset()
