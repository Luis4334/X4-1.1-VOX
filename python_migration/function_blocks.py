"""
===============================================================================
  Orinoco SoftPLC — Bloques de Función (Function Blocks)
===============================================================================
  Equivalentes Python de los bloques de función ISaGRAF:
  - FB_SCL   : Escalamiento lineal (Scale)
  - FB_HLL   : High/Low Limiter (Limitador Alto/Bajo)
  - FB_DIV   : División segura (sin división por cero)
  - FB_SEL   : Selector de 2 valores
  - FB_BNOT  : Negador booleano
  - FB_MOVEV : Mover valor (real)
  - FB_MOVES : Mover string
  - FB_ALARM : Alarma de 4 niveles (LL, L, H, HH) con histéresis y retardo
  - FB_PIDE  : Controlador PID Enhanced
  - FB_FILT_C: Filtro de caracteres
  
  Cada bloque es una clase con estado persistente (como en ISaGRAF).
===============================================================================
"""

import math
import time


# =============================================================================
#  FB_SCL — Escalamiento Lineal
# =============================================================================

class FB_SCL:
    """
    Escalamiento lineal. Convierte un valor de un rango a otro.
    
    ISaGRAF original (FB_SCL.LSF):
        r_Out := (r_InEUMax - r_InEUMin) * (r_In - r_InRawMin) 
                 / (r_InRawMax - r_InRawMin) + r_InEUMin ;
    """

    def __init__(self):
        self.r_Out: float = 0.0

    def execute(self, r_In: float, r_InRawMin: float, r_InRawMax: float,
                r_InEUMin: float, r_InEUMax: float) -> float:
        divisor = r_InRawMax - r_InRawMin
        if divisor != 0.0:
            self.r_Out = (r_InEUMax - r_InEUMin) * (r_In - r_InRawMin) / divisor + r_InEUMin
        else:
            self.r_Out = r_InEUMin
        return self.r_Out


def scale(value: float, raw_min: float, raw_max: float,
          eu_min: float, eu_max: float) -> float:
    """
    Función de escalamiento estática (shortcut para FB_SCL).
    Equivale al bloque fb_SCL en ISaGRAF.
    """
    divisor = raw_max - raw_min
    if divisor != 0.0:
        return (eu_max - eu_min) * (value - raw_min) / divisor + eu_min
    return eu_min


# =============================================================================
#  FB_HLL — High/Low Limiter
# =============================================================================

class FB_HLL:
    """
    Limitador Alto/Bajo. Recorta un valor entre límites.
    
    ISaGRAF original (FB_HLL.LSF):
        if r_In < r_LowLimit then r_Out := r_LowLimit ;
        elsif r_In > r_HighLimit then r_Out := r_HighLimit ;
        else r_Out := r_In ;
    """

    def __init__(self):
        self.r_Out: float = 0.0

    def execute(self, r_In: float, r_LowLimit: float, r_HighLimit: float) -> float:
        if r_In < r_LowLimit:
            self.r_Out = r_LowLimit
        elif r_In > r_HighLimit:
            self.r_Out = r_HighLimit
        else:
            self.r_Out = r_In
        return self.r_Out


def clamp(value: float, low: float, high: float) -> float:
    """Función limitadora estática (shortcut para FB_HLL)."""
    return max(low, min(high, value))


# =============================================================================
#  FB_DIV — División Segura
# =============================================================================

class FB_DIV:
    """
    División segura. Retorna 0 si el divisor es cero.
    
    ISaGRAF original (FB_DIV.LSF):
        if r_In2 <> 0.0 then r_Out := r_In1 / r_In2 ;
        else r_Out := 0.0 ;
    """

    def __init__(self):
        self.r_Out: float = 0.0

    def execute(self, r_In1: float, r_In2: float) -> float:
        if r_In2 != 0.0:
            self.r_Out = r_In1 / r_In2
        else:
            self.r_Out = 0.0
        return self.r_Out


def safe_div(numerator: float, denominator: float, default: float = 0.0) -> float:
    """División segura estática."""
    return numerator / denominator if denominator != 0.0 else default


# =============================================================================
#  FB_SEL — Selector
# =============================================================================

class FB_SEL:
    """
    Selector de 2 valores basado en un booleano.
    
    ISaGRAF original (FB_SEL.LSF):
        if b_Sel then r_Out := r_In2 ;
        else r_Out := r_In1 ;
    """

    def __init__(self):
        self.r_Out: float = 0.0

    def execute(self, r_In1: float, r_In2: float, b_Sel: bool) -> float:
        self.r_Out = r_In2 if b_Sel else r_In1
        return self.r_Out


# =============================================================================
#  FB_BNOT — Negador Booleano
# =============================================================================

class FB_BNOT:
    """
    Negador booleano.
    
    ISaGRAF original (FB_BNOT.LSF):
        b_Out := NOT b_In ;
    """

    def __init__(self):
        self.b_Out: bool = False

    def execute(self, b_In: bool) -> bool:
        self.b_Out = not b_In
        return self.b_Out


# =============================================================================
#  FB_MOVEV — Mover Valor Real
# =============================================================================

class FB_MOVEV:
    """
    Mueve un valor real a múltiples destinos (pattern de ISaGRAF).
    
    En Python simplemente asignamos, pero mantenemos la interfaz 
    para compatibilidad con la lógica migrada.
    """

    def __init__(self):
        self.r_Out: float = 0.0

    def execute(self, r_In: float) -> float:
        self.r_Out = r_In
        return self.r_Out


# =============================================================================
#  FB_ALARM — Alarma de 4 Niveles con Histéresis
# =============================================================================

class FB_ALARM:
    """
    Alarma de 4 niveles (LL, L, H, HH) con histéresis y retardo temporal.
    
    ISaGRAF original (FB_ALARM.LSF):
    Parámetros de entrada:
        r_IN        → Valor de proceso
        r_LL_LIMIT  → Límite Low-Low
        r_L_LIMIT   → Límite Low
        r_H_LIMIT   → Límite High
        r_HH_LIMIT  → Límite High-High
        r_DB        → Deadband (histéresis)
        r_TIME_seg  → Retardo de activación en segundos
    
    Salidas:
        b_ALL → Alarma Low-Low activa
        b_AL  → Alarma Low activa
        b_AH  → Alarma High activa
        b_AHH → Alarma High-High activa
    """

    def __init__(self):
        # Salidas
        self.b_ALL: bool = False
        self.b_AL: bool = False
        self.b_AH: bool = False
        self.b_AHH: bool = False

        # Estado interno para retardos
        self._b_AHH_temp: bool = False
        self._b_AH_temp: bool = False
        self._b_AL_temp: bool = False
        self._b_ALL_temp: bool = False

        # Tiempos de referencia para retardos
        self._time_HH_ref: float = 0.0
        self._time_H_ref: float = 0.0
        self._time_L_ref: float = 0.0
        self._time_LL_ref: float = 0.0

        self._time_HH_tracking: bool = False
        self._time_H_tracking: bool = False
        self._time_L_tracking: bool = False
        self._time_LL_tracking: bool = False

    def execute(self, r_IN: float, r_LL_LIMIT: float, r_L_LIMIT: float,
                r_H_LIMIT: float, r_HH_LIMIT: float,
                r_DB: float = 0.0, r_TIME_seg: float = 2.0) -> None:
        """
        Ejecutar un ciclo de evaluación de alarmas.
        """
        now = time.monotonic()
        delay = r_TIME_seg

        # --- Alarma HH (High-High) ---
        if r_IN >= r_HH_LIMIT:
            if not self._time_HH_tracking:
                self._time_HH_ref = now
                self._time_HH_tracking = True
            if (now - self._time_HH_ref) >= delay:
                self._b_AHH_temp = True
        else:
            self._time_HH_tracking = False

        if self._b_AHH_temp and r_IN < (r_HH_LIMIT - r_DB):
            self._b_AHH_temp = False
        self.b_AHH = self._b_AHH_temp

        # --- Alarma H (High) ---
        if r_IN >= r_H_LIMIT:
            if not self._time_H_tracking:
                self._time_H_ref = now
                self._time_H_tracking = True
            if (now - self._time_H_ref) >= delay:
                self._b_AH_temp = True
        else:
            self._time_H_tracking = False

        if self._b_AH_temp and r_IN < (r_H_LIMIT - r_DB):
            self._b_AH_temp = False
        self.b_AH = self._b_AH_temp

        # --- Alarma L (Low) ---
        if r_IN <= r_L_LIMIT:
            if not self._time_L_tracking:
                self._time_L_ref = now
                self._time_L_tracking = True
            if (now - self._time_L_ref) >= delay:
                self._b_AL_temp = True
        else:
            self._time_L_tracking = False

        if self._b_AL_temp and r_IN > (r_L_LIMIT + r_DB):
            self._b_AL_temp = False
        self.b_AL = self._b_AL_temp

        # --- Alarma LL (Low-Low) ---
        if r_IN <= r_LL_LIMIT:
            if not self._time_LL_tracking:
                self._time_LL_ref = now
                self._time_LL_tracking = True
            if (now - self._time_LL_ref) >= delay:
                self._b_ALL_temp = True
        else:
            self._time_LL_tracking = False

        if self._b_ALL_temp and r_IN > (r_LL_LIMIT + r_DB):
            self._b_ALL_temp = False
        self.b_ALL = self._b_ALL_temp

    def reset(self) -> None:
        """Resetear todas las alarmas."""
        self.b_ALL = False
        self.b_AL = False
        self.b_AH = False
        self.b_AHH = False
        self._b_AHH_temp = False
        self._b_AH_temp = False
        self._b_AL_temp = False
        self._b_ALL_temp = False
        self._time_HH_tracking = False
        self._time_H_tracking = False
        self._time_L_tracking = False
        self._time_LL_tracking = False


# =============================================================================
#  FB_PIDE — Controlador PID Enhanced
# =============================================================================

class FB_PIDE:
    """
    Controlador PID Enhanced (Proporcional + Integral + Derivativo).
    
    ISaGRAF original (FB_PIDE.LSF):
    Parámetros:
        r_PV              → Process Variable (valor medido)
        b_ControlAction   → True=Directo, False=Inverso
        b_ProgOverrideReq → True=Modo Override (forzar salida)
        b_OperAutoReq     → True=Automático, False=Manual
        b_OperManualReq   → (No usado en original)
        r_SP              → Setpoint
        r_CVOverride      → Valor de Override para la salida
        r_CVOper          → Valor Manual del operador
        r_KP              → Ganancia Proporcional
        r_KI              → Ganancia Integral
        r_KD              → Ganancia Derivativa (no usado en original)
        t_TS              → Tiempo de muestreo (reservado)
        r_FI_in           → Factor Integrativo de entrada
    
    Salidas:
        r_CVEU   → Variable Controlada en EU (0-100%)
        r_FI_out → Factor Integrativo de salida
    
    NOTA: La ejecución original se hace cada 1 segundo (i_systim_r1_ss_ant <> i_systim_r1_ss).
    En Python, el scan_engine controla la frecuencia de ejecución.
    """

    def __init__(self):
        self.r_CVEU: float = 0.0      # Variable controlada (salida 0-100%)
        self.r_FI_out: float = 0.0     # Factor integrativo de salida
        self._last_exec: float = 0.0
        self._exec_interval: float = 1.0  # 1 segundo como en ISaGRAF

    def execute(self, r_PV: float, b_ControlAction: bool,
                b_ProgOverrideReq: bool, b_OperAutoReq: bool,
                b_OperManualReq: bool, r_SP: float,
                r_CVOverride: float, r_CVOper: float,
                r_KP: float, r_KI: float, r_KD: float,
                t_TS_seconds: float, r_FI_in: float) -> None:
        """
        Ejecutar un ciclo del PID.
        
        Replica exactamente la lógica de FB_PIDE.LSF.
        Se ejecuta solo si ha pasado al menos 1 segundo desde la última ejecución.
        """
        now = time.monotonic()
        if (now - self._last_exec) < self._exec_interval:
            return  # No ejecutar hasta que pase 1 segundo
        self._last_exec = now

        # Cálculo del error
        if b_ControlAction:
            r_pid_error = r_PV - r_SP    # Acción directa
        else:
            r_pid_error = r_SP - r_PV    # Acción inversa

        # Cálculo del Factor Integrativo
        if b_ProgOverrideReq:
            # Modo Override
            self.r_FI_out = r_CVOverride - r_KP * r_pid_error
        else:
            if b_OperAutoReq:
                # Modo Automático
                self.r_FI_out = r_FI_in + r_KI * r_pid_error
            else:
                # Modo Manual
                self.r_FI_out = r_CVOper - r_KP * r_pid_error

        # Cálculo de la Variable Controlada
        if b_ProgOverrideReq:
            # Modo Override
            self.r_CVEU = r_CVOverride
        else:
            if b_OperAutoReq:
                # Modo Automático
                cv_raw = r_KP * r_pid_error + r_FI_in + r_KI * r_pid_error
                self.r_CVEU = cv_raw

                # Anti-windup: Limitar salida entre 0% y 100%
                if cv_raw < 0.0:
                    self.r_FI_out = 0.0 - r_KP * r_pid_error - r_KI * r_pid_error
                    self.r_CVEU = 0.0
                elif cv_raw > 100.0:
                    self.r_FI_out = 100.0 - r_KP * r_pid_error - r_KI * r_pid_error
                    self.r_CVEU = 100.0
            else:
                # Modo Manual
                self.r_CVEU = r_CVOper

    def reset(self) -> None:
        """Resetear el PID."""
        self.r_CVEU = 0.0
        self.r_FI_out = 0.0
        self._last_exec = 0.0


# =============================================================================
#  FB_FILT_C — Filtro de Caracteres
# =============================================================================

class FB_FILT_C:
    """
    Filtro de caracteres ASCII. Remueve caracteres fuera del rango especificado.
    
    ISaGRAF original (F_FILT_C.LSF):
        Filtra un string dejando solo caracteres entre char_min y char_max.
    """

    @staticmethod
    def execute(s_input: str, char_min: int = 32, char_max: int = 125) -> str:
        """
        Filtra caracteres de un string.
        
        Args:
            s_input: String a filtrar
            char_min: Código ASCII mínimo permitido (default: 32 = espacio)
            char_max: Código ASCII máximo permitido (default: 125 = '}')
        
        Returns:
            String filtrado con solo caracteres dentro del rango
        """
        return ''.join(c for c in s_input if char_min <= ord(c) <= char_max)


# =============================================================================
#  FB_SW_AM — Selector Automático/Manual de Wedge/Laminar
# =============================================================================

class FB_SW_AM:
    """
    Selector Automático/Manual para la selección Wedge/Laminar.
    
    ISaGRAF original:
        fb_sw_AM_Laminar_Wedge(i_sw_AM_Laminar_Wedge) ;
        Desglosa un entero en bits individuales (b2_, b3_, b4_).
    """

    def __init__(self):
        self.b2_: bool = False   # Automático (valor=2)
        self.b3_: bool = False   # Laminar manual (valor=4)
        self.b4_: bool = False   # Wedge manual (valor=8)

    def execute(self, selector: int) -> None:
        self.b2_ = (selector == 2)
        self.b3_ = (selector == 4)
        self.b4_ = (selector == 8)


# =============================================================================
#  Utilidades de Conversión ISaGRAF → Python
# =============================================================================

def ana(time_value_ms: int) -> int:
    """
    Equivalente a ANA() de ISaGRAF.
    Convierte un valor de tiempo (timer) a entero (milisegundos).
    En Python, simplemente retorna el valor ya que nuestros timers
    ya trabajan en ms internamente.
    """
    return time_value_ms


def int2msg(value: int, width: int) -> str:
    """
    Equivalente a INT2MSG() de ISaGRAF.
    Convierte un entero a string con ancho fijo rellenado con ceros.
    
    ISaGRAF: s_sysdat_r1_yy := INT2MSG(i_sysdat_r1_yy, 4) ;
    Python:  s_sysdat_r1_yy = int2msg(i_sysdat_r1_yy, 4)
    """
    return str(value).zfill(width)


def real2msg(value: float, width: int) -> str:
    """
    Equivalente a REAL2MSG() de ISaGRAF.
    Convierte un real a string.
    """
    formatted = f"{value:.{max(0, width-4)}f}"
    return formatted[:width] if len(formatted) > width else formatted


def safe_pow(base: float, exponent: float) -> float:
    """pow() seguro para las fórmulas termodinámicas."""
    try:
        if base <= 0.0 and exponent != int(exponent):
            return 0.0
        return math.pow(base, exponent)
    except (ValueError, OverflowError):
        return 0.0


def safe_log10(value: float) -> float:
    """log10() seguro."""
    try:
        return math.log10(value) if value > 0.0 else 0.0
    except (ValueError, OverflowError):
        return 0.0


def safe_sqrt(value: float) -> float:
    """sqrt() seguro."""
    try:
        return math.sqrt(value) if value >= 0.0 else 0.0
    except (ValueError, OverflowError):
        return 0.0
