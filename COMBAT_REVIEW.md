# Revisión Completa de la Lógica de Combate

## Problemas Críticos Encontrados

### 1. **Status Effects No Se Procesan**
**Ubicación**: `lib/combat.ts`, `app/combat/hooks/useCombatActions.ts`

**Problema**: 
- Los status effects se agregan a los personajes (línea 524 en `useCombatActions.ts`) pero nunca se procesan
- No hay lógica para:
  - Aplicar los efectos de los buffs/debuffs a las stats
  - Reducir la duración de los status effects cada turno
  - Remover status effects cuando su duración llega a 0

**Impacto**: Los buffs/debuffs no tienen ningún efecto en el juego.

---

### 2. **Personajes Derrotados Permanecen en Turn Order**
**Ubicación**: `app/combat/hooks/useCombatState.ts` (función `nextTurn`)

**Problema**: 
- Cuando un personaje es derrotado (HP = 0), se le quita la posición pero NO se remueve del `turnOrder`
- El código solo verifica `nextChar.stats.hp > 0` para saltar personajes, pero siguen en el array
- Esto puede causar problemas si el personaje derrotado vuelve a aparecer en el turn order

**Impacto**: Personajes muertos pueden aparecer en el turn order, causando bugs visuales o lógicos.

---

### 3. **Sincronización de Estado entre Board y Characters**
**Ubicación**: Múltiples archivos

**Problema**:
- El `board` y el array `characters` pueden desincronizarse
- Cuando un personaje se mueve o es derrotado, se actualiza el board pero a veces no se actualiza correctamente el array de characters (o viceversa)
- En `useEnemyAI.ts` línea 247, se usa `board` directamente en lugar de reconstruirlo desde `characters`

**Ejemplo específico**:
```typescript
// useEnemyAI.ts línea 247
const newBoard = board.map((r) => [...r])  // Usa el board anterior, no el actualizado
```

**Impacto**: Personajes pueden aparecer en posiciones incorrectas o desaparecer del tablero.

---

### 4. **Race Conditions en Actualizaciones de Estado**
**Ubicación**: `app/combat/hooks/useCombatActions.ts`, `app/combat/hooks/useEnemyAI.ts`

**Problema**:
- Múltiples `setTimeout` actualizan el estado de forma asíncrona
- El flag `operationInProgressRef` se resetea después de 100ms, pero las animaciones duran 400-800ms
- Esto permite que múltiples operaciones se ejecuten simultáneamente

**Ejemplo**:
```typescript
// useCombatState.ts línea 340
setTimeout(() => {
  operationInProgressRef.current = false
}, 100)  // Se resetea muy rápido, las animaciones duran más
```

**Impacto**: Puede causar que un personaje se mueva dos veces, o que se ejecuten acciones duplicadas.

---

### 5. **Actualización de Estado en Enemy AI Usa Estado Stale**
**Ubicación**: `app/combat/hooks/useEnemyAI.ts` línea 71-450

**Problema**:
- El `useEffect` captura `combatState` en el closure
- Dentro del `setTimeout`, se usa `setCombatState` con una función updater, pero también se accede a `board` directamente (línea 247)
- El `board` puede estar desactualizado cuando se ejecuta el timeout

**Impacto**: La IA enemiga puede tomar decisiones basadas en información obsoleta.

---

### 6. **Falta Validación de Mana en Skills de Enemy AI**
**Ubicación**: `app/combat/hooks/useEnemyAI.ts`

**Problema**:
- La IA enemiga solo ataca físicamente, nunca usa skills
- No hay lógica para que los enemigos usen skills (aunque tengan mana)
- Los enemigos no tienen `equippedSkills` definidos en `initializeCombatCharacters`

**Impacto**: Los enemigos son muy simples y predecibles.

---

### 7. **Cálculo de Daño Puede Ser Inconsistente**
**Ubicación**: `lib/combat.ts` función `calculateDamage`

**Problema**:
- La fórmula de defensa usa `attackStat / (attackStat + damageReduction)` pero `damageReduction = defenseStat * 1.5`
- Si `attackStat` es muy bajo y `defenseStat` es muy alto, el daño mínimo (20% de baseDamage) puede ser mayor que el daño calculado, lo cual es correcto, pero la fórmula puede ser confusa
- No hay validación de que los stats sean números válidos

**Impacto**: Puede haber casos edge donde el daño no se calcula correctamente.

---

### 8. **Victory/Defeat Check Inconsistente**
**Ubicación**: Múltiples lugares

**Problema**:
- La verificación de victoria/derrota se hace en múltiples lugares:
  - `useCombatActions.ts` líneas 435-462 (ataque)
  - `useCombatActions.ts` líneas 593-616 (skill)
  - `useEnemyAI.ts` líneas 392-417 (ataque enemigo)
- Cada uno usa su propia copia de `updatedCharacters`, lo que puede causar inconsistencias
- No se verifica después de usar items

**Impacto**: El juego puede no detectar correctamente cuando termina.

---

### 9. **Personajes Derrotados No Se Remueven del Board Inmediatamente**
**Ubicación**: `app/combat/hooks/useCombatActions.ts`, `app/combat/hooks/useEnemyAI.ts`

**Problema**:
- Cuando un personaje es derrotado, se actualiza su HP a 0 y se quita la posición, pero esto se hace en diferentes momentos
- En algunos casos, el personaje derrotado puede seguir apareciendo en el board temporalmente

**Ejemplo**:
```typescript
// useCombatActions.ts línea 370
position: newTargetHp === 0 ? null : target.position,  // Se quita posición
// Pero el board se actualiza después, línea 376-383
```

**Impacto**: Personajes derrotados pueden aparecer brevemente en el tablero.

---

### 10. **Falta Aplicación de Status Effects en Cálculo de Stats**
**Ubicación**: `lib/combat.ts`

**Problema**:
- Los status effects se almacenan pero nunca se aplican a las stats reales
- Cuando se calcula el daño, se usan `attacker.stats.atk` y `defender.stats.def`, pero estos no incluyen los buffs/debuffs activos

**Impacto**: Los buffs/debuffs no afectan el combate en absoluto.

---

### 11. **Terrain Modifiers Se Aplican Pero No Se Actualizan al Mover**
**Ubicación**: `app/combat/hooks/useCombatActions.ts` línea 272-311

**Problema**:
- Los modificadores de terreno se aplican cuando un personaje se mueve
- Sin embargo, si un personaje ya tiene modificadores de terreno aplicados y se mueve a otro terreno, los stats pueden no actualizarse correctamente
- La lógica preserva el ratio de HP/Mana, pero si el maxHp cambia drásticamente, puede haber problemas

**Impacto**: Los stats pueden no reflejar correctamente el terreno actual.

---

### 12. **Falta Manejo de Evasión**
**Ubicación**: `lib/combat.ts` función `calculateDamage`

**Problema**:
- El stat `eva` (evasión) existe en `CombatStats` pero nunca se usa en el cálculo de daño
- No hay lógica para que los ataques fallen basándose en la evasión

**Impacto**: La evasión no tiene ningún efecto en el juego.

---

### 13. **Turn Order No Se Recalcula Cuando Cambian Stats**
**Ubicación**: `app/combat/hooks/useCombatState.ts`

**Problema**:
- El turn order se calcula una vez al inicio basándose en velocidad
- Si la velocidad de un personaje cambia (por buffs/debuffs o terreno), el turn order no se actualiza
- Esto puede causar que personajes más rápidos actúen después de personajes más lentos

**Impacto**: El orden de turnos puede volverse incorrecto durante el combate.

---

### 14. **Items No Se Consumen**
**Ubicación**: `app/combat/hooks/useCombatActions.ts` línea 634-667

**Problema**:
- Los items se usan y aplican efectos, pero no hay lógica para:
  - Remover el item del inventario
  - Verificar si el jugador tiene el item disponible
  - Limitar el uso de items por combate

**Impacto**: Los items pueden usarse infinitamente.

---

### 15. **Falta Validación de Rango en Ataques/Skills**
**Ubicación**: `lib/combat.ts` funciones `getValidAttackTargets`, `getValidSkillTargets`

**Problema**:
- Los rangos se verifican, pero no hay validación de línea de visión (line of sight)
- Un personaje puede atacar a través de otros personajes o obstáculos
- No hay verificación de que el camino esté despejado

**Impacto**: Ataques pueden pasar a través de obstáculos o aliados.

---

## Problemas Menores

### 16. **Logging Excesivo en Producción**
- Muchos `logger.debug` que pueden afectar el rendimiento

### 17. **Magic Numbers**
- Algunos valores hardcodeados como `1.5` (defenseFactor), `0.2` (minDamage), `3` (move range)

### 18. **Falta Manejo de Errores**
- No hay try-catch en operaciones asíncronas críticas

### 19. **Animaciones Pueden Acumularse**
- Si el usuario hace clic rápido, múltiples animaciones pueden ejecutarse simultáneamente

---

## Recomendaciones de Prioridad

### Alta Prioridad (Crítico para Funcionalidad)
1. Implementar procesamiento de status effects
2. Remover personajes derrotados del turn order
3. Sincronizar board y characters correctamente
4. Implementar evasión en cálculo de daño
5. Arreglar race conditions en actualizaciones de estado

### Media Prioridad (Afecta Balance/UX)
6. Implementar uso de skills para enemigos
7. Consumir items al usarlos
8. Recalcular turn order cuando cambian stats
9. Validar línea de visión en ataques

### Baja Prioridad (Mejoras)
10. Mejorar manejo de errores
11. Optimizar logging
12. Refactorizar magic numbers a constantes

---

## Notas Adicionales

- El código tiene buena estructura general pero necesita refactorización en la sincronización de estado
- Considerar usar un estado más centralizado (como Redux o Zustand) para evitar desincronizaciones
- Los timeouts anidados hacen difícil rastrear el flujo de ejecución

