# Informe de Errores de Build en Vercel

## Resumen Ejecutivo

El proyecto falla al hacer deploy en Vercel debido a errores de ESLint que no aparecen en el entorno local. A pesar de tener configuraciones para ignorar ESLint durante el build, Vercel está ejecutando el linter y fallando el build por errores de linting.

## Problema Principal

**Error**: El build en Vercel falla con errores de ESLint que bloquean la compilación, aunque:
1. `next.config.js` tiene `eslint: { ignoreDuringBuilds: true }`
2. El script de build tiene `--no-lint`
3. Localmente no se detectan estos errores

## Errores Críticos Detectados

### 1. Errores de `react/no-unescaped-entities`

**Archivos afectados:**
- `app/characters/page.tsx` (líneas 184, 242, 350)
- `app/team/page.tsx` (líneas 313, 529)
- `components/character-skills.tsx` (línea 521)

**Descripción**: ESLint detecta apostrofes tipográficos (') o caracteres especiales en texto JSX que deben ser escapados usando entidades HTML como `&apos;`, `&lsquo;`, `&#39;`, o `&rsquo;`.

**Ejemplo de error**:
```
./app/characters/page.tsx
184:67  Error: `'` can be escaped with `&apos;`, `&lsquo;`, `&#39;`, `&rsquo;`.  react/no-unescaped-entities
```

**Causa probable**: 
- Apostrofes tipográficos (') en lugar de apostrofes rectos (')
- El linter de Vercel es más estricto que el local
- Diferentes versiones de ESLint entre local y Vercel

### 2. Error de `no-case-declarations`

**Archivo afectado:**
- `app/combat/page.tsx` (línea 1303)

**Descripción**: ESLint detecta una declaración léxica (const, let, var) en un bloque case sin llaves.

**Código problemático**:
```typescript
case 'w': {
  event.preventDefault()
  handleAction('skill')  // Línea 1303
  break
}
```

**Causa probable**: 
- Aunque el case tiene llaves `{}`, ESLint puede estar detectando algo más
- Posible problema con la versión de ESLint en Vercel
- Falso positivo del linter

### 3. Warnings de Variables No Usadas

**Archivos afectados:**
- `app/battle/page.tsx`: `Zap`, `getHighestStageCompleted`
- `app/characters/page.tsx`: `Zap`, `getCharacterSkills`
- `app/combat/page.tsx`: `Move`, `useMemo`, `getCharacterSkills`
- `app/team/page.tsx`: `selectedCharacter`, `characterSkills`
- `app/providers.tsx`: `useEffect`
- Varios otros archivos

**Descripción**: Variables importadas pero no utilizadas en el código.

**Nota**: Estos son warnings, no errores, pero pueden convertirse en errores si la configuración de ESLint es estricta.

## Análisis de Configuración

### Configuración Actual

**`next.config.js`**:
```javascript
eslint: {
  ignoreDuringBuilds: true,
}
```

**`package.json`**:
```json
"build": "next build --no-lint"
```

**Problema**: A pesar de estas configuraciones, Vercel está ejecutando ESLint durante el build.

### Posibles Causas

1. **Vercel ignora `--no-lint`**: Vercel puede estar ejecutando su propio proceso de linting independientemente del script de build.

2. **Configuración de ESLint en Vercel**: Vercel puede tener su propia configuración de ESLint que sobrescribe la del proyecto.

3. **Versión de Next.js**: La versión `14.0.4` puede tener un comportamiento diferente en Vercel vs local.

4. **Cache de Vercel**: Configuraciones antiguas pueden estar en cache.

## Soluciones Propuestas

### Solución 1: Deshabilitar ESLint Completamente en Vercel (Recomendada)

Crear/actualizar `.vercelignore` o configuración de Vercel para deshabilitar ESLint:

**Opción A**: Agregar a `next.config.js`:
```javascript
eslint: {
  ignoreDuringBuilds: true,
  dirs: [], // No lint any directories
}
```

**Opción B**: Crear archivo `.eslintignore` en la raíz:
```
*
```

**Opción C**: Modificar `.eslintrc.json` para deshabilitar reglas problemáticas:
```json
{
  "rules": {
    "react/no-unescaped-entities": "off",
    "no-case-declarations": "off"
  }
}
```

### Solución 2: Corregir los Errores Específicos

#### Para `react/no-unescaped-entities`:

Reemplazar apostrofes tipográficos con entidades HTML o apostrofes rectos:

```tsx
// Antes
<p>You don't have any characters yet</p>

// Después (opción 1)
<p>You don&apos;t have any characters yet</p>

// Después (opción 2)
<p>You do not have any characters yet</p>
```

#### Para `no-case-declarations`:

Asegurar que todos los cases tengan llaves (ya están presentes, puede ser falso positivo):

```typescript
case 'w': {
  event.preventDefault()
  handleAction('skill')
  break
}
```

Agregar comentario de deshabilitación si es necesario:
```typescript
case 'w': {
  event.preventDefault()
  // eslint-disable-next-line no-case-declarations
  handleAction('skill')
  break
}
```

### Solución 3: Configurar Vercel para Ignorar ESLint

En la configuración del proyecto en Vercel:
1. Ir a Settings → Build & Development Settings
2. Deshabilitar "Run ESLint during build"
3. O agregar variable de entorno: `ESLINT_NO_DEV_ERRORS=true`

### Solución 4: Actualizar Configuración de ESLint

Modificar `.eslintrc.json` para ser menos estricto:

```json
{
  "extends": "next/core-web-vitals",
  "rules": {
    "react/no-unescaped-entities": "warn",
    "no-case-declarations": "warn",
    "@typescript-eslint/no-unused-vars": "warn",
    "@typescript-eslint/no-explicit-any": "warn"
  }
}
```

## Recomendación Final

**Solución inmediata**: Deshabilitar ESLint en el build de Vercel usando la Solución 1 (Opción C) modificando `.eslintrc.json` para deshabilitar las reglas problemáticas.

**Solución a largo plazo**: Corregir los errores específicos (Solución 2) para mantener la calidad del código.

## Archivos que Requieren Atención

1. `app/characters/page.tsx` - 3 errores de `react/no-unescaped-entities`
2. `app/combat/page.tsx` - 1 error de `no-case-declarations` + varios warnings
3. `app/team/page.tsx` - 2 errores de `react/no-unescaped-entities`
4. `components/character-skills.tsx` - 1 error de `react/no-unescaped-entities`
5. `app/battle/page.tsx` - Warnings de variables no usadas
6. `app/providers.tsx` - Warning de `useEffect` no usado
7. Varios otros archivos con warnings menores

## Próximos Pasos

1. ✅ Revisar y corregir imports no usados
2. ⏳ Decidir estrategia: deshabilitar ESLint o corregir errores
3. ⏳ Implementar la solución elegida
4. ⏳ Probar build en Vercel
5. ⏳ Verificar que el deploy funcione correctamente

---

**Fecha del informe**: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
**Versión de Next.js**: 14.0.4
**Versión de ESLint**: 8.56.0
**Estado**: Pendiente de resolución

