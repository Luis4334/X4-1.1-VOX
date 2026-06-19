"""
===============================================================================
  Orinoco SoftPLC — Temporizadores IEC 61131-3
===============================================================================
  Implementa TON (Timer On-Delay), TOF (Timer Off-Delay), TP (Timer Pulse)
  equivalentes a los usados en ISaGRAF.

  ISaGRAF usa temporizadores con resolución de milisegundos:
    ton_aaaaa(b_aaaaa_ton, t#30s)   →  TON con preset de 30 segundos
    ton_aaaaa.q                     →  Salida (True cuando tiempo alcanzado)
    ton_aaaaa.et                    →  Elapsed Time (tiempo transcurrido)
===============================================================================
"""

import time


class TON:
    """
    Timer On-Delay (TON) — IEC 61131-3
    
    Cuando la entrada IN pasa a True, comienza a contar.
    Cuando el tiempo transcurrido alcanza el preset PT, la salida Q pasa a True.
    Si IN vuelve a False, se resetea inmediatamente.
    
    Uso ISaGRAF original:
        ton_aaaaa(b_aaaaa_ton, t#30s) ;
        if ton_aaaaa.q then ... end_if ;
        t_aaaaa := ton_aaaaa.et ;
    
    Uso Python:
        ton_aaaaa = TON()
        ton_aaaaa.execute(b_aaaaa_ton, 30.0)
        if ton_aaaaa.q: ...
        t_aaaaa_ms = ton_aaaaa.et_ms
    """

    def __init__(self):
        self.q: bool = False          # Salida: True cuando IN=True y ET >= PT
        self.et: float = 0.0          # Elapsed time en segundos
        self.et_ms: int = 0           # Elapsed time en milisegundos (compatible ISaGRAF ANA())
        self._start_time: float = 0.0
        self._running: bool = False
        self._preset: float = 0.0

    def execute(self, in_signal: bool, pt_seconds: float) -> None:
        """
        Ejecutar un ciclo del temporizador.
        
        Args:
            in_signal: Señal de entrada (equivale al primer parámetro del TON en ISaGRAF)
            pt_seconds: Tiempo de preset en segundos (equivale a t#Xs en ISaGRAF)
        """
        self._preset = pt_seconds

        if in_signal:
            if not self._running:
                # Flanco de subida — iniciar conteo
                self._start_time = time.monotonic()
                self._running = True
                self.q = False

            # Calcular tiempo transcurrido
            self.et = time.monotonic() - self._start_time
            self.et_ms = int(self.et * 1000)

            # Verificar si alcanzó el preset
            if self.et >= self._preset:
                self.q = True
                self.et = self._preset
                self.et_ms = int(self._preset * 1000)
        else:
            # IN es False — resetear
            self._running = False
            self.q = False
            self.et = 0.0
            self.et_ms = 0

    def reset(self) -> None:
        """Resetear el temporizador manualmente."""
        self._running = False
        self.q = False
        self.et = 0.0
        self.et_ms = 0


class TOF:
    """
    Timer Off-Delay (TOF) — IEC 61131-3
    
    Cuando la entrada IN pasa a False, comienza a contar.
    La salida Q permanece True durante el tiempo PT después de que IN pase a False.
    """

    def __init__(self):
        self.q: bool = False
        self.et: float = 0.0
        self.et_ms: int = 0
        self._start_time: float = 0.0
        self._running: bool = False
        self._preset: float = 0.0
        self._prev_in: bool = False

    def execute(self, in_signal: bool, pt_seconds: float) -> None:
        self._preset = pt_seconds

        if in_signal:
            self.q = True
            self.et = 0.0
            self.et_ms = 0
            self._running = False
        else:
            if self._prev_in and not in_signal:
                # Flanco de bajada — iniciar conteo
                self._start_time = time.monotonic()
                self._running = True

            if self._running:
                self.et = time.monotonic() - self._start_time
                self.et_ms = int(self.et * 1000)

                if self.et >= self._preset:
                    self.q = False
                    self._running = False
                    self.et = self._preset
                    self.et_ms = int(self._preset * 1000)
                else:
                    self.q = True

        self._prev_in = in_signal


class TP:
    """
    Timer Pulse (TP) — IEC 61131-3
    
    Genera un pulso de duración fija PT cuando IN tiene un flanco de subida.
    """

    def __init__(self):
        self.q: bool = False
        self.et: float = 0.0
        self.et_ms: int = 0
        self._start_time: float = 0.0
        self._running: bool = False
        self._preset: float = 0.0
        self._prev_in: bool = False

    def execute(self, in_signal: bool, pt_seconds: float) -> None:
        self._preset = pt_seconds

        if in_signal and not self._prev_in and not self._running:
            # Flanco de subida — iniciar pulso
            self._start_time = time.monotonic()
            self._running = True
            self.q = True

        if self._running:
            self.et = time.monotonic() - self._start_time
            self.et_ms = int(self.et * 1000)

            if self.et >= self._preset:
                self.q = False
                self._running = False
                self.et = self._preset
                self.et_ms = int(self._preset * 1000)

        self._prev_in = in_signal


class ScanTimer:
    """
    Temporizador especial para medir el tiempo de un scan del PLC.
    
    En ISaGRAF:
        i_PLC_scan_mSeg := ANA(t_PLC_scan) ;
        t_PLC_scan := t#0s ;
    
    Equivale a medir cuánto tardó el ciclo anterior.
    """

    def __init__(self):
        self._last_reset: float = time.monotonic()
        self.elapsed_ms: int = 0

    def read_and_reset(self) -> int:
        """Lee el tiempo transcurrido y resetea el temporizador. Retorna ms."""
        now = time.monotonic()
        self.elapsed_ms = int((now - self._last_reset) * 1000)
        self._last_reset = now
        return self.elapsed_ms

    def read(self) -> int:
        """Lee el tiempo transcurrido sin resetear. Retorna ms."""
        now = time.monotonic()
        self.elapsed_ms = int((now - self._last_reset) * 1000)
        return self.elapsed_ms

    def reset(self) -> None:
        """Resetea el temporizador."""
        self._last_reset = time.monotonic()
        self.elapsed_ms = 0


class CycleTimer:
    """
    Temporizador para gestionar los ciclos de ejecución configurables.
    
    En ISaGRAF se usan 3 ciclos independientes con sus propios temporizadores:
        i_ciclo_1_mSeg := ANA(t_ciclo_1) ;   -- Ciclo rápido
        i_ciclo_2_mSeg := ANA(t_ciclo_2) ;   -- Ciclo medio
        i_ciclo_3_mSeg := ANA(t_ciclo_3) ;   -- Ciclo lento
    
    Cada programa (P01..P10) puede asignarse a un ciclo diferente.
    """

    def __init__(self):
        self._start_time: float = time.monotonic()
        self.elapsed_ms: int = 0

    def read(self) -> int:
        """Lee ms transcurridos desde último reset."""
        self.elapsed_ms = int((time.monotonic() - self._start_time) * 1000)
        return self.elapsed_ms

    def reset(self) -> None:
        """Resetea el temporizador de ciclo (equivale a t_ciclo_X := t#0s)."""
        self._start_time = time.monotonic()
        self.elapsed_ms = 0

    def check_and_reset(self, max_ms: int) -> bool:
        """
        Verifica si el ciclo excedió el máximo y resetea si es así.
        Retorna True si hubo reset.
        """
        self.read()
        if self.elapsed_ms > max_ms:
            self.reset()
            return True
        return False
