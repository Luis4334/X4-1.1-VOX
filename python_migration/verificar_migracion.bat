@echo off
echo ============================================================
echo  ORINOCO SoftPLC - Verificacion de Importaciones
echo ============================================================
echo.
cd /d "%~dp0"
python -c "import sys; sys.path.insert(0, '.'); from scan_engine import PHASE_REGISTRY; print(str(len(PHASE_REGISTRY)) + ' fases registradas OK'); [print('  ' + str(i+1).zfill(2) + '. ' + n) for i,(n,_) in enumerate(PHASE_REGISTRY)]"
echo.
if %errorlevel% == 0 (
    echo [OK] Todos los modulos importaron correctamente.
) else (
    echo [ERROR] Hay errores de importacion. Ver detalle arriba.
)
echo.
pause
