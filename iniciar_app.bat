@echo off
setlocal

:: --- CONFIGURACION ---
:: Nombre exacto de la carpeta de Node que has descargado
set NODE_FOLDER=node-v24.14.0-win-x64
:: Nombre de la carpeta del codigo
set APP_FOLDER=irdb
:: ---------------------

echo ========================================================
echo   INICIADOR PORTATIL DE IRDB
echo ========================================================

:: 1. Configurar Node.js temporalmente
echo Buscando Node.js en: %~dp0%NODE_FOLDER%
if not exist "%~dp0%NODE_FOLDER%\node.exe" (
    echo [ERROR] No encuentro la carpeta de Node.js.
    echo Asegurate de descomprimir el ZIP de Node junto a este archivo.
    echo Debe llamarse: %NODE_FOLDER%
    pause
    exit /b
)
set PATH=%~dp0%NODE_FOLDER%;%PATH%
echo [OK] Node.js detectado.

:: 2. Entrar a la carpeta de la aplicacion
if not exist "%~dp0%APP_FOLDER%\package.json" (
    echo [ERROR] No encuentro la carpeta del codigo '%APP_FOLDER%'.
    echo Asegurate de descomprimir el codigo de la app junto a este archivo.
    pause
    exit /b
)
cd /d "%~dp0%APP_FOLDER%"

:: 3. Instalar dependencias (si no existen)
if not exist "node_modules" (
    echo.
    echo [PASO 1/2] Instalando librerias necesarias...
    echo (Esto descarga los componentes de la app. Puede tardar unos minutos).
    echo.
    call npm install
    if %errorlevel% neq 0 (
        echo.
        echo [ERROR] Fallo la instalacion. 
        echo Si esta maquina no tiene internet, necesitas copiar la carpeta 'node_modules' desde otro PC.
        pause
        exit /b
    )
) else (
    echo [OK] Librerias ya instaladas.
)

:: 4. Arrancar la aplicacion
echo.
echo [PASO 2/2] Arrancando el servidor...
echo.
echo --------------------------------------------------------
echo   CUANDO VEAS "Server running on...", ABRE EN TU NAVEGADOR:
echo   http://localhost:3000
echo --------------------------------------------------------
echo.

:: Usamos 'npm run dev' para desarrollo o 'npm start' si ya esta compilado
call npm run dev

pause
