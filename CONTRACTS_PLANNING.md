# Chessnoth - Planificación de Contratos y Sistema NFT

## Resumen Ejecutivo

Este documento planifica la implementación completa del sistema de NFTs, tokens, experiencia y marketplace para Chessnoth. El sistema permite que los personajes sean NFTs minteables, ganen experiencia peleando, suban de nivel on-chain, y se intercambien en un marketplace.

## Arquitectura del Sistema

### Flujo General

1. **Minting**: Usuario mintea NFT de personaje desde la app
2. **Combate**: Usuario pelea con sus personajes, gana recompensas (pseudomoneda in-game)
3. **Distribución de EXP**: Usuario distribuye experiencia ganada entre sus personajes
4. **Upgrade On-Chain**: Usuario firma transacción para agregar EXP al NFT (cada 100 EXP = 1 nivel)
5. **Stats Calculation**: El juego lee clase, nombre y nivel del NFT para calcular stats
6. **Token CHS**: Se gana CHS peleando, se usa para comprar items o intercambiar NFTs

## Contratos Necesarios

### 1. CharacterNFT.sol (Actualizar)

**Estado Actual**: Ya existe con estructura básica (nivel, EXP, clase, generación)

**Cambios Necesarios**:

1. **Agregar campo `name`**:
   ```solidity
   mapping(uint256 => string) private _names;
   ```

2. **Actualizar función `mintCharacter`**:
   - Agregar parámetro `name`
   - Almacenar nombre en `_names[tokenId]`

3. **Implementar función `upgradeCharacter`** (reemplaza `addExperience`):
   ```solidity
   function upgradeCharacter(uint256 tokenId, uint256 expAmount) external {
       // Validar ownership
       // Agregar EXP
       // Calcular nuevo nivel (EXP / 100)
       // Si subió de nivel, emitir evento CharacterLevelUp
       // Emitir evento ExperienceGained
   }
   ```

4. **Función `getName`**:
   ```solidity
   function getName(uint256 tokenId) external view returns (string memory)
   ```

5. **Cálculo automático de nivel**:
   - Nivel = floor(EXP / 100) + 1
   - Ejemplo: 0 EXP = Nivel 1, 100 EXP = Nivel 2, 250 EXP = Nivel 3

**Estructura de Datos del NFT**:
- `class`: string (ej: "Warrior", "Mage")
- `name`: string (nombre personalizado del personaje)
- `level`: uint256 (calculado automáticamente: floor(EXP / 100) + 1)
- `experience`: uint256 (EXP total acumulada)
- `generation`: uint256 (para futuras expansiones)

**Eventos**:
- `CharacterMinted(tokenId, owner, class, name, generation, ipfsHash)`
- `CharacterUpgraded(tokenId, oldLevel, newLevel, expAdded, totalExp)`
- `CharacterLevelUp(tokenId, oldLevel, newLevel, totalExp)`

### 2. CHSToken.sol (Nuevo)

**Tipo**: ERC20 estándar con funciones de minting controladas

**Funcionalidades**:
- Minting controlado (solo direcciones autorizadas)
- Transferencias estándar ERC20
- Burning opcional (para quemar tokens)

**Funciones Principales**:
```solidity
function mint(address to, uint256 amount) external onlyAuthorized
function burn(uint256 amount) external
function setAuthorizedMinter(address minter) external onlyOwner
```

**Uso**:
- Recompensas de combate: `mint(playerAddress, rewardAmount)`
- Compras en ItemShop: Transferir CHS al contrato
- Marketplace: Pagar con CHS o MNT

### 3. Marketplace.sol (Nuevo)

**Funcionalidades**:
- Listar NFTs para venta (precio en CHS o MNT)
- Comprar NFTs listados
- Cancelar listados propios
- Comisiones opcionales (ej: 2.5% para el contrato)

**Estructura de Listado**:
```solidity
struct Listing {
    uint256 tokenId;
    address seller;
    uint256 price;
    address paymentToken; // address(0) para MNT, dirección CHS para CHS
    bool active;
}
```

**Funciones Principales**:
```solidity
function listNFT(uint256 tokenId, uint256 price, address paymentToken) external
function buyNFT(uint256 listingId) external payable
function cancelListing(uint256 listingId) external
function getListing(uint256 listingId) external view returns (Listing memory)
```

**Flujo**:
1. Usuario aprueba NFT al contrato (ERC721 approve)
2. Usuario llama `listNFT` con precio y token de pago
3. Comprador llama `buyNFT` (paga con CHS o MNT)
4. NFT se transfiere al comprador, fondos al vendedor

### 4. ItemShop.sol (Nuevo - Opcional)

**Alternativa**: Items pueden ser solo datos off-chain, no necesitan ser NFTs

**Si se implementa**:
- Items como NFTs ERC1155 (múltiples copias del mismo item)
- O items como registros on-chain simples

**Funciones**:
```solidity
function buyItem(uint256 itemId, uint256 quantity) external
function getItemPrice(uint256 itemId) external view returns (uint256)
```

**Nota**: Por ahora, los items pueden quedarse como datos off-chain. El ItemShop puede implementarse más adelante si es necesario.

## Sistema de Experiencia y Nivel

### Flujo Off-Chain → On-Chain

1. **Combate (Off-Chain)**:
   - Usuario pelea y gana recompensas
   - Recompensas se almacenan como "pseudomoneda in-game" (off-chain)
   - Usuario puede distribuir esta pseudomoneda como EXP entre sus personajes

2. **Distribución de EXP (Off-Chain)**:
   - Usuario elige personajes y cantidad de EXP para cada uno
   - La app calcula cuánta EXP se puede asignar

3. **Upgrade On-Chain**:
   - Usuario firma transacción `upgradeCharacter(tokenId, expAmount)`
   - El contrato:
     - Valida ownership
     - Agrega EXP al NFT
     - Calcula nuevo nivel automáticamente
     - Emite eventos

### Cálculo de Nivel

```
Nivel = floor(EXP / 100) + 1
```

**Ejemplos**:
- 0 EXP → Nivel 1
- 50 EXP → Nivel 1
- 100 EXP → Nivel 2
- 150 EXP → Nivel 2
- 200 EXP → Nivel 3
- 999 EXP → Nivel 10
- 1000 EXP → Nivel 11

### Bonificador de Stats por Nivel

**Fórmula Lineal**:
```
StatFinal = StatBase + (GrowthRate * (Nivel - 1))
```

Esto ya está implementado en el código actual (`lib/combat.ts` y `components/character-inventory.tsx`).

## Sistema de Stats

### Lectura desde NFT

El juego solo necesita leer del contrato:
- `class`: Para cargar stats base y growth rates
- `name`: Para mostrar nombre del personaje
- `level`: Para calcular stats finales (o `experience` y calcular nivel)

**Cálculo de Stats**:
1. Leer `class` del NFT
2. Cargar `baseStats` y `growthRates` desde archivo JSON de clase
3. Leer `level` del NFT (o calcular desde `experience`)
4. Aplicar fórmula: `Stat = BaseStat + (GrowthRate * (Level - 1))`
5. Agregar bonificadores de equipamiento (off-chain)

### Equipamiento

Los items y equipamiento pueden quedarse off-chain por ahora:
- Se almacenan en localStorage o base de datos
- No necesitan ser NFTs (a menos que se quiera un marketplace de items)
- Los stats de items se aplican después de calcular stats base + nivel

## Imágenes de NFTs

### Estructura de Imágenes

Cada clase tiene una imagen única en `contracts/NFTsimages/`:
- `Warrior.png`
- `Mage.png`
- `Paladin.png`
- `Archer.png`
- `Assassin.png` (Assasin.png en el archivo)
- `Healer.png`
- `Monk.png`
- `DarkMage.png`
- `Dwarf.png`
- `AxeThower.png` (AxeThower.png en el archivo)

### Metadata IPFS

Cada NFT debe tener metadata JSON en IPFS con:
```json
{
  "name": "Nombre del Personaje",
  "description": "Character NFT for Chessnoth",
  "image": "ipfs://Qm...", // Imagen de la clase
  "attributes": [
    { "trait_type": "Class", "value": "Warrior" },
    { "trait_type": "Level", "value": 5 },
    { "trait_type": "Experience", "value": 450 }
  ]
}
```

## Integración con el Juego

### Flujo de Lectura de NFTs

1. **Cargar Personajes del Usuario**:
   ```typescript
   // Obtener todos los NFTs del usuario
   const balance = await contract.read.balanceOf([userAddress])
   const tokenIds = await Promise.all(
     Array.from({ length: balance }).map((_, i) =>
       contract.read.tokenOfOwnerByIndex([userAddress, i])
     )
   )
   
   // Leer datos de cada NFT
   const characters = await Promise.all(
     tokenIds.map(async (tokenId) => {
       const [class, name, level, experience] = await Promise.all([
         contract.read.getClass([tokenId]),
         contract.read.getName([tokenId]),
         contract.read.getLevel([tokenId]),
         contract.read.getExperience([tokenId])
       ])
       return { tokenId, class, name, level, experience }
     })
   )
   ```

2. **Calcular Stats para Combate**:
   - Usar `class` para cargar datos de clase
   - Usar `level` para calcular stats base
   - Agregar equipamiento (off-chain)

### Flujo de Upgrade

1. **Usuario gana recompensas** (off-chain)
2. **Usuario distribuye EXP** (off-chain, UI)
3. **Usuario confirma upgrade**:
   ```typescript
   await contract.write.upgradeCharacter([tokenId, expAmount])
   ```
4. **App escucha eventos**:
   - `CharacterUpgraded`: Actualizar UI
   - `CharacterLevelUp`: Mostrar notificación

## Tokenomics CHS

### Distribución

- **Recompensas de Combate**: 50-200 CHS por batalla (dependiendo de dificultad)
- **Quests Diarias**: 100-500 CHS
- **Logros**: 500-2000 CHS
- **Staking** (futuro): Recompensas por staking NFTs

### Uso

- **Comprar Items**: 50-500 CHS por item
- **Upgrade NFTs**: Costo de gas + posible fee (opcional)
- **Marketplace**: Comprar/vender NFTs
- **Intercambio**: CHS ↔ MNT (DEX futuro)

## Seguridad y Consideraciones

### Validaciones

1. **CharacterNFT**:
   - Solo owner puede upgrade su NFT
   - Validar que EXP > 0
   - Validar que token existe

2. **CHSToken**:
   - Solo direcciones autorizadas pueden mint
   - Validar que amount > 0

3. **Marketplace**:
   - Validar ownership antes de listar
   - Validar que listing está activo antes de comprar
   - Validar que comprador tiene fondos suficientes
   - Usar ReentrancyGuard

### Gas Optimization

- Usar `uint256` para EXP (ya que puede ser grande)
- Emitir eventos solo cuando sea necesario
- Agrupar múltiples upgrades en una transacción (si es posible)

## Plan de Implementación

### Fase 1: Actualizar CharacterNFT
- [ ] Agregar campo `name`
- [ ] Implementar `upgradeCharacter` con cálculo automático de nivel
- [ ] Agregar función `getName`
- [ ] Actualizar eventos
- [ ] Tests unitarios

### Fase 2: Crear CHSToken
- [ ] Implementar contrato ERC20
- [ ] Agregar funciones de minting controladas
- [ ] Tests unitarios
- [ ] Deploy en testnet

### Fase 3: Crear Marketplace
- [ ] Implementar estructura de listados
- [ ] Implementar funciones de listar/comprar/cancelar
- [ ] Agregar soporte para CHS y MNT
- [ ] Tests unitarios
- [ ] Deploy en testnet

### Fase 4: Integración Frontend
- [ ] Actualizar ABI en `lib/contract.ts`
- [ ] Crear hooks para leer NFTs
- [ ] Crear UI para distribuir EXP
- [ ] Crear UI para upgrade NFTs
- [ ] Crear UI para marketplace
- [ ] Integrar con sistema de combate

### Fase 5: Testing y Optimización
- [ ] Tests end-to-end
- [ ] Optimización de gas
- [ ] Auditoría de seguridad (opcional)
- [ ] Deploy en mainnet

## Archivos a Crear/Modificar

### Contratos
- `contracts/CharacterNFT.sol` (modificar)
- `contracts/CHSToken.sol` (nuevo)
- `contracts/Marketplace.sol` (nuevo)

### Frontend
- `lib/contract.ts` (actualizar ABIs)
- `lib/nft.ts` (nuevo - utilidades para NFTs)
- `lib/chs-token.ts` (nuevo - utilidades para CHS)
- `app/upgrade/page.tsx` (nuevo - UI para upgrade)
- `app/marketplace/page.tsx` (nuevo - UI para marketplace)
- `hooks/useCharacterNFT.ts` (nuevo - hook para leer NFTs)
- `hooks/useUpgrade.ts` (nuevo - hook para upgrade)

### Tests
- `contracts/test/CharacterNFT.test.js` (actualizar)
- `contracts/test/CHSToken.test.js` (nuevo)
- `contracts/test/Marketplace.test.js` (nuevo)

## Preguntas y Decisiones Pendientes

1. **ItemShop**: ¿Implementar ahora o más adelante?
   - **Decisión**: Implementar más adelante, items pueden ser off-chain por ahora

2. **Comisiones Marketplace**: ¿Qué porcentaje?
   - **Sugerencia**: 2.5% para el contrato, 0% para el vendedor (o configurable)

3. **Límite de EXP por transacción**: ¿Hay límite?
   - **Sugerencia**: No hay límite, pero validar que no cause overflow

4. **Imágenes IPFS**: ¿Quién sube las imágenes?
   - **Sugerencia**: Backend o servicio de pinning (Pinata, NFT.Storage)

5. **Precio de Minting**: ¿Gratis o con costo?
   - **Sugerencia**: Gratis para usuarios, costo de gas cubierto por el juego (o usuario paga gas)

## Notas Adicionales

- Los stats base y growth rates se mantienen off-chain (archivos JSON)
- El equipamiento se mantiene off-chain (localStorage o base de datos)
- Solo clase, nombre, nivel y EXP están on-chain
- El cálculo de stats finales se hace en el frontend usando datos on-chain + off-chain

