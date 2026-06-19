# MFM ORINOCO (Medidor de Flujo Multifásico)

Sistema SCADA y dashboard industrial desarrollado con Flask (Backend) y Vue 3 (Frontend) para la gestión y monitoreo de medidores de flujo multifásicos.

## 📌 Arquitectura General

El proyecto sigue una arquitectura Cliente-Servidor impulsada por eventos en tiempo real:

1.  **Backend (Python / Flask + Socket.IO)**: Simulación del proceso industrial (presión, nivel, caudales) utilizando lógica de Control PID. API REST para configuración y WebSocket para transmisión de datos en tiempo real (cada 500ms).
2.  **Frontend (Vue 3 + Tailwind CSS)**: Interfaz de usuario SPA con diagrama P&ID interactivo, visualización de gráficas (Chart.js) y tablas de datos.
3.  **Base de Datos (MySQL / MariaDB)**: Persistencia de variables históricas, configuración de alarmas y estados de controladores PID.

## 📂 Estructura del Proyecto

*   `app.py`: Servidor principal backend (Flask + Socket.IO + PID Logic).
*   `comunicacion-modbus.py`: Módulo de adquisición de datos vía Modbus.
*   `static/js/app.js`: Lógica reactiva del frontend en Vue 3.
*   `index.html`: Punto de entrada de la interfaz de usuario.
*   `db_setup.sql`: Esquema de la base de datos MySQL.
*   `requirements.txt`: Dependencias del sistema.

## 🚀 Instalación y Ejecución

### Requisitos Previos
*   Python 3.8+
*   MySQL (XAMPP recomendado)

### Configuración
1.  Importa el archivo `db_setup.sql` en tu servidor MySQL para crear la base de datos `x4`.
2.  Instala las dependencias:
    ```bash
    pip install -r requirements.txt
    ```
3.  Ejecuta la aplicación:
    ```bash
    python app.py
    ```

O simplemente ejecuta el archivo `start.bat` en Windows.

## 🛠️ Tecnologías Utilizadas
*   **Backend**: Flask, Flask-SocketIO, MySQL Connector, PyModbus.
*   **Frontend**: Vue 3, Tailwind CSS, Chart.js, Socket.IO Client.
*   **Diseño**: Google Fonts (Inter, Roboto Mono).

---
Desarrollado para el monitoreo y control industrial de procesos multifásicos.
