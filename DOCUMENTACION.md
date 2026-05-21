# Documentación del Proyecto: MFM ORINOCO (Arquitectura SoftPLC)

Este documento describe la arquitectura, el funcionamiento y la estructura de archivos del sistema **MFM Orinoco (Medidor de Flujo Multifásico)**, tras la refactorización y migración a una arquitectura "Todo en Uno" que fusiona un entorno web con un controlador SoftPLC basado en Python.

## 📌 Arquitectura General "Todo en Uno"

El proyecto funciona ahora bajo un patrón de **Memoria Compartida**, donde el servidor Flask (Backend) y el motor del SoftPLC se ejecutan de manera simultánea en hilos separados sin bloquearse entre sí.

1. **Memoria Global (`V`)**: El "Cerebro Central" del sistema. Todas las variables de proceso, estados y configuraciones residen en el objeto singleton `V` (definido en `python_migration/global_vars.py`).
2. **Motor SoftPLC (`ScanEngine`)**: Un hilo en segundo plano (`daemon`) que ejecuta un ciclo de escaneo continuo a una velocidad estricta de 100 ms. En cada ciclo, ejecuta secuencialmente las "Fases" (lectura de DAQ Modbus, cálculos de caudal, PIDs, y escritura en DAQ).
3. **Servidor Backend (Flask + WebSockets)**: Otro hilo paralelo atiende la API REST y, a través de `websocket_updater()`, emite cada 500 ms una "foto" pasiva de la memoria global hacia el frontend usando Socket.IO.
4. **Frontend (Vue 3 + Tailwind CSS)**: Interfaz SPA que recibe los datos en tiempo real para actualizar el dashboard P&ID y gráficas. También envía comandos REST (`/api/pid/<tag>`) que sobrescriben directamente los valores en la memoria global `V`.
5. **Hardware DAQ (Modbus RTU)**: Comunicación serial (RS-485 / COM) con la tarjeta física de adquisición de datos para leer los transmisores (4-20mA) y comandar las válvulas de presión y nivel.

---

## 📂 Descripción de Archivos Claves

### 1. `app.py` (Core del Servidor Backend)
El punto de entrada principal que inicializa todo el ecosistema:
- **Puente `sys.path`**: Conecta la carpeta de la aplicación web con el subpaquete `python_migration`.
- **Hilo del SoftPLC**: Arranca `plc_engine.start()`, levantando el motor `ScanEngine` a 100 ms.
- **Hilo del WebSocket**: Arranca `ws_thread`, ejecutando la función que despacha la data (`process_data`) al frontend cada 500 ms.
- **API REST**: Provee rutas (`POST /api/pid/<tag>`, `/api/plc/...`) para que las acciones manuales del operador modifiquen valores directamente en el objeto global `V`.

### 2. `python_migration/` (El Motor SoftPLC)
Esta carpeta contiene la lógica de control industrial migrada (desde el antiguo PLC ISaGRAF) a Python puro:
- **`global_vars.py`**: Define la clase singleton `V` donde se alojan todas las variables retenidas y dinámicas.
- **`scan_engine.py`**: Define el motor de ejecución (`ScanEngine`) que itera sobre el registro de fases lógicas (`PHASE_REGISTRY`).
- **`modbus_daq.py`**: Singleton que gestiona la conexión serial con la DAQ usando la librería `pymodbus` (Modbus RTU, 9600 baudios).
- **`fase2_entradas.py`**: Interroga la DAQ física (Modbus) para obtener los registros analógicos crudos de entrada (4-20mA) y los escala a Unidades de Ingeniería.
- **`fase3_caudal.py`, etc.**: Implementan las fórmulas termodinámicas, compensaciones y cálculos volumétricos del proceso.
- **`fase8_salidas.py`**: Toma las variables Control Value calculadas por el PID (ej. posiciones para válvulas LCV-03 y PCV-03) y escribe sus valores en la tarjeta DAQ.

### 3. Frontend y Base de Datos
- **`static/js/app.js`**: El código en Vue 3 que da vida a las páginas del proceso interactivo, tablas de datos crudos y gráficas de tendencias en vivo, actualizando su DOM reactivamente en cuanto llega un paquete de datos por Socket.IO.
- **`db_setup.sql`**: Script para generar la base de datos MySQL local, aunque ahora el estado vivo principal se sostiene en `V`.
- **`index.html`**: Punto de montaje principal de la aplicación y carga de estilos Tailwind CSS.

---

## ⚙️ Flujo General de Trabajo (Data Flow)

1. **Arranque**: Al ejecutar `python app.py`, se inicializa la aplicación web Flask y se disparan los hilos en segundo plano del SoftPLC y los WebSockets. Inmediatamente el SoftPLC inicializa la conexión Modbus RTU en el puerto COM asignado.
2. **Ciclo PLC (100 ms)**: El motor del SoftPLC interroga a la DAQ, lee los valores brutos, realiza los cálculos de control, aplica las alarmas y actualiza las válvulas físicas o las salidas. Si el sistema está en modo simulación (`V.b_simular_ai = True`), ignora el hardware de entrada y genera sus propios estímulos para simular la planta.
3. **Ciclo Web (500 ms)**: El servidor toma un pantallazo asíncrono de las variables más relevantes en `V` y se lo inyecta a los clientes Vue 3 a través de WebSockets, permitiendo la visualización a los operadores de forma amigable y responsiva.
4. **Interacción de Usuario**: El operador presiona un botón para pasar a modo manual (ej. LCV-01). El frontend envía una petición REST. Flask toma esa petición y modifica de inmediato la variable en memoria (`V.b_MAN_LC = True`). En la próxima iteración del ciclo de 100 ms, el SoftPLC reconoce que está en manual y acata la nueva instrucción, abriendo o cerrando físicamente la válvula mediante el Modbus.
