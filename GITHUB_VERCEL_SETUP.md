# Guía: Conectar GitHub con Vercel

## Paso 1: Crear Repositorio en GitHub

1. Ve a [github.com/new](https://github.com/new)
2. Nombre del repositorio: `chessnoth` (o el que prefieras)
3. **NO** inicialices con README, .gitignore o licencia (ya tenemos código)
4. Haz clic en "Create repository"

## Paso 2: Conectar tu Repositorio Local con GitHub

Después de crear el repositorio, GitHub te mostrará comandos. Ejecuta estos en tu terminal:

```bash
# Agregar el remote (reemplaza TU_USUARIO con tu usuario de GitHub)
git remote add origin https://github.com/TU_USUARIO/chessnoth.git

# Cambiar a branch main (si GitHub usa main en lugar de master)
git branch -M main

# Hacer push del código
git push -u origin main
```

## Paso 3: Conectar GitHub con Vercel

### Opción A: Desde Vercel Dashboard (Más Fácil)

1. Ve a [vercel.com/dashboard](https://vercel.com/dashboard)
2. Encuentra tu proyecto `chessnoth`
3. Ve a **Settings** → **Git**
4. Haz clic en **Connect Git Repository**
5. Selecciona GitHub y autoriza Vercel
6. Selecciona tu repositorio `chessnoth`
7. Haz clic en **Connect**

### Opción B: Desde el Proyecto en GitHub

1. Ve a tu repositorio en GitHub
2. Ve a **Settings** → **Integrations** → **Vercel**
3. Haz clic en **Configure** o **Add Vercel**
4. Autoriza la conexión

## Paso 4: Configurar Variables de Entorno en Vercel

1. Ve a tu proyecto en Vercel Dashboard
2. Ve a **Settings** → **Environment Variables**
3. Agrega estas variables:
   - `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` = tu WalletConnect project ID
   - `NEXT_PUBLIC_CONTRACT_ADDRESS` = tu dirección del contrato desplegado
4. Selecciona todos los ambientes (Production, Preview, Development)
5. Haz clic en **Save**

## Paso 5: Verificar Deployment Automático

Después de conectar:
- Cada push a `main` desplegará automáticamente a **Production**
- Cada push a otras ramas creará un **Preview Deployment**
- Los Pull Requests también crearán previews automáticos

## Comandos Rápidos

```bash
# Ver remotes configurados
git remote -v

# Si necesitas cambiar la URL del remote
git remote set-url origin https://github.com/TU_USUARIO/chessnoth.git

# Hacer cambios y push
git add .
git commit -m "Descripción de cambios"
git push
```

## Troubleshooting

### Error: "repository not found"
- Verifica que el nombre del repositorio sea correcto
- Asegúrate de tener permisos en el repositorio

### Error: "authentication failed"
- Puede que necesites configurar credenciales de Git
- Considera usar GitHub CLI: `gh auth login`

### Vercel no detecta cambios
- Verifica que el repositorio esté conectado en Settings → Git
- Asegúrate de hacer push a la rama correcta (main/master)

