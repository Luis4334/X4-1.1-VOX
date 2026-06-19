"""
Orinoco SoftPLC — Motor de Scan (Scan Engine)
Equivale al ciclo principal del PLC ISaGRAF VP-25W6.

Ejecuta todas las fases secuencialmente en cada ciclo:
  Fase 1: prA_sistema → prB_inicio          ✅ MIGRADO
  Fase 2: p01_general → p02_entradas        ✅ MIGRADO
  Fase 3a: p03_densidad                     ✅ MIGRADO
  Fase 3b: p04_caudal                       ✅ MIGRADO
  Fase 4:  p05_main (F05A-F05F)             ✅ MIGRADO
  Fase 5:  p06_prueba                       ✅ MIGRADO
  Fase 6:  p07_pid                          ✅ MIGRADO
  Fase 7:  p08_autodiagnostico              ✅ MIGRADO
  Fase 8:  p09_salidas                      ✅ MIGRADO
  Fase 9:  p10_mejoras                      ✅ MIGRADO
  Cierre:  prY_valores → prZ_fin            ✅ MIGRADO
"""

import time
import logging
import threading
from datetime import datetime

from global_vars import V
from config import SCAN_CYCLE_TARGET_MS

# ── Módulos migrados: todas las fases ──
from fase1_sistema  import prA_sistema, prB_inicio, save_retained_vars
from fase2_entradas import p01_general, p02_entradas
from fase3_densidad import p03_densidad
from fase3_caudal   import p04_caudal
from fase4_main     import p05_main
from fase5_prueba   import p06_prueba
from fase6_pid      import p07_pid
from fase7_auto     import p08_autodiagnostico
from fase8_salidas  import p09_salidas
from fase9_mejora   import p10_mejoras

logger = logging.getLogger("orinoco.engine")


class ScanEngine:
    """Motor de ciclo de scan del SoftPLC."""

    def __init__(self):
        self.running = False
        self.scan_count = 0
        self.scan_time_ms = 0
        self.max_scan_time_ms = 0
        self.avg_scan_time_ms = 0.0
        self._total_scan_time = 0
        self._stop_event = threading.Event()
        self._phase_functions = []

    def register_phases(self, phase_list: list):
        self._phase_functions = phase_list
        logger.info(f"Registradas {len(phase_list)} fases de ejecución")

    def start(self):
        """Iniciar el motor de scan en un hilo separado."""
        self.running = True
        self._stop_event.clear()
        self._thread = threading.Thread(target=self._scan_loop, daemon=True, name="ScanEngine")
        self._thread.start()
        logger.info("═" * 60)
        logger.info("  ORINOCO SoftPLC — Motor de Scan INICIADO")
        logger.info(f"  Ciclo objetivo: {SCAN_CYCLE_TARGET_MS} ms")
        logger.info(f"  Fases registradas: {len(self._phase_functions)}")
        logger.info("═" * 60)

    def stop(self):
        """Detener el motor de scan y guardar variables retenidas."""
        self.running = False
        self._stop_event.set()
        if hasattr(self, '_thread'):
            self._thread.join(timeout=5.0)
        # Guardar variables retenidas al apagar
        try:
            save_retained_vars()
        except Exception as e:
            logger.error(f"Error guardando variables retenidas: {e}")
        logger.info("Motor de Scan DETENIDO")
        logger.info(f"  Scans: {self.scan_count} | Max: {self.max_scan_time_ms}ms | Avg: {self.avg_scan_time_ms:.1f}ms")

    def _scan_loop(self):
        """Loop principal del PLC — equivale al scan cycle de ISaGRAF."""
        target_period = SCAN_CYCLE_TARGET_MS / 1000.0

        while self.running and not self._stop_event.is_set():
            scan_start = time.monotonic()
            try:
                self._execute_one_scan()
            except Exception as e:
                logger.error(f"ERROR en scan #{self.scan_count}: {e}", exc_info=True)

            elapsed = time.monotonic() - scan_start
            self.scan_time_ms = int(elapsed * 1000)
            V.i_PLC_scan_mSeg = self.scan_time_ms
            self.scan_count += 1
            self._total_scan_time += self.scan_time_ms
            if self.scan_time_ms > self.max_scan_time_ms:
                self.max_scan_time_ms = self.scan_time_ms
            if self.scan_count > 0:
                self.avg_scan_time_ms = self._total_scan_time / self.scan_count

            sleep_time = target_period - elapsed
            if sleep_time > 0:
                self._stop_event.wait(sleep_time)

    def _execute_one_scan(self):
        """Ejecutar un ciclo completo de todas las fases."""
        for phase_name, phase_func in self._phase_functions:
            try:
                phase_func()
            except Exception as e:
                logger.error(f"Error en fase '{phase_name}': {e}", exc_info=True)

    def get_status(self) -> dict:
        return {
            "running": self.running,
            "scan_count": self.scan_count,
            "scan_time_ms": self.scan_time_ms,
            "max_scan_time_ms": self.max_scan_time_ms,
            "avg_scan_time_ms": round(self.avg_scan_time_ms, 1),
            "protection": V.b_BIT_PROTECTION,
            "nivel": round(V.r_LIT_001, 2),
            "presion_gas": round(V.r_P_Gas, 2),
            "temp_oil": round(V.r_T_Oil_C, 2),
            "datetime": datetime.now().isoformat(),
        }


# ─────────────────────────────────────────────────────────────────────────────
#  Funciones de cierre de ciclo (siempre presentes)
# ─────────────────────────────────────────────────────────────────────────────

def prY_valores():
    """Mapeo final de variables para display/SCADA (PRY_VALO.LSF)."""
    V.t_PrY_duracion.reset()
    # Espejo de estados para IHM
    V.i_PrY_duracion_mSeg = V.t_PrY_duracion.read()


def prZ_fin():
    """Cierre de ciclo (PRZ_FIN.LSF) — actualiza flags ANT."""
    V.t_PrZ_duracion.reset()
    V.b_primer_scan             = False
    V.b_fijar_valores_defecto   = False
    V.i_systim_r1_ss_ant        = V.i_systim_r1_ss
    V.i_systim_r1_mm_ant        = V.i_systim_r1_mm
    # Actualizar _ant de todos los programas
    V.b_P03_ejec_prog_ant = V.b_P03_ejec_prog
    V.b_P04_ejec_prog_ant = V.b_P04_ejec_prog
    V.b_P05_ejec_prog_ant = V.b_P05_ejec_prog
    V.b_P06_ejec_prog_ant = V.b_P06_ejec_prog
    V.b_P07_ejec_prog_ant = V.b_P07_ejec_prog
    V.b_P08_ejec_prog_ant = V.b_P08_ejec_prog
    V.b_P09_ejec_prog_ant = V.b_P09_ejec_prog
    V.b_P10_ejec_prog_ant = V.b_P10_ejec_prog
    V.i_PrZ_duracion_mSeg = V.t_PrZ_duracion.read()


# ═════════════════════════════════════════════════════════════════════════════
#  Registro de fases en orden de ejecución (todas migradas)
# ═════════════════════════════════════════════════════════════════════════════

PHASE_REGISTRY = [
    # ── Fase 1: Sistema y Comunicaciones ✅ ──
    ("prA_sistema",         prA_sistema),
    ("prB_inicio",          prB_inicio),
    # ── Fase 2: Lectura de Hardware ✅ ──
    ("p01_general",         p01_general),
    ("p02_entradas",        p02_entradas),
    # ── Fase 3: Cálculos de Ingeniería ✅ ──
    ("p03_densidad",        p03_densidad),
    ("p04_caudal",          p04_caudal),
    # ── Fase 4: Lógica de Control ✅ ──
    ("p05_main",            p05_main),
    # ── Fase 5: Prueba de Pozo ✅ ──
    ("p06_prueba",          p06_prueba),
    # ── Fase 6: PID ✅ ──
    ("p07_pid",             p07_pid),
    # ── Fase 7: Autodiagnóstico ✅ ──
    ("p08_autodiagnostico", p08_autodiagnostico),
    # ── Fase 8: Salidas ✅ ──
    ("p09_salidas",         p09_salidas),
    # ── Fase 9: Mejoras IPR/PVT ✅ ──
    ("p10_mejoras",         p10_mejoras),
    # ── Cierre de Ciclo ✅ ──
    ("prY_valores",         prY_valores),
    ("prZ_fin",             prZ_fin),
]
