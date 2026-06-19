@echo off
echo ================================================
echo  MFM ORINOCO - Lanzador Principal
echo ================================================
echo.
echo [1/4] Instalando dependencias Python...
pip install Flask==2.3.3 Flask-SocketIO==5.3.6 Flask-CORS==4.0.0 ^
    mysql-connector-python==8.1.0 python-engineio==4.7.1 ^
    python-socketio==5.9.0 eventlet==0.33.3 pymodbus==3.6.8
echo.
echo [2/4] Asegurate de que XAMPP MySQL este corriendo
echo       y que hayas ejecutado add_valores_agregados.sql en phpMyAdmin
echo.
echo [3/4] Iniciando DAQ / Comunicacion Modbus en ventana separada...
start "MFM DAQ Modbus" cmd /k "python comunicacion-modbus.py"
echo.
echo [4/4] Iniciando servidor Flask en puerto 5000...
echo       Abre: http://localhost:5000
echo.
python app.py
pause
