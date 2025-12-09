# Conectar GitHub con Vercel - Pasos Finales

## ✅ Lo que ya está hecho:
- ✅ Código subido a GitHub: https://github.com/0xMattM/chessnoth
- ✅ Proyecto creado en Vercel: chessnoth
- ✅ Proyecto linkeado localmente con Vercel

## 🔗 Conectar GitHub con Vercel (Para Deployments Automáticos)

### Opción 1: Desde Vercel Dashboard (Recomendado)

1. **Ve a tu proyecto en Vercel:**
   - https://vercel.com/0xmattms-projects/chessnoth
   - O ve a [vercel.com/dashboard](https://vercel.com/dashboard) y busca "chessnoth"

2. **Ve a Settings → Git:**
   - En el menú lateral, haz clic en **Settings**
   - Luego haz clic en **Git** en el submenú

3. **Conecta el repositorio:**
   - Haz clic en **Connect Git Repository**
   - Selecciona **GitHub** como proveedor
   - Autoriza Vercel si es necesario
   - Selecciona el repositorio: `0xMattM/chessnoth`
   - Haz clic en **Connect**

4. **Configura la rama de producción:**
   - Production Branch: `main`
   - Root Directory: `./` (dejar por defecto)
   - Build Command: `npm run build` (ya configurado)
   - Output Directory: `.next` (ya configurado)

### Opción 2: Desde GitHub (Alternativa)

1. Ve a tu repositorio: https://github.com/0xMattM/chessnoth
2. Haz clic en **Settings** → **Integrations** → **Vercel**
3. Haz clic en **Configure** o **Add Vercel**
4. Autoriza la conexión

## 🔐 Configurar Variables de Entorno

**IMPORTANTE:** Necesitas configurar estas variables en Vercel:

1. Ve a **Settings** → **Environment Variables** en tu proyecto de Vercel
2. Agrega estas variables:

   ```
   NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID
   Valor: [Tu WalletConnect Project ID]
   Ambientes: Production, Preview, Development
   ```

   ```
   NEXT_PUBLIC_CONTRACT_ADDRESS
   Valor: [Tu dirección del contrato desplegado]
   Ambientes: Production, Preview, Development
   ```

3. Haz clic en **Save** para cada variable
4. **Redeploy** el proyecto para que las variables tomen efecto

## 🚀 Después de Conectar

Una vez conectado, Vercel automáticamente:
- ✅ Desplegará a **Production** cada vez que hagas push a `main`
- ✅ Creará **Preview Deployments** para otras ramas y Pull Requests
- ✅ Te mostrará el estado del deployment en cada commit

## 📝 Próximos Pasos

1. Conecta GitHub con Vercel (pasos arriba)
2. Configura las variables de entorno
3. Haz un pequeño cambio y push para probar el deployment automático:
   ```bash
   git add .
   git commit -m "Test automatic deployment"
   git push
   ```
4. Ve a Vercel Dashboard para ver el deployment en tiempo real

## 🔍 Verificar que Funciona

- Ve a tu proyecto en Vercel Dashboard
- Deberías ver una sección "Git" en Settings que muestra el repositorio conectado
- Cada nuevo commit debería trigger un nuevo deployment automáticamente

