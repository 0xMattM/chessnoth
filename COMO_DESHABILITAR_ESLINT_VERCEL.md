# Cómo Deshabilitar ESLint en Vercel

## Opción 1: Desde el Dashboard de Vercel (RECOMENDADO)

1. **Ve a tu proyecto en Vercel**
   - Abre https://vercel.com
   - Selecciona tu proyecto

2. **Ve a Settings**
   - Click en el nombre del proyecto
   - Click en "Settings" en el menú superior

3. **Build & Development Settings**
   - En el menú lateral izquierdo, busca "Build & Development Settings"
   - O ve directamente a: `Settings → Build & Development Settings`

4. **Deshabilitar ESLint**
   - Busca la opción "**Run ESLint during build**"
   - **Desactiva el toggle** (debe estar en OFF/gris)

5. **Guardar cambios**
   - Los cambios se guardan automáticamente

6. **Redeploy**
   - Ve a la pestaña "Deployments"
   - Click en "Redeploy" en el último deployment
   - O haz un nuevo push a tu repositorio

## Opción 2: Variable de Entorno

1. **Ve a Settings → Environment Variables**
2. **Agrega una nueva variable:**
   - **Name**: `ESLINT_NO_DEV_ERRORS`
   - **Value**: `true`
   - **Environment**: Production, Preview, Development (selecciona todos)
3. **Save**
4. **Redeploy**

## Opción 3: Desde vercel.json (si existe)

Si tienes un archivo `vercel.json` en la raíz del proyecto, agrega:

```json
{
  "buildCommand": "next build",
  "devCommand": "next dev",
  "framework": "nextjs",
  "ignoreCommand": "git diff --quiet HEAD^ HEAD ./"
}
```

Y en `next.config.js` asegúrate de tener:

```javascript
eslint: {
  ignoreDuringBuilds: true,
}
```

## Verificación

Después de deshabilitar ESLint, el build debería:
- ✅ Compilar sin errores de ESLint
- ✅ Mostrar solo warnings (no bloquearán el build)
- ✅ Completar el deployment exitosamente

## Nota Importante

Deshabilitar ESLint en producción no es ideal, pero es necesario cuando:
- Los errores son falsos positivos
- La configuración de ESLint no se aplica correctamente en Vercel
- Necesitas hacer deploy urgentemente

**Recomendación**: Una vez que el deploy funcione, puedes trabajar en corregir los errores reales y luego volver a habilitar ESLint.

