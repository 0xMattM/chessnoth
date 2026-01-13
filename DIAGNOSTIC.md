# Diagnostic Guide for Daily Rewards Issue

## Problema
Los daily rewards se resetean al recargar la página, permitiendo reclamar múltiples veces.

## Información Necesaria

### 1. Después de Reclamar (ANTES de recargar)
Ejecuta en la consola del navegador:
```javascript
diagnoseDailyRewards()
```

Copia TODO el output y compártelo.

### 2. Después de Recargar la Página
Ejecuta de nuevo:
```javascript
diagnoseDailyRewards()
```

Copia TODO el output y compártelo.

### 3. Logs de la Consola
Al recargar la página, busca y copia TODOS los logs que contengan:
- `resetDailyRewardStreak`
- `Daily reward streak reset`
- `CRITICAL`
- `localStorage.removeItem`
- `localStorage.clear`

### 4. Verificar localStorage Manualmente
Antes de recargar, ejecuta:
```javascript
localStorage.getItem('chessnoth_daily_rewards')
```

Después de recargar, ejecuta de nuevo:
```javascript
localStorage.getItem('chessnoth_daily_rewards')
```

Comparte ambos resultados.

### 5. Verificar si hay Scripts Automáticos
Ejecuta en la consola:
```javascript
// Verificar si hay algún código que esté interceptando localStorage
console.log('removeItem:', localStorage.removeItem.toString())
console.log('clear:', localStorage.clear.toString())
console.log('setItem:', localStorage.setItem.toString())
```

### 6. Verificar Extensions del Navegador
- ¿Tienes alguna extensión que pueda estar limpiando localStorage?
- ¿Tienes algún script de usuario (Tampermonkey, etc.)?
- ¿Estás en modo incógnito?

### 7. Stack Trace del Reset
Busca en los logs un mensaje que diga:
```
CRITICAL: resetDailyRewardStreak called!
```

Y copia el stack trace completo que aparece después.

## Pasos para Reproducir

1. Conecta tu wallet
2. Reclama una daily reward
3. Ejecuta `diagnoseDailyRewards()` en la consola
4. Copia el output
5. Recarga la página (F5)
6. Ejecuta `diagnoseDailyRewards()` de nuevo
7. Copia el output
8. Busca en los logs cualquier mensaje con "reset" o "CRITICAL"
9. Comparte toda esta información

## Información Adicional Útil

- ¿En qué navegador estás? (Chrome, Firefox, Edge, etc.)
- ¿Estás en modo desarrollo o producción?
- ¿Tienes React DevTools instalado?
- ¿Hay algún error en la consola además de los relacionados con daily rewards?
