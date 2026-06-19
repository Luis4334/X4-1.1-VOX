"""
═══════════════════════════════════════════════════════════════════════════════
  Orinoco SoftPLC — FASE 5: Prueba de Pozo
  Migrado de: P06_PRUE.LSF  (llamadas a F06A, F06B → stubs de logging)
═══════════════════════════════════════════════════════════════════════════════
"""

import logging

from global_vars import V
from function_blocks import int2msg
from plc_timers import TON as FB_TON

logger = logging.getLogger("orinoco.fase5.prueba")

# Timer de parada de prueba (1 s para validación)
_ton_PARADA = FB_TON()


# ─────────────────────────────────────────────────────────────────────────────
#  F06A — Histórico (stub: logging y/o base de datos)
# ─────────────────────────────────────────────────────────────────────────────
def f06a_historico():
    """
    Migrado de F06A_PRU.LSF.
    Guarda el registro histórico de la prueba.
    En la versión ISaGRAF escribía hacia la tabla de datos del PLC.
    En Python: emite un log estructurado (integreable con BD/SCADA).
    """
    logger.info(
        "HISTORICO | Prueba=%s | t=%ds | Q_L=%.2f | Q_C=%.2f | Q_W=%.2f | Q_gas=%.2f",
        V.as_Codigo_pozo_16,
        V.ad_TIEMPO_prueba[7],
        getattr(V, 'r_Qb_Liquido_sc', 0.0),
        getattr(V, 'r_Q_Crudo_sc', 0.0),
        getattr(V, 'r_Q_W_sc', 0.0),
        getattr(V, 'r_Q_gas_T_sc', 0.0),
    )


# ─────────────────────────────────────────────────────────────────────────────
#  F06B — Data (stub: empaqueta datos para reporte)
# ─────────────────────────────────────────────────────────────────────────────
def f06b_data():
    """
    Migrado de F06B_PRU.LSF.
    Empaqueta el snapshot de datos de proceso al momento de la prueba.
    """
    logger.info(
        "DATA | P_Gas=%.2f | T_Oil=%.2f | WC=%.2f | GVF=%.2f | API=%.2f",
        V.r_P_Gas, V.r_T_Oil_C, V.r_WC, V.r_GVoidF, V.r_API_2,
    )


# ═════════════════════════════════════════════════════════════════════════════
#  PROGRAMA PRINCIPAL p06_prueba
# ═════════════════════════════════════════════════════════════════════════════
def p06_prueba():
    """Migrado de P06_PRUE.LSF. Gestión del ciclo de prueba de pozo."""
    if not (V.b_P06_ejec_prog and not V.b_P06_ejec_prog_ant):
        return

    V.t_P06_duracion.reset()

    # Rung 0: reset de arrays de tiempo cuando no hay prueba ni parada
    if not V.b_Parada_en_Progreso and not V.b_Prueba_en_Progreso:
        for i in range(7):
            V.ad_TIEMPO_inicio_prueba[i] = 0
        for i in range(8):
            V.ad_TIEMPO_prueba[i] = 0
        for i in range(7):
            V.ad_TIEMPO_final_prueba[i] = 0

    # Rung 1: inicio de prueba
    #   Tipo 1 = manual (botón), Tipo 2 = automático (scan init), 0 = programado (reloj)
    cond_tipo1 = (V.r_TIPO_EQUIPO == 1.0) and V.b_PB_inicio_prueba
    cond_tipo2 = (not V.b_primer_scan
                  and V.b_AUX_T_ON_INICIO
                  and (V.r_TIPO_EQUIPO == 2.0))
    cond_reloj = (
        V.ad_CLOCK[0] != 0
        and V.ad_CLOCK[1] != 0
        and V.ad_CLOCK[2] != 0
        and V.ad_CLOCK[3] != 0
        and V.ad_CLOCK[4] != 0
        and V.ad_CLOCK[0] == V.ad_IHM_HORA_inicio[0]
        and V.ad_CLOCK[1] == V.ad_IHM_HORA_inicio[1]
        and V.ad_CLOCK[2] == V.ad_IHM_HORA_inicio[2]
        and V.ad_CLOCK[3] == V.ad_IHM_HORA_inicio[3]
        and V.ad_CLOCK[4] == V.ad_IHM_HORA_inicio[4]
    )
    disparo = cond_tipo1 or cond_tipo2 or cond_reloj
    if disparo and not V.b_Bit_0 and not V.b_Parada_en_Progreso:
        V.b_Prueba_en_Progreso = True
        V.i_ESTATUS = 1
        logger.info("Prueba iniciada — Código: %s", V.as_Codigo_pozo_16)
    V.b_Bit_0 = disparo  # ONS

    # Rung 2: incrementar número de prueba al finalizar (límite 500)
    parada_q = V.b_Parada_en_Progreso and _ton_PARADA.q and (V.i_Numero_Prueba <= 500)
    if parada_q and not V.b_Bit_1:
        V.i_Numero_Prueba += 1
    V.b_Bit_1 = parada_q  # ONS

    # Rung 3: abortar prueba (Tipo 1)
    if (V.r_TIPO_EQUIPO == 1.0) and (V.b_Parada_en_Progreso or V.b_IHM_Abortar_Prueba):
        V.b_Prueba_en_Progreso  = False
        V.b_PB_inicio_prueba    = False
        V.b_IHM_Abortar_Prueba  = False

    # Rung 4: condición de parada (tiempo máximo o botón parada)
    if V.r_TIPO_EQUIPO == 1.0:
        V.ad_IHM_TIEMPO_prueba[2] = V.ad_IHM_TIEMPO_prueba[3] * 3600
    cond_parada = (V.b_PB_parada_prueba and not V.b_Bit_5) or \
                  (V.ad_TIEMPO_prueba[7] >= V.ad_IHM_TIEMPO_prueba[2])
    if (V.r_TIPO_EQUIPO == 1.0) and V.b_Prueba_en_Progreso and cond_parada:
        V.b_Parada_en_Progreso = True
        V.i_ESTATUS = 3
        logger.info("Parada de prueba iniciada")
    V.b_Bit_5 = (V.r_TIPO_EQUIPO == 1.0) and V.b_Prueba_en_Progreso and V.b_PB_parada_prueba

    # Rung 5: timer de parada de 1 s
    cond_timer_parada = ((V.b_Parada_en_Progreso and V.b_IHM_Validar_Prueba)
                         or V.b_TIMER_Parada_de_Prueba) and not _ton_PARADA.q
    if cond_timer_parada:
        V.b_TIMER_Parada_de_Prueba = True
    else:
        V.b_TIMER_Parada_de_Prueba = False
    _ton_PARADA.execute(V.b_TIMER_Parada_de_Prueba, 1.0)

    # Rung 6: incremento durante parada a los 700 ms
    cond_700ms = (V.b_Parada_en_Progreso
                  and (_ton_PARADA.et >= 0.7)
                  and (V.i_Numero_Prueba <= 500))
    if cond_700ms and not V.b_Bit_2:
        V.i_Numero_Prueba += 1
    V.b_Bit_2 = cond_700ms  # ONS
    if V.i_Numero_Prueba < 1 or V.i_Numero_Prueba > 500:
        V.i_Numero_Prueba = 1

    # Rung 7: estado en reposo
    if not V.b_Prueba_en_Progreso and not V.b_Parada_en_Progreso:
        V.i_ESTATUS = 0
        V.i_Ultima_Prueba = (V.i_Numero_Prueba - 1
                             if V.i_Numero_Prueba >= 2 else 500)

    # Rung 8: terminar parada a los 700 ms
    if V.b_Parada_en_Progreso and _ton_PARADA.et >= 0.7:
        V.b_Parada_en_Progreso  = False
        V.b_PB_parada_prueba    = False
        V.b_IHM_Validar_Prueba  = False
        logger.info("Parada de prueba completada. Prueba #%d", V.i_Numero_Prueba)

    # Rung 9: capturar tiempo de inicio (ONS)
    if (V.r_TIPO_EQUIPO == 1.0) and V.b_Prueba_en_Progreso and not V.b_Bit_6:
        for i in range(7):
            V.ad_TIEMPO_inicio_prueba[i] = V.ad_CLOCK[i] if i < len(V.ad_CLOCK) else 0
    V.b_Bit_6 = (V.r_TIPO_EQUIPO == 1.0) and V.b_Prueba_en_Progreso  # ONS

    # Rung 10: calcular tiempo transcurrido
    if (V.r_TIPO_EQUIPO == 1.0) and V.b_Prueba_en_Progreso:
        for i in range(1, 7):
            src = V.ad_CLOCK[i] if i < len(V.ad_CLOCK) else 0
            ini = V.ad_TIEMPO_inicio_prueba[i]
            V.ad_TIEMPO_prueba[i] = src - ini

    # Rung 11: tiempo total en segundos
    V.ad_TIEMPO_prueba[7] = (V.ad_TIEMPO_prueba[2] * 86400
                             + V.ad_TIEMPO_prueba[3] * 3600
                             + V.ad_TIEMPO_prueba[4] * 60
                             + V.ad_TIEMPO_prueba[5])

    # Rung 12: desglose H:MM:SS
    t7 = float(V.ad_TIEMPO_prueba[7])
    if t7 > 0:
        horas  = t7 / 3600.0
        h_int  = int(horas)
        frac   = horas - h_int
        m_frac = frac * 60.0
        m_int  = int(m_frac)
        s_frac = (m_frac - m_int) * 60.0
        V.ar_TIEMPO_prueba_TOTAL[3] = float(h_int)
        V.ar_TIEMPO_prueba_TOTAL[4] = m_frac
        V.ar_TIEMPO_prueba_TOTAL[5] = float(m_int)
        V.ar_TIEMPO_prueba_TOTAL[6] = float(int(s_frac))

    # Rung 13-16: código de identificación y strings de fecha/hora (ONS)
    if (V.r_TIPO_EQUIPO == 1.0) and V.b_Prueba_en_Progreso and not V.b_Bit_8:
        V.as_Codigo_pozo_16 = (V.as_Codigo_pozo_19 + V.as_Codigo_pozo_01
                               + V.as_Codigo_pozo_15 + V.as_Codigo_pozo_01
                               + V.as_Codigo_pozo_03 + V.as_Codigo_pozo_01
                               + V.as_Codigo_pozo_06 + V.as_Codigo_pozo_08
                               + V.as_Codigo_pozo_01
                               + V.as_Codigo_pozo_11 + V.as_Codigo_pozo_13)
    V.b_Bit_8 = (V.r_TIPO_EQUIPO == 1.0) and V.b_Prueba_en_Progreso  # ONS

    # Rung 14: actualizar strings de número/fecha fuera de prueba
    if not V.b_Prueba_en_Progreso and not V.b_Parada_en_Progreso:
        V.as_Codigo_pozo_19 = int2msg(V.i_Numero_Prueba, 4)
        V.as_Codigo_pozo_11 = int2msg(V.ad_CLOCK[2], 2)
        V.as_Codigo_pozo_13 = int2msg(V.ad_CLOCK[1], 2)
        V.as_Codigo_pozo_15 = int2msg(V.ad_CLOCK[0], 4)

    # Rung 15: fecha de inicio (ONS)
    if (V.r_TIPO_EQUIPO == 1.0) and V.b_Prueba_en_Progreso and not V.b_Bit_10:
        d  = str(V.ad_CLOCK[2]).zfill(2)
        m  = str(V.ad_CLOCK[1]).zfill(2)
        y  = str(V.ad_CLOCK[0]).zfill(4)
        V.as_Fecha_Inicio_Prueba_4 = (d + V.as_Fecha_Inicio_Prueba_0
                                      + m + V.as_Fecha_Inicio_Prueba_0 + y)
    V.b_Bit_10 = (V.r_TIPO_EQUIPO == 1.0) and V.b_Prueba_en_Progreso  # ONS

    # Rung 16: hora de inicio (ONS)
    if (V.r_TIPO_EQUIPO == 1.0) and V.b_Prueba_en_Progreso and not V.b_Bit_11:
        hh = str(V.ad_CLOCK[3]).zfill(2)
        mm = str(V.ad_CLOCK[4]).zfill(2)
        ss = str(V.ad_CLOCK[5]).zfill(2)
        V.as_Hora_Inicio_Prueba_4 = (hh + V.as_Hora_Inicio_Prueba_0
                                     + mm + V.as_Hora_Inicio_Prueba_0 + ss)
    V.b_Bit_11 = (V.r_TIPO_EQUIPO == 1.0) and V.b_Prueba_en_Progreso  # ONS

    # Rung 17-18: subfunciones de historico y datos
    f06a_historico()
    f06b_data()

    # Asignaciones a variables finales
    for i in range(6):
        setattr(V, f'ad_TIEMPO_inicio_prueba_{i}', V.ad_TIEMPO_inicio_prueba[i])
    V.ar_TIEMPO_prueba_TOTAL_3 = V.ar_TIEMPO_prueba_TOTAL[3]
    V.ar_TIEMPO_prueba_TOTAL_5 = V.ar_TIEMPO_prueba_TOTAL[5]
    V.ar_TIEMPO_prueba_TOTAL_6 = V.ar_TIEMPO_prueba_TOTAL[6]

    # Parámetros de inicio automático
    V.i_TIEMPO_prueba_proy_H  = V.i_duracion_prueba_horas
    V.ad_IHM_TIEMPO_prueba[3] = V.i_duracion_prueba_horas
    for i in range(5):
        V.ad_IHM_HORA_inicio[i] = getattr(V, f'ad_IHM_HORA_inicio_{i}', 0)

    V.i_P06_duracion_mSeg = V.t_P06_duracion.read()
