# Guía de Ejecución Portátil (Sin Instalación)

Si estás en una máquina restringida donde no puedes instalar programas (sin permisos de administrador), sigue estos pasos para ejecutar la aplicación:

## Paso 1: Verificar si tienes Node.js
Abre una terminal (CMD o PowerShell) y escribe:
```bash
node -v
```
*   **Si sale una versión (ej: v18.x.x o v20.x.x)**: ¡Genial! Pasa al **Paso 3**.
*   **Si dice "comando no encontrado"**: Pasa al **Paso 2**.

## Paso 2: Usar Node.js "Portátil"
No necesitas instalar Node.js, puedes usarlo como un programa suelto:

1.  Ve a [nodejs.org/download](https://nodejs.org/en/download/) desde tu máquina personal.
2.  Descarga la versión **Binary** (.zip para Windows o .tar.gz para Linux). **No descargues el instalador .msi**.
3.  Descomprime ese archivo en la máquina remota (ej: en `C:\Usuarios\TuUsuario\Documentos\node`).
4.  Ahora puedes usar node escribiendo la ruta completa. Ejemplo:
    `C:\Usuarios\TuUsuario\Documentos\node\node.exe`

## Paso 3: Copiar la Aplicación
Copia toda la carpeta de este proyecto a la máquina remota (ej: `C:\Usuarios\TuUsuario\Documentos\irdb-app`).

## Paso 4: Instalar Dependencias
La aplicación necesita las librerías para funcionar.

**Opción A: La máquina remota tiene Internet**
1.  Abre la terminal en la carpeta de la app.
2.  Ejecuta:
    ```bash
    npm install
    # O si usas el node portátil:
    # ..\node\npm install
    ```

**Opción B: La máquina remota NO tiene Internet**
1.  En tu máquina personal (que debe tener el **mismo sistema operativo** que la remota), ejecuta `npm install` dentro de la carpeta del proyecto.
2.  Copia la carpeta entera **incluyendo la carpeta `node_modules`** a la máquina remota.

## Paso 5: Ejecutar la App
1.  En la máquina remota, dentro de la carpeta del proyecto, crea un archivo llamado `.env` y pon tu clave de Gemini (si la tienes):
    ```env
    GEMINI_API_KEY=tu_clave_aqui
    PORT=3000
    ```
2.  Arranca la aplicación:
    ```bash
    npm start
    # O con node portátil:
    # ..\node\node.exe node_modules\tsx\dist\cli.js server.ts
    ```
3.  Abre el navegador en `http://localhost:3000`.
4.  Ingresa los datos de conexión de tu base de datos (`10.118.249.195`). Al estar ejecutándose en la máquina remota, ¡conectará perfectamente!
