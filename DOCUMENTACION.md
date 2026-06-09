# Documentación Actualizada del Proyecto: MFM ORINOCO
**Fecha de Actualización:** Junio 2026

Este documento describe de manera integral la arquitectura, módulos principales y el flujo de datos del sistema **MFM Orinoco (Medidor de Flujo Multifásico)** en su estado actual, incluyendo la reciente integración de comunicaciones Modbus HART y la corrección de librerías.

---

## 📌 1. Arquitectura General "Todo en Uno"

El sistema funciona bajo una arquitectura robusta de **Memoria Compartida y Múltiples Hilos (Multithreading)**. El servidor web (Flask) y los motores de adquisición de datos residen en la misma aplicación, intercambiando información a través de una memoria global sin bloquearse entre sí.

### Los 4 Pilares de la Arquitectura:

1. **Memoria Global (`V`)**: Definida en `python_migration/global_vars.py`. Es el "cerebro central". Aloja todas las variables de proceso, estados de configuración, PID y resultados de la DAQ.
2. **Motor SoftPLC (`ScanEngine`)**: Hilo en segundo plano que corre a un intervalo estricto de **100 ms**. Ejecuta el control en tiempo real iterando sobre 9 "Fases" (adquisición Modbus, cálculos de caudal, lazos PID y escritura a válvulas).
3. **Poller HART (`HARTPoller`)**: Nuevo hilo en segundo plano que interroga al Gateway Modbus HART cada **3 segundos**. Decodifica variables multivariables avanzadas independientemente del ciclo rápido del SoftPLC.
4. **Servidor Backend y WebSockets (Flask + Socket.IO)**: 
   - Provee una API REST para interacción del usuario (cambio de SP, modo manual/automático, configuración).
   - Un hilo dedicado (`websocket_updater`) que toma "fotografías" de la memoria `V` cada **500 ms** y las emite al frontend.
5. **Frontend Reactivo (Vue 3)**: Interfaz de usuario SPA que actualiza en tiempo real el P&ID, gráficas de tendencias y configuraciones, consumiendo el stream de WebSockets.

---

## ⚙️ 2. Componentes Principales y Flujo de Datos

### 2.1 Adquisición de Datos Principal (DAQ Modbus RTU)
- **Archivos:** `modbus_daq.py`, `fase2_entradas.py`, `fase8_salidas.py`
- **Funcionamiento:** Se conecta a la DAQ principal por puerto Serial (COM) utilizando `pymodbus`. Lee los canales analógicos de los transmisores (4-20mA), aplica escalado a Unidades de Ingeniería, y escribe las señales de control (Control Value) hacia las válvulas LCV y PCV.
- **Actualización Reciente:** La configuración de canales es dinámica y se lee desde la base de datos MySQL (`daq_channel_config`). Se resolvió el error de versión de `pymodbus` actualizando el parámetro `slave` por `device_id`.

### 2.2 Integración Modbus HART (Gateway ICP DAS HRT-711)
- **Archivos:** `comunicacion_hart.py`, `_hart_background_poller` en `app.py`.
- **Funcionamiento:** Soporta Modbus TCP y RTU. Lee desde el Gateway registros Modbus a partir de la dirección `1300`.
- **Decodificación Avanzada:** Los datos flotantes IEEE 754 se extraen realizando un byte-swapping (Formato BADC). Cada lectura extrae 4 variables de proceso principales del instrumento (Rosemount):
  - **PV1:** Caudal (ej. SCFH)
  - **PV2:** Presión Diferencial (ej. inH2O)
  - **PV3:** Presión Estática (ej. psi) - *Incluye compensación de +14.5 para presión absoluta.*
  - **PV4:** Temperatura (ej. °F)
- **Configuración:** Almacenada dinámicamente en el archivo local `hart_config.json`.

### 2.3 Lógica de Control (SoftPLC)
- **Ubicación:** Carpeta `python_migration/`
- Emula el funcionamiento cíclico de un PLC industrial:
  - **Fase 2 (Entradas):** Lectura física de la DAQ.
  - **Fase 3 (Cálculos):** Cálculos termodinámicos, densidad y flujo multivariables.
  - **Fase 6 (PID):** Ejecución de los lazos de control cerrados para Nivel (LIC-01) y Presión (PIC-01) utilizando las variables del objeto `V`.
  - **Fase 8 (Salidas):** Escritura física a la DAQ de las posiciones de válvulas calculadas.

### 2.4 Almacenamiento y Base de Datos
- **Motor:** MySQL / MariaDB (conexión gestionada por un pool en `app.py`).
- **Uso:** 
  - Historización de datos: El backend inserta muestras del proceso en `lecturas_proceso` periódicamente.
  - Persistencia de configuraciones (Alarmas, Canales DAQ, Conexiones).

---

## 🔄 3. Ciclo de Interacción (Data Flow)

1. **Arranque:** Al ejecutar `python app.py`, se levantan las conexiones Modbus, los hilos de adquisición (SoftPLC y HART) y el servidor web.
2. **Escaneo Base (Hardware -> Memoria):** El SoftPLC y el hilo HART consultan independientemente el hardware y depositan los valores convertidos y calculados en la memoria global `V` y en la caché HART.
3. **Difusión (Memoria -> Interfaz):** Cada 500ms, el hilo `websocket_updater` recolecta la información de `V`, empaqueta el estado del proceso, PIDs, y datos HART, y lo envía por Socket.IO. El Frontend en Vue 3 re-renderiza inmediatamente la pantalla.
4. **Comandos (Interfaz -> Memoria):** Si el operador hace un cambio (ej. pasar la válvula de Nivel a modo Manual y fijar 50% de apertura), el Frontend envía una petición REST. Flask intercepta, sobrescribe la variable en memoria (`V.b_MAN_LC = True`, `V.r_LEVEL_PID_03_CVOverride = 50.0`). En el siguiente ciclo de 100ms, el SoftPLC detecta el cambio, puentea el cálculo PID y escribe el valor directamente al Modbus.

---

## 🚀 4. Puesta en Marcha

Para iniciar el sistema completo:
1. Asegurar que MySQL esté ejecutándose con la base de datos `x4` cargada.
2. Ejecutar `start.bat` o `python app.py`.
3. Navegar en el explorador a `http://localhost:5000/`.
4. Monitorear los logs en consola para confirmar la conexión de los hilos de SoftPLC y HART a sus respectivos Gateways Modbus.
