"""
═══════════════════════════════════════════════════════════════════════════════
  Orinoco SoftPLC — FASE 7: Autodiagnóstico de Hardware
  Migrado de: P08_AUTO.LSF
  Convierte registros crudos de tarjetas de E/S a mA para diagnóstico.
═══════════════════════════════════════════════════════════════════════════════
"""

import logging
from global_vars import V

logger = logging.getLogger("orinoco.fase7.auto")


def _raw_to_mA_slot0(raw: int) -> float:
    """Slot 0/2: 0mA=0, 4mA=6553, 20mA=32767"""
    return (float(raw) - 6553.0) * 16.0 / 26214.0 + 4.0


def _raw_to_mA_slot1(raw: int) -> float:
    """Slot 1: 4mA=0, 20mA=32767"""
    return float(raw) * 16.0 / 32767.0 + 4.0


def p08_autodiagnostico():
    """Migrado de P08_AUTO.LSF. Convierte cuentas ADC a mA para diagnóstico."""
    if not (V.b_P08_ejec_prog and not V.b_P08_ejec_prog_ant):
        return

    V.t_P08_duracion.reset()

    # Slot 0 (6 canales): fórmula 0mA=0 / 4mA=6553 / 20mA=32767
    for ch in range(6):
        raw = getattr(V, f'ID0_{ch}', 0)
        setattr(V, f'r_ID0_{ch}_mA', _raw_to_mA_slot0(raw))

    # Slot 1 (8 canales): fórmula 4mA=0 / 20mA=32767
    for ch in range(8):
        raw = getattr(V, f'ID1_{ch}', 0)
        setattr(V, f'r_ID1_{ch}_mA', _raw_to_mA_slot1(raw))

    # Slot 2 (8 canales): misma fórmula que slot 0
    for ch in range(8):
        raw = getattr(V, f'ID2_{ch}', 0)
        setattr(V, f'r_ID2_{ch}_mA', _raw_to_mA_slot0(raw))

    V.i_P08_duracion_mSeg = V.t_P08_duracion.read()
