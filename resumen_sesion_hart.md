# 📋 Estado Actual del Proyecto — MFM Orinoco SoftPLC
**Fecha de actualización:** 18 de Mayo de 2026

---

## ✅ Lo que hemos logrado hoy

### 1. Integración del Gateway HART
*   **Módulo `comunicacion_hart.py`:** Se refactorizó para dejar de ser un script independiente y convertirse en un módulo invocable. Ahora decodifica correctamente el payload de 26 bytes (Comando 3 HART), extrayendo el *Status*, *Corriente (PV Current)*, y las 4 variables de proceso (PV1 a PV4) con sus unidades.
*   **Soporte Multi-Modbus:** El módulo ahora es capaz de consultar al Gateway HART utilizando tanto **Modbus TCP/IP (Ethernet)** (modo por defecto) como **Modbus RTU (Puerto COM)**, de forma dinámica.

### 2. Backend API (Flask)
*   **Nuevas Rutas API:** Se incorporaron en `app.py` los endpoints `/api/hart/config` y `/api/hart/live`.
*   **Persistencia:** La configuración del HART ahora se guarda localmente en un archivo `hart_config.json`, evitando la necesidad de hacer migraciones en la base de datos SQL actual.

### 3. Frontend Dashboard (Vue.js)
*   **Nueva Interfaz:** Se creó el componente `HartConfigPage` en `static/js/app.js` y se añadió al menú lateral izquierdo (`⚡ Config HART`).
*   **Monitoreo en Vivo:** El panel muestra los datos recibidos del Gateway HART actualizándose cada 5 segundos. Además, permite alternar la configuración entre modo TCP y RTU con validación visual (colores verde/rojo de conexión).

### 4. Resolución de Conflictos de `pymodbus`
*   **Bug Corregido:** Se solucionó el error `unexpected keyword argument 'slave'` que rompía la aplicación. La librería `pymodbus` (versión 3.6.8) reemplazó el parámetro `slave=` por `device_id=`.
*   **Aplicación a nivel global:** Reemplazamos esta sintaxis en `comunicacion_hart.py`, `fase2_entradas.py` (lecturas DAQ principal) y `fase8_salidas.py` (escrituras a válvulas). Esto reparó el bloqueo silencioso que mantenía todas las variables analógicas en `0.00`.

---

## 🚦 Temas Pendientes para Mañana (Next Steps)

1. **Revisión de Valores en 0.00 (DAQ Principal):**
   * Aunque corregimos el error de conexión (`device_id`), la consola sigue reportando `P_Gas=0.00 | T_Oil=0.00` en la Fase 5. 
   * **Para mañana:** Necesitamos verificar si la DAQ principal está conectada físicamente al puerto correcto (COM3), si el cable está mandando datos reales (mA), o si necesitamos inyectar valores desde el simulador de hardware (HMI).

2. **Validación del Gateway HART Físico:**
   * Conectar físicamente el Gateway ICP CON por red (192.168.255.1) y confirmar que la nueva pestaña de "Config HART" marca conexión en verde y muestra las variables reales.

3. **Inyección del HART en el SoftPLC (Opcional):**
   * Actualmente el HART se muestra visualmente en el dashboard de forma paralela. Si en el futuro alguna de estas variables (ej. Presión o Temperatura del HART) se necesita usar para los cálculos de la **Fase 3 (Caudal)** o la **Fase 6 (PIDs)**, deberemos mapear las lecturas de `comunicacion_hart.py` dentro de nuestro objeto global `V` del `ScanEngine`.

4. **Advertencias de Consola de la Fase 1:**
   * Hay un detalle menor donde la Fase 1 muestra `Archivo combo box no encontrado: ...Listado_Combo_Box_1...`. No afecta el funcionamiento (es un error visual), pero podemos crear una carpeta `config_files` vacía para silenciar el aviso.
