# Alternativas de Deployment para Chessnoth

Este documento describe las principales alternativas a Vercel para desplegar tu aplicación Next.js 14.

## Opciones Recomendadas

### 1. **Netlify** ⭐ (Más Similar a Vercel)

**Ventajas:**
- Setup muy similar a Vercel
- Deploy automático desde Git
- Generous free tier
- Soporte nativo para Next.js
- Edge Functions incluidas

**Configuración:**

1. Crea un archivo `netlify.toml` en la raíz:

```toml
[build]
  command = "npm run build"
  publish = ".next"

[[plugins]]
  package = "@netlify/plugin-nextjs"

[build.environment]
  NODE_VERSION = "18"
```

2. Variables de entorno en Netlify Dashboard:
   - `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`
   - `NEXT_PUBLIC_CONTRACT_ADDRESS`

3. Deploy:
   - Conecta tu repositorio en Netlify
   - Netlify detectará automáticamente Next.js
   - O usa CLI: `npm install -g netlify-cli && netlify deploy --prod`

**Precio:** Gratis (100GB bandwidth/mes), planes desde $19/mes

---

### 2. **Cloudflare Pages** ⚡ (Más Rápido y Gratis)

**Ventajas:**
- Completamente gratis (sin límites de bandwidth)
- Extremadamente rápido (CDN global)
- Deploy automático desde Git
- Edge Functions incluidas

**Configuración:**

1. Crea `wrangler.toml` (opcional, para configuración avanzada):

```toml
name = "chessnoth"
compatibility_date = "2024-01-01"
```

2. Build settings en Cloudflare Dashboard:
   - Build command: `npm run build`
   - Build output directory: `.next`
   - Node version: `18`

3. Variables de entorno en Cloudflare Dashboard

4. Deploy:
   - Conecta repositorio en Cloudflare Pages
   - O usa CLI: `npm install -g wrangler && wrangler pages deploy .next`

**Precio:** Completamente gratis (ilimitado)

---

### 3. **Railway** 🚂 (Más Flexible)

**Ventajas:**
- Muy fácil de usar
- Soporte para bases de datos y servicios adicionales
- Deploy automático desde Git
- $5 de crédito gratis/mes

**Configuración:**

1. Crea `railway.json` (opcional):

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "npm run build"
  },
  "deploy": {
    "startCommand": "npm start",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

2. Variables de entorno en Railway Dashboard

3. Deploy:
   - Conecta repositorio en Railway
   - Railway detectará automáticamente Next.js

**Precio:** $5 crédito gratis/mes, luego pay-as-you-go (~$5-20/mes)

---

### 4. **Render** 🎨 (Simple y Confiable)

**Ventajas:**
- Setup muy simple
- Free tier disponible
- Deploy automático desde Git
- SSL automático

**Configuración:**

1. Crea `render.yaml` (opcional):

```yaml
services:
  - type: web
    name: chessnoth
    env: node
    buildCommand: npm install && npm run build
    startCommand: npm start
    envVars:
      - key: NODE_ENV
        value: production
```

2. Variables de entorno en Render Dashboard

3. Deploy:
   - Conecta repositorio en Render
   - Render detectará automáticamente Next.js

**Precio:** Gratis (con limitaciones), planes desde $7/mes

---

### 5. **DigitalOcean App Platform** 💧

**Ventajas:**
- Buena relación precio/rendimiento
- Integración con otros servicios DO
- Deploy automático desde Git

**Configuración:**

1. Crea `.do/app.yaml`:

```yaml
name: chessnoth
services:
  - name: web
    github:
      repo: tu-usuario/Chessnoth
      branch: main
    run_command: npm start
    build_command: npm run build
    environment_slug: node-js
    instance_count: 1
    instance_size_slug: basic-xxs
    envs:
      - key: NODE_ENV
        value: production
```

2. Variables de entorno en DO Dashboard

**Precio:** Desde $5/mes

---

### 6. **Fly.io** ✈️ (Global Edge Deployment)

**Ventajas:**
- Despliegue global (edge computing)
- Muy rápido para usuarios internacionales
- Generous free tier

**Configuración:**

1. Instala Fly CLI: `npm install -g @fly/cli`

2. Crea `fly.toml`:

```toml
app = "chessnoth"
primary_region = "iad"

[build]
  builder = "paketobuildpacks/builder:base"

[env]
  NODE_ENV = "production"

[http_service]
  internal_port = 3000
  force_https = true
  auto_stop_machines = true
  auto_start_machines = true
  min_machines_running = 0
  processes = ["app"]

[[vm]]
  memory = "256mb"
  cpu_kind = "shared"
  cpus = 1
```

3. Deploy: `fly deploy`

**Precio:** Gratis (3 VMs compartidas), luego pay-as-you-go

---

### 7. **AWS Amplify** ☁️ (Si ya usas AWS)

**Ventajas:**
- Integración completa con AWS
- Escalable y confiable
- Free tier generoso

**Configuración:**

1. Conecta repositorio en AWS Amplify Console
2. Amplify detectará automáticamente Next.js
3. Configura variables de entorno en la consola

**Precio:** Free tier (1000 build minutes/mes), luego pay-as-you-go

---

### 8. **Self-Hosted (VPS)** 🖥️ (Máximo Control)

**Opciones de VPS:**
- DigitalOcean Droplets ($4-12/mes)
- Linode ($5-20/mes)
- Vultr ($2.50-12/mes)
- Hetzner (€4-20/mes)

**Configuración con Docker:**

1. Crea `Dockerfile`:

```dockerfile
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
```

2. Actualiza `next.config.js` para standalone output:

```javascript
const nextConfig = {
  output: 'standalone',
  // ... resto de tu configuración
}
```

3. Crea `docker-compose.yml`:

```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=${NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID}
      - NEXT_PUBLIC_CONTRACT_ADDRESS=${NEXT_PUBLIC_CONTRACT_ADDRESS}
    restart: unless-stopped
```

4. Deploy:
```bash
docker-compose up -d
```

**Configuración con PM2 (sin Docker):**

1. Instala PM2: `npm install -g pm2`

2. Crea `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [{
    name: 'chessnoth',
    script: 'npm',
    args: 'start',
    instances: 1,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
}
```

3. Deploy:
```bash
npm run build
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

---

## Comparación Rápida

| Plataforma | Precio | Facilidad | Performance | Mejor Para |
|------------|--------|-----------|-------------|------------|
| **Netlify** | Gratis/$19+ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | Proyectos similares a Vercel |
| **Cloudflare Pages** | Gratis | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | Máxima velocidad global |
| **Railway** | $5 crédito/mes | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | Proyectos full-stack |
| **Render** | Gratis/$7+ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | Simplicidad |
| **DigitalOcean** | $5+ | ⭐⭐⭐ | ⭐⭐⭐⭐ | Control y precio |
| **Fly.io** | Gratis/pay-go | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | Edge computing global |
| **AWS Amplify** | Free tier | ⭐⭐⭐ | ⭐⭐⭐⭐ | Ecosistema AWS |
| **VPS** | $2-20/mes | ⭐⭐ | ⭐⭐⭐⭐ | Control total |

---

## Recomendación por Caso de Uso

### 🎯 **Para la mayoría de proyectos:**
**Netlify** o **Cloudflare Pages** - Similar a Vercel, fácil migración

### 💰 **Si buscas gratis ilimitado:**
**Cloudflare Pages** - Sin límites de bandwidth

### 🚀 **Si necesitas edge computing:**
**Fly.io** o **Cloudflare Pages**

### 🏢 **Si necesitas control total:**
**VPS (DigitalOcean/Linode)** con Docker

### 🔧 **Si necesitas servicios adicionales:**
**Railway** - Base de datos, Redis, etc. incluidos

---

## Migración desde Vercel

### Pasos generales:

1. **Elimina `vercel.json`** (o guárdalo como referencia)

2. **Crea archivo de configuración** para la nueva plataforma (ver ejemplos arriba)

3. **Configura variables de entorno** en el dashboard de la nueva plataforma

4. **Conecta repositorio Git** y configura auto-deploy

5. **Actualiza dominio** (si aplica)

### Variables de entorno a migrar:

```env
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=tu_project_id
NEXT_PUBLIC_CONTRACT_ADDRESS=0xTuContrato
NODE_ENV=production
```

---

## Notas Importantes

⚠️ **Web3 y Variables de Entorno:**
- Todas las variables que empiezan con `NEXT_PUBLIC_` son expuestas al cliente
- Asegúrate de que `NEXT_PUBLIC_CONTRACT_ADDRESS` esté configurada correctamente
- No uses variables sensibles con el prefijo `NEXT_PUBLIC_`

⚠️ **Next.js Standalone:**
- Para VPS/Docker, considera usar `output: 'standalone'` en `next.config.js`
- Reduce el tamaño de la imagen Docker significativamente

⚠️ **Build Time:**
- Algunas plataformas tienen límites de tiempo de build
- Si tu build tarda mucho, considera optimizar o usar una plataforma con más tiempo

---

## Siguiente Paso

1. Elige la plataforma que mejor se adapte a tus necesidades
2. Sigue la configuración específica arriba
3. Haz un deploy de prueba
4. Verifica que las conexiones Web3 funcionen correctamente

¿Necesitas ayuda con la configuración de alguna plataforma específica?

