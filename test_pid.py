"""
==========================================================
  MFM Orinoco — Script de Prueba del PID
  Uso: python test_pid.py  (mientras app.py esta corriendo)
==========================================================
Escenarios disponibles:
  1 → LIC-01: Nivel alto (80%) → SP=50% → LCV-01 debe abrir
  2 → PIC-01: Presion baja (12 PSI) → SP=70 PSI → PCV-01 debe abrir
  3 → Ambos lazos a la vez
  4 → Reset: deshabilitar lazos y volver a cero
  Q → Salir
"""

import time
import sys
import requests

BASE = "http://localhost:5000"
HEADERS = {"Content-Type": "application/json"}

BAR_WIDTH = 30

def bar(value, maxv=100):
    """Mini barra de progreso en texto."""
    pct = max(0.0, min(100.0, float(value)))
    filled = int((pct / maxv) * BAR_WIDTH)
    b = "█" * filled + "░" * (BAR_WIDTH - filled)
    return f"[{b}] {pct:6.2f}%"

def inject(payload: dict):
    r = requests.post(f"{BASE}/api/test/pid_inject", json=payload, timeout=3)
    return r.json()

def get_status():
    r = requests.get(f"{BASE}/api/test/pid_status", timeout=3)
    return r.json()

def monitor(seconds=30):
    """Monitorea PID cada 1 segundo durante N segundos."""
    print()
    print(f"  {'':=<68}")
    print(f"  {'MONITOR EN VIVO (Control+C para detener)':^68}")
    print(f"  {'':=<68}")
    header = (
        f"  {'t':>4s}  │"
        f"  {'LIC-01 (Nivel)':^38}  │"
        f"  {'PIC-01 (Presion)':^38}"
    )
    print(header)
    print(f"  {'':─<4}  ┼{'':─<42}┼{'':─<40}")
    subh = (
        f"  {'seg':>4s}  │  "
        f"{'PV%':>6}  SP%={'':<4}  {'CV%→LCV':^22}  │  "
        f"{'PV psi':>7}  SP={'':<4}  {'CV%→PCV':^22}"
    )
    print(subh)
    print(f"  {'':─<4}  ┼{'':─<42}┼{'':─<40}")

    try:
        for t in range(seconds):
            try:
                s = get_status()
            except Exception as e:
                print(f"  Error leyendo status: {e}")
                time.sleep(1)
                continue

            n_pv = s.get("nivel_PV", 0)
            n_sp = s.get("nivel_SP", 0)
            n_cv = s.get("nivel_CV", 0)
            p_pv = s.get("presion_PV", 0)
            p_sp = s.get("presion_SP", 0)
            p_cv = s.get("presion_CV", 0)
            lazos = "✅ ON" if s.get("lazos_habilitados") else "❌ OFF"

            # Barra de CV compacta
            cv_n_bar = "█" * int(n_cv / 5) + "░" * (20 - int(n_cv / 5))
            cv_p_bar = "█" * int(p_cv / 5) + "░" * (20 - int(p_cv / 5))

            # Color/emoji de error PID
            err_n = n_pv - n_sp
            err_p = p_pv - p_sp
            flag_n = "🔺" if err_n > 5 else ("🔻" if err_n < -5 else "✅")
            flag_p = "🔺" if err_p > 5 else ("🔻" if err_p < -5 else "✅")

            line = (
                f"  {t+1:>4d}  │  "
                f"PV={n_pv:5.1f}% SP={n_sp:4.1f}% {flag_n}  [{cv_n_bar}]{n_cv:5.1f}%  │  "
                f"PV={p_pv:5.1f} SP={p_sp:4.1f} {flag_p}  [{cv_p_bar}]{p_cv:5.1f}%  Lazos:{lazos}"
            )
            print(line)
            time.sleep(1)
    except KeyboardInterrupt:
        pass

    print(f"\n  Monitor detenido.")

def scenario_1():
    """LIC-01: Nivel alto → PID debe abrir LCV-01."""
    print("\n  🧪 ESCENARIO 1: Nivel en 80%, SP=50%, PID Nivel en Auto")
    print("     → LCV-01 (válvula de líquido) debe ABRIR para drenar el tanque")
    r = inject({
        "nivel": 80.0,
        "sp_nivel": 50.0,
        "kp_nivel": 1.2,
        "ki_nivel": 0.08,
        "nivel_auto": True,
        "presion_auto": False,   # Presión en Manual (no mover PCV)
        "habilitar_lazos": True,
    })
    print(f"     Inyección: {r.get('changes', {})}")
    monitor(seconds=30)

def scenario_2():
    """PIC-01: Presión baja → PID debe abrir PCV-01."""
    print("\n  🧪 ESCENARIO 2: Presión en 12 PSI, SP=70 PSI, PID Presión en Auto")
    print("     → PCV-01 (válvula de gas) debe ABRIR para bajar la presión")
    r = inject({
        "presion": 12.0,
        "sp_presion": 70.0,
        "kp_presion": 1.0,
        "ki_presion": 0.10,
        "nivel_auto": False,     # Nivel en Manual (no mover LCV)
        "presion_auto": True,
        "habilitar_lazos": True,
    })
    print(f"     Inyección: {r.get('changes', {})}")
    monitor(seconds=30)

def scenario_3():
    """Ambos lazos simultáneos."""
    print("\n  🧪 ESCENARIO 3: Ambos lazos activos")
    print("     Nivel=80% SP=50% (LCV abre) | Presión=12PSI SP=70PSI (PCV abre)")
    r = inject({
        "nivel": 80.0,
        "sp_nivel": 50.0,
        "kp_nivel": 1.2,
        "ki_nivel": 0.08,
        "nivel_auto": True,
        "presion": 12.0,
        "sp_presion": 70.0,
        "kp_presion": 1.0,
        "ki_presion": 0.10,
        "presion_auto": True,
        "habilitar_lazos": True,
    })
    print(f"     Inyección: {r.get('changes', {})}")
    monitor(seconds=40)

def reset_all():
    """Deshabilita lazos y pone todo en manual."""
    print("\n  🔄 Deshabilitando lazos y reseteando...")
    r = inject({
        "habilitar_lazos": False,
        "nivel_auto": False,
        "presion_auto": False,
    })
    print(f"     Reset: {r.get('changes', {})}")

def main():
    print()
    print("  ╔══════════════════════════════════════════════════════════╗")
    print("  ║   MFM ORINOCO — PRUEBA INTERACTIVA DEL PID              ║")
    print("  ║   Asegúrate de que app.py esté corriendo en puerto 5000 ║")
    print("  ╚══════════════════════════════════════════════════════════╝")
    print()

    # Verificar conexión
    try:
        s = get_status()
        print(f"  ✅ Conectado al SoftPLC — Lazos: {'ON' if s['lazos_habilitados'] else 'OFF'}")
        print(f"     Scan actual: {s['scan_ms']} ms")
        print(f"     Nivel actual (r_LIT_001): {s['nivel_PV']}%")
        print(f"     Presion actual (r_P_Gas): {s['presion_PV']} PSI")
    except Exception as e:
        print(f"  ❌ No se pudo conectar a app.py: {e}")
        print("     Asegúrate de que 'python app.py' está corriendo.")
        sys.exit(1)

    while True:
        print()
        print("  ─── MENU ────────────────────────────────────────────────")
        print("  [1] LIC-01: Nivel 80% → SP 50%  (LCV-01 debe abrir)     ")
        print("  [2] PIC-01: Presión 12PSI → SP 70PSI (PCV-01 debe abrir)")
        print("  [3] Ambos lazos a la vez                                  ")
        print("  [4] Reset → Deshabilitar lazos                           ")
        print("  [Q] Salir                                                 ")
        print("  ─────────────────────────────────────────────────────────")
        opcion = input("  Selecciona [1/2/3/4/Q]: ").strip().upper()

        if opcion == "1":
            scenario_1()
        elif opcion == "2":
            scenario_2()
        elif opcion == "3":
            scenario_3()
        elif opcion == "4":
            reset_all()
        elif opcion == "Q":
            reset_all()
            print("\n  👋 Prueba finalizada. Lazos deshabilitados.\n")
            break
        else:
            print("  Opción no válida. Intenta de nuevo.")

if __name__ == "__main__":
    main()
