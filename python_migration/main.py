"""
═══════════════════════════════════════════════════════════════════════════════
  Orinoco SoftPLC — Entry Point
═══════════════════════════════════════════════════════════════════════════════
  Migración de ISaGRAF PLC (VP-25W6) a Python con tarjeta DAQ.
  Proyecto: PetroIndependencia Macolla 2 — Vox Analyzer
  
  Uso:
    python main.py              → Iniciar SoftPLC
    python main.py --simulate   → Modo simulación (sin DAQ real)
    python main.py --debug      → Modo debug con logging verbose
═══════════════════════════════════════════════════════════════════════════════
"""

import sys
import os
import signal
import logging
import time
import argparse

# Agregar path del proyecto
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from scan_engine import ScanEngine, PHASE_REGISTRY
from global_vars import V


def setup_logging(debug: bool = False):
    """Configurar logging del sistema."""
    level = logging.DEBUG if debug else logging.INFO
    fmt = "%(asctime)s [%(levelname)7s] %(name)-20s │ %(message)s"
    logging.basicConfig(level=level, format=fmt, datefmt="%H:%M:%S")
    logging.getLogger("orinoco").setLevel(level)


def print_banner():
    """Banner de inicio del sistema."""
    print("""
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║   ██████  ██████  ██ ███    ██  ██████   ██████  ██████      ║
║  ██    ██ ██   ██ ██ ████   ██ ██    ██ ██      ██    ██     ║
║  ██    ██ ██████  ██ ██ ██  ██ ██    ██ ██      ██    ██     ║
║  ██    ██ ██   ██ ██ ██  ██ ██ ██    ██ ██      ██    ██     ║
║   ██████  ██   ██ ██ ██   ████  ██████   ██████  ██████      ║
║                                                              ║
║  SoftPLC v0.1.0 — Migración ISaGRAF → Python/DAQ            ║
║  PetroIndependencia Macolla 2 — Vox Analyzer                 ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
""")


def print_status(engine: ScanEngine):
    """Mostrar estado periódico del SoftPLC."""
    status = engine.get_status()
    print(f"\r  Scan #{status['scan_count']:>8d} │ "
          f"Ciclo: {status['scan_time_ms']:>4d} ms │ "
          f"Max: {status['max_scan_time_ms']:>4d} ms │ "
          f"Avg: {status['avg_scan_time_ms']:>6.1f} ms │ "
          f"Protección: {'✓' if status['protection'] else '✗'} │ "
          f"{status['datetime'][11:19]}",
          end='', flush=True)


def main():
    parser = argparse.ArgumentParser(description="Orinoco SoftPLC")
    parser.add_argument('--simulate', action='store_true', help='Modo simulación sin DAQ')
    parser.add_argument('--debug', action='store_true', help='Logging verbose')
    args = parser.parse_args()

    setup_logging(args.debug)
    print_banner()
    logger = logging.getLogger("orinoco.main")

    # Configurar modo simulación
    if args.simulate:
        V.b_simular_ai = True
        logger.info("MODO SIMULACIÓN activado — sin hardware DAQ")

    # Crear e inicializar el motor de scan
    engine = ScanEngine()
    engine.register_phases(PHASE_REGISTRY)

    # Manejar señales de terminación
    def signal_handler(sig, frame):
        print("\n")
        logger.info("Señal de terminación recibida — cerrando...")
        engine.stop()
        sys.exit(0)

    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)

    # Iniciar el motor
    engine.start()

    # Loop de monitoreo en el hilo principal
    try:
        while engine.running:
            time.sleep(2.0)
            print_status(engine)
    except KeyboardInterrupt:
        pass
    finally:
        engine.stop()
        print("\n\n  Orinoco SoftPLC finalizado correctamente.\n")


if __name__ == "__main__":
    main()
