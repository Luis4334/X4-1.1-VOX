# Estado Actual del Proyecto: Integración DAQ y Migración SoftPLC

## 📌 Contexto General
Nos encontramos trabajando en la migración e integración de un sistema de adquisición de datos (DAQ) que reemplaza o interactúa con el antiguo controlador **Orinoco SoftPLC (VP-25W6)**. El objetivo principal actual es establecer comunicación fiable, descubrir el mapa de memoria y leer correctamente los canales analógicos y configuraciones.

## 🔍 Investigaciones y Pruebas Activas

Hemos estado desarrollando y utilizando varios *scripts* exploratorios (`probes`) para comunicarnos con el dispositivo (aparentemente en la IP `192.168.255.1` o mediante el puerto serial `COM8`):

1. **Escaneo Modbus TCP/Serial:**
   - **`probe_hart_map.py`**: Escaneo de Holding Registers (FC3) e Input Registers (FC4) en bloques de 100 para descubrir en qué direcciones la DAQ expone los datos.
   - **`probe_daq_raw.py`**: Pruebas de comunicación Modbus RTU por puerto Serial (`COM8` a 9600 baudios) para leer los primeros 6 registros de la tarjeta.
   - **`probe_slave_ids.py` / `probe_counts.py`**: (Recientemente abiertos) Indican que estamos intentando descubrir el *Slave ID* correcto y entender el conteo o formato de los datos devueltos.

2. **Extracción de Datos vía Web/HTTP:**
   - **`get_moni_filter.py`**: Intentos de leer archivos de diagnóstico y configuración expuestos por el servidor web del dispositivo (`filter.html`, `moni.html`, `filter.xml`, `moni.xml`).
   - **`get_js.py` / `get_tgw_settings.py` / `probe_web.py`**: Exploración de la interfaz web del dispositivo (posiblemente un gateway TGW) para extraer configuraciones directamente si Modbus no entrega toda la información o para entender la configuración de red/puertos.

3. **Integración en el Sistema Principal:**
   - **`fase2_entradas.py`**: Aquí es donde los datos descubiertos deben integrarse. Ya hay un pipeline configurado (`_leer_daq_hardware()`) que lee los 6 canales AI de la tarjeta usando `pymodbus`, detecta si hay señal (open wire / over-range evaluando `32768`) y escala el valor crudo (*Engineering Format* dividido por `1000.0`) a miliamperios (mA). 

## 🎯 ¿Dónde quedamos y próximos pasos?

Actualmente estamos en la fase de **descubrimiento y mapeo de hardware**. Dependiendo de los resultados de los *scripts* de escaneo, los próximos pasos lógicos serían:

- [ ] **Confirmar el medio de conexión definitivo:** ¿Nos quedaremos con Modbus TCP (`192.168.255.1`) a través de un gateway, o con Modbus RTU directamente por serial (`COM8`)?
- [ ] **Validar el *Slave ID* y el mapa de registros:** Confirmar en qué dirección Modbus (ej. a partir de la `0` o en un offset diferente) se encuentran los datos en tiempo real de los canales analógicos.
- [ ] **Actualizar el diccionario `_INPUT_MAP`:** En `fase2_entradas.py`, ajustar los `addr` correctos para cada sensor (Nivel separador, Presión, Flujos, etc.) basándonos en los resultados de `probe_hart_map.py`.
- [ ] **Interpretar datos web (opcional):** Si los scripts web (`get_moni_filter.py`) devuelven XML o HTML útil, implementar un parser para extraer diagnósticos adicionales o configuraciones (como filtros de ruido del DAQ).

---
> [!NOTE] 
> *Este documento sirve como ancla para retomar el hilo. Puedes actualizar la lista de tareas a medida que avancemos.*
