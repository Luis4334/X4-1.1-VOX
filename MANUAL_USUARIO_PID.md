# 📘 Manual de Uso Operativo: Control PID en MFM Orinoco

Este manual está diseñado para operadores e ingenieros del sistema SCADA MFM Orinoco. Explica cómo utilizar la interfaz de control PID para la regulación de presión (**PCV-01**) y nivel (**LCV-01**).

---

## 1. Conceptos Básicos del PID

PID significa **Proporcional, Integral, Derivativo**. Es un algoritmo matemático que lee el estado actual de un proceso y calcula cuánto debe abrir o cerrar una válvula para alcanzar un objetivo deseado.

*   **PV (Variable de Proceso):** Es el valor real medido por el instrumento en este momento (Ej. La presión actual es 94.3 PSIG).
*   **SP (Setpoint):** Es el valor objetivo que tú, como operador, deseas mantener (Ej. Quieres que la presión baje y se quede en 50.0 PSIG).
*   **CV (Variable de Control):** Es la orden que el sistema le envía a la válvula (Ej. 30.5% de apertura) para intentar igualar el PV con el SP.
*   **Error:** Es la diferencia matemática entre el Setpoint y la Variable de Proceso (`Error = SP - PV`). El objetivo de todo controlador PID es hacer que este error llegue a cero y se mantenga ahí.

---

## 2. Los Parámetros de Sintonización (Kp, Ki, Kd)

Para que el controlador funcione correctamente a distintas condiciones de flujo, necesita ser "sintonizado" ajustando sus tres ganancias. En la interfaz, verás los campos correspondientes dentro del panel "Parámetros PID".

### ⚡ Kp (Ganancia Proporcional) - "La Fuerza"
Decide con cuánta fuerza reacciona al error **presente**.
*   **¿Qué hace?** Multiplica el error actual. Si el error es grande (muy lejos del SP), ordena a la válvula moverse bruscamente. Si el error es pequeño, la mueve despacio.
*   **Si es MUY BAJO:** El sistema es perezoso. La válvula apenas se mueve, y el nivel/presión puede llegar a valores de alarma crítica sin que el lazo logre controlarlo.
*   **Si es MUY ALTO:** El sistema se vuelve inestable ("nervioso"). La válvula abre y cierra entre 0% y 100% violentamente, intentando compensar pero pasándose de largo. A esto se le llama **comportamiento oscilatorio**, y daña mecánicamente las válvulas.

### ⏳ Ki (Ganancia Integral) - "La Persistencia"
Basada en la memoria del error **pasado**.
*   **¿Qué hace?** Va sumando microscópicamente el error a lo largo del tiempo. Su misión única es eliminar el pequeño "error residual" (offset) que el Proporcional casi siempre deja.
*   **Ejemplo:** Si el Kp llevó la presión de 90 a 52 PSIG y se estancó ahí (faltan 2 para el SP de 50), el Ki empieza a sumar ese "2" segundo a segundo, abriendo la válvula un 1% extra, luego otro 1%, hasta que la presión sea exactamente 50.0.
*   **Si es excesivo:** Genera *overshoot* (el sistema "se pasa de la raya" y tiene que corregir hacia el otro lado, pareciendo oscilatorio).

### 🛑 Kd (Ganancia Derivativa) - "La Predicción"
Observa el **futuro** cercano.
*   **¿Qué hace?** Mide a qué velocidad se está acercando el PV al Setpoint. Si te estás acercando rapidísimo, el Derivativo "pisa el freno" (reduce la apertura un poco) justo antes de llegar, para que aterrices suavemente en el SP sin pasarte.
*   **Uso industrial:** En procesos lentos como el nivel de un tanque de crudo volumétrico (LIC-01), usualmente el Kd se deja en **0.00** porque las lecturas de nivel a veces "saltan" por el oleaje, y el Derivativo se volvería loco intentando frenar un cambio que en realidad es ruido del transmisor.

---

## 3. Uso de la Interfaz Web (Modales PID)

En la pantalla de **Proceso**, si haces clic en los botones **PCV-01** o **LCV-01** (los recuadros celestes al lado derecho), se despliega el panel de control.

### Modos de Operación

1.  **Modo MANUAL:** El operador toma el control directo.
    *   *Uso:* Escribe el valor deseado en la casilla `CV Manual` (ej. `25` para abrir al 25%) y presiona **Guardar**.
    *   *Comportamiento:* Las válvulas ignorarán las matemáticas del PID; el SP y las lecturas no influirán, la válvula irá al 25% y se quedará fija. Excelentísimo para arranques de planta fríos.
2.  **Modo AUTO:** La inteligencia del SCADA toma el volante.
    *   *Uso:* Escribe el valor operativo deseado en `SP` (ej. `30` para nivel 30%) y asegúrate de que el botón `Auto` esté en verde.
    *   *Comportamiento:* El sistema re-calculará la posición óptima de la válvula cada medio segundo (500 ms) frente a perturbaciones de flujo de agua, crudo o gas natural.

### Sistemas Inteligentes (Integrados en tu código)
*   **Transferencia "Bumpless" (Sin Golpes):** Si estás controlando la válvula manualmente en 35% y luego cambias el radio-botón a **Auto**, el SCADA es lo suficientemente listo como para tomar ese `35%` como punto de partida para el PID. Nunca dará un "salto" repentino al 0% ni al 100%, evitando el estrés en la tubería y un fenómeno llamado golpe de ariete.
*   **Anti-Windup (Anti-Saturación):** ¿Qué pasa si abres la válvula del separador al 100% (`CV=100`) y el nivel sigue subiendo porque hay una inundación brutal de crudo? Matemáticamente, las fórmulas PID convencionales se "congelan" sumando infinito (Windup). En tu sistema MFM, tan pronto como la CV toca el 100% o el 0%, el cálculo Integral de "La persistencia" se congela internamente, manteniéndose listo para actuar sanamente en cuanto la inundación pase.

---

## 4. Escenarios y Ejemplos Prácticos de Simulación

Puedes probar cómo responde este algoritmo matemático introduciendo los siguientes valores en tu plataforma:

### Escenario A: Respuesta Perfecta y Amortiguada
*   **Objetivo:** Bajar la presión de 90 a 50 PSIG rápidamente pero parando suavemente (Amortiguado).
*   **Configuración para PCV-01 (Presión de Gas):**
    *   `Kp = 1.2`
    *   `Ki = 0.08`
    *   `Kd = 0.05`
    *   `SP = 50.0`
*   **¿Qué verás?:** El porcentaje de apertura (CV) saltará automáticamente; la variable de proceso bajará constante e intentará "posarse" en 50 PSIG de forma suave.

### Escenario B: El Error Crónico (Falta de Integral)
*   **Objetivo:** Mantener el nivel en el 30% exacto.
*   **Configuración para LCV-01 (Nivel de Crudo):**
    *   `Kp = 0.5`
    *   `Ki = 0.0` (¡Apagado!)
    *   `Kd = 0.0`
    *   `SP = 30.0`
*   **¿Qué verás?:** A medida que entra fluido al tanque, la válvula abrirá un poco. El nivel se estancará tal vez en 38% o 40% y la válvula se detendrá en una apertura parcial (ej. 20%). ¡Nunca llegará a 30%! El sistema ha encontrado un punto de equilibrio equivocado, y como el *Ki* es cero, no tiene "persistencia" para corregirlo. Si sumas un poco de *Ki* (ej. 0.05), verás cómo mágicamente el nivel empieza a descender despacito hasta clavarse en 30%.

### Escenario C: Daño Inminente ("Buscando problemas")
*   **Objetivo:** Mostrarle a un novato lo que **NO** hacer.
*   **Configuración para la LCV-01:**
    *   `Kp = 15.0` (Súper Sensible)
    *   `Ki = 0.1`
*   **¿Qué verás?:** Un desastre inestable. El Kp masivo reacciona al más mínimo cambio. Si el nivel es 31% y el SP es 30%, multiplicará ese miserable error de 1% por quince, abriendo la válvula completa. Segundos después, el nivel es 29%, el error es negativo, cierra por completo. La válvula sufrirá martilleo (0% -> 100% -> 0%) y en la vida real, el medidor multifásico y el separador vibrarían inestablemente.

---

## 5. Resumen de Flujo de Trabajo Ideal para el Operador

1.  **Arranque en Frío:** Abre tu Dashboard MFM y cerciórate de que **LCV-01** y **PCV-01** estén en **MANUAL**, fijadas en aperturas razonables.
2.  **Transición Controlada:** Espera a que el Separador alcance una presión y un nivel cercano a tus Setpoints (SP) objetivo.
3.  **Enganche Auto:** Ingresa a cada modal, verifica que tu `SP` escrito sea lógico (ej. 30%), y presiona **Auto**. ¡El `Bumpless Transfer` del SCADA hará la transición increíblemente suave!
4.  **Botón de Pánico:** Si una válvula pierde calibración neumática o si los transmisores (PI-01 / LI-01) mandan señales rotas o fuera de rango, usa el botón **Deshabilitar Lazos** en la barra izquierda. El sistema congelará los valores CV para evitar cierres o aperturas bruscas debido a señales de sensores dañados.
