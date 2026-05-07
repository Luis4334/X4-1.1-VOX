# Documentación del Proyecto: MFM ORINOCO

Este documento describe la arquitectura, el funcionamiento y la estructura de archivos del sistema **MFM Orinoco (Medidor de Flujo Multifásico)**, un sistema SCADA y dashboard industrial desarrollado con Flask (Backend) y Vue 3 (Frontend).

## 📌 Arquitectura General

El proyecto sigue una arquitectura Cliente-Servidor impulsada por eventos en tiempo real:

1. **Backend (Python / Flask + Socket.IO)**: Se encarga de simular el proceso industrial (presión, nivel, caudales) utilizando la lógica de Control PID. Brinda una API REST para la configuración y un WebSocket (vía Socket.IO) para enviar las lecturas de los sensores al frontend cada 500 milisegundos. Además, interactúa con una base de datos MySQL para persistir el historial de variables y configuraciones de alarmas y PIDs.
2. **Frontend (Vue 3 + Tailwind CSS)**: Interfaz de usuario de una sola página (SPA) que se conecta al backend mediante WebSockets. Se encarga de mostrar un diagrama de tuberías e instrumentación (P&ID) interactivo superponiendo etiquetas de datos reales, así como la visualización en gráficas y tablas de la data cruda.
3. **Base de Datos (MySQL / MariaDB en XAMPP)**: Almacena las variables del proceso histórico, la configuración de rangos de alarma y el estado persistente de los controladores PID.

---

## 📂 Descripción de Archivos Claves

### 1. `app.py` (Core del Servidor Backend)
Este script es el corazón del Backend y realiza las siguientes tareas principales:
- **Servidor Web y Sockets**: Instancia la aplicación Flask y enciende el Socket.IO con CORS habilitado. 
- **Control PID y Simulación (`simulate()`, `PIDController`)**: Tiene una simulación física realista de cómo entra gas y líquido en un separador. Controla automáticamente el estado de salida (variables `LI_01`, `PI_01`, etc.) cada 500 ms usando un lazo PID con parámetros Kp, Ki y Kd.
- **Loop de Control (`control_loop()`)**: Un hilo en segundo plano que constantemente invoca `simulate()`, calcula las nuevas variables del proceso y lo envía a los clientes conectados vía WebSocket emit (`process_data`).
- **Endpoints REST**: Proveen rutas API para descargar reportes en `.csv`, cambiar configuraciones PID (`/api/pid`), leer y modificar límites de alarmas (`/api/alarmas`), y deshabilitar/habilitar ambos lazos del PID.
- **Inyección a BD**: Registra las variables del simulador en la DB (`lecturas_proceso`) periódicamente.

### 2. `static/js/app.js` (Core del Frontend en Vue 3)
Contiene la lógica y la interfaz reactiva central de la aplicación. En lugar de estar dividido en múltiples archivos, agrupa los componentes de Vue 3:
- **`App` (Componente Root)**: Maneja la barra lateral izquierda o Sidebar que permite la navegación fluida, la cabecera (logo, reloj, estado de conexión) y mantiene las variables de estado reactivo mediante la recepción de websockets.
- **`ProcesoPage`**: Dibuja el dashboard P&ID principal. Superpone elementos interactivos HTML/SVG por encima de una imagen estática principal (`pid_fondos.png`). Cambia los colores de las etiquetas para indicar alarmas.
- **`DataCrudaPage`**: Integra el elemento `<canvas>` que emplea **Chart.js** para dibujar gráficos estilo tendencia ("Trend" graphs) en tiempo real de múltiples medidores.
- **`RangosPage`**: Formulario interactivo que permite al operario actualizar rápidamente los límites SP HH, SP H, SP L, SP LL, etc., de cada dispositivo instrumental.
- **`PidModal`**: Una ventana flotante desde la cual el usuario puede modificar la apertura manual, el setpoint y las constantes tuning (Kp, Ki, Kd) de un instrumento controlador como `PIC-01` o `LIC-01`.

### 3. `index.html` (Punto de entrada de Interfaz UI)
El documento HTML raíz de la aplicación.
- Importa Google Fonts (Inter y Roboto Mono).
- Integra Tailwind CSS a través de CDN mediante una configuración in-extenso (`tailwind.config`). 
- Llama los scripts remotos para Socket.IO, Vue 3 y Chart.js, y luego incorpora el motor local (`static/js/app.js`) finalizando y conectando sobre el div inicial `<div id="app">`.

### 4. `start.bat` (Script Launch)
- Automáticamente instala (vía `pip`) las dependencias listadas en `requirements.txt` (SocketIO, eventlet, mysql-connector, flask) y ejecuta el backend con `python app.py`.

### 5. `db_setup.sql` (Esquemas Base de datos)
Un script de configuración de MySQL (usado vía PHPMyAdmin de XAMPP) para construir la base de datos local llamada `x4`. Crea las tablas:
- `configuracion_actual`: Carga los estados PID, SP, y modos `Auto/Manual`.
- `tabla_configuracion_alarma`: Configuraciones limitantes para alarmas altas/bajas de herramientas específicas (ej. PI-01).
- `lecturas_proceso`: Tabla histórica que almacena las métricas en tiempo-serie de los datos arrojados por el simulador.
- `usuarios`: Registros de control de acceso al aplicativo y sistema.

### 6. Archivos estáticos (`/static/`)
- **`css/main.css`**: Define los estilos puntuales de animaciones PID, la estructura del panel de tanque y las cuadrículas que no son generadas directamente por Tailwind.
- **`img/`**: Incluye diagramas e imágenes como logos y fondos representativos. Los elementos UI construidos con JS de la página de procesos se superponen sobre estos fondos empleando posicionamiento absoluto para mapear componentes interactivos encima de gráficos inmutables del P&ID.

---

## ⚙️ Flujo General de Trabajo (Data Flow)

1. Al ejecutar **`start.bat`**, este arranca el backend en Python sirviendo en el puerto `5000`.
2. Al iniciar, el servidor Python se comunica con MySQL a través del conector para extraer los parámetros actuales que gobiernan la simulación del PID.
3. El frontend (**index.html** renderizando la SPA) es visitado por un navegador Web. Vue 3 se inicializa a su vez, instanciando un puente vía WebSockets (`Socket.IO-Client`) directo a la API `localhost:5000` en modo bidireccional asíncrono.
4. El simulador arroja cálculos variables en un ciclo infiniy cada 500ms; esto se despacha hacia el frontend mediante un emit ('process_data'), proveyendo a las tarjetas visuales (`DataCrudaPage`, etc.) actualizar sus tablas de valores, mover el nivel del tanque visual, y alimentar las gráficas en tiempo real.
5. Todo cambio efectuado por el usuario (ajustar Setpoints o pasar `LCV-01` a estado Manual mediante las Modal de Settings PID) envía un Request al Servidor.
6. El backend detiene instantáneamente en caliente su simulación para reajustar los índices temporales del control y modificar la fila en `configuracion_actual` de la base de datos MySQL, devolviendo al instante las constantes de vuelta al frontend para reestablecer la sincronización con una experiencia nula de lag intermedio.
