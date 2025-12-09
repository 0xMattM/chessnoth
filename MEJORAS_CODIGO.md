# Análisis y Mejoras del Código - Directorio `app/`

## 📋 Resumen Ejecutivo

Este documento identifica áreas de mejora en el código del directorio `app/` para hacerlo más mantenible, escalable y funcional.

---

## 🔴 Problemas Críticos

### 1. **Archivo `combat/page.tsx` excede el límite de 500 líneas**

**Problema**: El archivo tiene **1661 líneas**, violando la regla de máximo 500 líneas establecida en `PLANNING.md`.

**Impacto**:
- Dificulta el mantenimiento
- Reduce la legibilidad
- Dificulta las pruebas unitarias
- Aumenta la complejidad cognitiva

**Solución Recomendada**:
- Extraer la lógica de IA del enemigo a `lib/combat/ai.ts`
- Extraer la gestión de turnos a `lib/combat/turn-manager.ts`
- Extraer la gestión de animaciones a `hooks/use-combat-animations.ts`
- Dividir el componente en subcomponentes más pequeños:
  - `CombatUI.tsx` - Interfaz principal
  - `CombatActions.tsx` - Panel de acciones
  - `CombatStatus.tsx` - Estado del combate
  - `CombatInventory.tsx` - Inventario y habilidades

---

### 2. **Duplicación de la interfaz `Character`**

**Problema**: La interfaz `Character` está definida en 3 archivos diferentes:
- `app/characters/page.tsx` (línea 17)
- `app/team/page.tsx` (línea 22)
- `app/battle/page.tsx` (línea 16)

**Impacto**:
- Inconsistencias en tipos
- Mantenimiento duplicado
- Violación del principio DRY

**Solución Recomendada**:
```typescript
// Crear lib/types/character.ts
export interface Character {
  tokenId: bigint
  uri: string
  metadata?: {
    name?: string
    class?: string
    level?: number
    image?: string
  }
}
```

---

### 3. **Lógica duplicada para obtener personajes**

**Problema**: Los archivos `characters/page.tsx`, `team/page.tsx` y `battle/page.tsx` tienen código casi idéntico para:
- Obtener el balance de NFTs
- Obtener los token IDs
- Obtener URIs, clases y niveles
- Procesar los datos

**Impacto**:
- ~150 líneas duplicadas por archivo
- Bugs se propagan a múltiples lugares
- Difícil mantener consistencia

**Solución Recomendada**:
Crear un hook personalizado `hooks/use-character-nfts.ts`:

```typescript
export function useCharacterNFTs() {
  const { address, isConnected } = useAccount()
  // ... lógica centralizada
  return {
    characters,
    isLoading,
    error
  }
}
```

---

### 4. **Uso inconsistente de constantes de almacenamiento**

**Problema**: En `battle/page.tsx` (líneas 169-170) se usan strings hardcodeados:
```typescript
sessionStorage.setItem('battle_stage', stage.toString())
sessionStorage.setItem('battle_team', JSON.stringify(battleTeam))
```

Mientras que en `combat/page.tsx` se usan constantes:
```typescript
sessionStorage.getItem(STORAGE_KEYS.BATTLE_STAGE)
```

**Solución**: Usar `STORAGE_KEYS` consistentemente en todos los archivos.

---

## 🟡 Problemas de Calidad

### 5. **Falta de manejo de errores en carga de datos**

**Problema**: Varios componentes no manejan adecuadamente:
- Errores de red al cargar NFTs
- Estados de carga
- Casos donde no hay personajes

**Mejora Recomendada**:
- Agregar estados de loading explícitos
- Mostrar mensajes de error amigables
- Implementar retry logic para operaciones críticas

---

### 6. **Optimización de llamadas al contrato**

**Problema**: Se hacen múltiples llamadas secuenciales que podrían optimizarse:
- `balanceOf` → `tokenOfOwnerByIndex` (N veces) → `tokenURI` + `getClass` + `getLevel` (3N veces)

**Mejora Recomendada**:
- Usar `useContractReads` de manera más eficiente
- Implementar caché con React Query
- Considerar batch calls si el contrato lo soporta

---

### 7. **Falta de validación de datos**

**Problema**: No se valida que los datos del contrato sean válidos antes de usarlos.

**Mejora Recomendada**:
```typescript
function validateCharacterData(data: unknown): Character | null {
  // Validar estructura y tipos
  // Retornar null si es inválido
}
```

---

### 8. **Componentes muy grandes con múltiples responsabilidades**

**Problema**: Varios componentes manejan:
- Fetching de datos
- Lógica de negocio
- Renderizado
- Manejo de estado

**Mejora Recomendada**: Separar en:
- Componentes de presentación (UI pura)
- Hooks personalizados (lógica)
- Utilidades (transformaciones de datos)

---

## 🟢 Mejoras de Funcionalidad

### 9. **Falta de tipos estrictos en algunos lugares**

**Problema**: Uso de `any` en algunos lugares (ej: `app/team/page.tsx` línea 411)

**Mejora**: Definir tipos específicos para skills y otros datos.

---

### 10. **Falta de memoización en cálculos costosos**

**Problema**: Cálculos como `getTeamCharacters()` se ejecutan en cada render.

**Mejora**: Usar `useMemo` para cálculos derivados.

---

### 11. **Falta de documentación en funciones complejas**

**Problema**: Funciones complejas como `nextTurn()` en `combat/page.tsx` no tienen documentación.

**Mejora**: Agregar docstrings estilo Google para funciones complejas.

---

### 12. **Manejo de estado mejorable**

**Problema**: Uso de múltiples `useState` que podrían consolidarse con `useReducer`.

**Ejemplo**: En `combat/page.tsx` hay muchos estados relacionados que podrían ser un reducer.

---

## 📝 Plan de Acción Prioritario

### Prioridad Alta 🔴
1. ✅ Extraer interfaz `Character` a `lib/types/character.ts`
2. ✅ Crear hook `useCharacterNFTs` para eliminar duplicación
3. ✅ Corregir uso de constantes en `battle/page.tsx`
4. ✅ Dividir `combat/page.tsx` en módulos más pequeños

### Prioridad Media 🟡
5. ✅ Mejorar manejo de errores y estados de carga
6. ✅ Optimizar llamadas al contrato con caché
7. ✅ Agregar validación de datos
8. ✅ Separar responsabilidades en componentes

### Prioridad Baja 🟢
9. ✅ Eliminar tipos `any`
10. ✅ Agregar memoización donde sea necesario
11. ✅ Documentar funciones complejas
12. ✅ Considerar `useReducer` para estados complejos

---

## 🎯 Beneficios Esperados

- **Mantenibilidad**: Código más fácil de entender y modificar
- **Escalabilidad**: Estructura que facilita agregar nuevas características
- **Rendimiento**: Optimizaciones que mejoran la experiencia del usuario
- **Calidad**: Menos bugs y mejor manejo de errores
- **Consistencia**: Código uniforme siguiendo mejores prácticas

---

## 📚 Referencias

- `PLANNING.md` - Arquitectura y convenciones del proyecto
- `README.md` - Documentación general
- Next.js App Router Best Practices
- React Hooks Best Practices

