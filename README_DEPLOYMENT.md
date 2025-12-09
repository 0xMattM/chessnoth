# Guía de Deployment del Contrato CharacterNFT

## Prerrequisitos

1. **MetaMask configurado con Conflux eSpace Testnet**
   - Network Name: Conflux eSpace (Testnet)
   - RPC URL: https://evmtestnet.confluxrpc.com
   - Chain ID: 71
   - Currency Symbol: CFX
   - Block Explorer: https://evmtestnet.confluxscan.org

2. **CFX de Testnet en tu wallet**
   - Obtén CFX de testnet desde: https://conflux-faucets.com/

3. **Clave privada de tu wallet**
   - En MetaMask: Account Details > Export Private Key
   - ⚠️ **NUNCA compartas tu clave privada**

## Pasos para Deployment

### 1. Instalar dependencias

```bash
npm install
```

### 2. Configurar variables de entorno

Crea un archivo `.env` en la raíz del proyecto (no `.env.local`):

```env
PRIVATE_KEY=tu_clave_privada_aqui
```

**⚠️ IMPORTANTE:**
- El archivo `.env` está en `.gitignore` y NO se subirá a git
- NUNCA compartas tu clave privada
- Asegúrate de tener CFX testnet en esa wallet

### 3. Compilar el contrato

```bash
npm run compile
```

Esto compilará el contrato y verificará que no haya errores.

### 4. Desplegar el contrato

```bash
npm run deploy
```

El script mostrará:
- La dirección del contrato desplegado
- Un enlace a ConfluxScan para verificar
- Instrucciones para actualizar `.env.local`

### 5. Actualizar configuración de la app

Después del deployment, actualiza tu `.env.local`:

```env
NEXT_PUBLIC_CONTRACT_ADDRESS=0xDireccionDelContratoDesplegado
```

### 6. Configurar authorizedMinter

Después del deployment, necesitas configurar el `authorizedMinter`:

1. Ve a ConfluxScan: https://evmtestnet.confluxscan.org
2. Busca tu contrato desplegado
3. Ve a la pestaña "Contract" → "Write Contract"
4. Conecta tu wallet (la que desplegó el contrato)
5. Llama a `setAuthorizedMinter` con tu dirección de wallet
6. Confirma la transacción

O puedes usar este script de Hardhat (crear `scripts/setMinter.js`):

```javascript
const hre = require('hardhat')

async function main() {
  const contractAddress = '0xTU_DIRECCION_DEL_CONTRATO'
  const minterAddress = '0xTU_DIRECCION_DE_WALLET'
  
  const CharacterNFT = await hre.ethers.getContractAt('CharacterNFT', contractAddress)
  const tx = await CharacterNFT.setAuthorizedMinter(minterAddress)
  await tx.wait()
  
  console.log('✅ Authorized minter set to:', minterAddress)
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
```

Ejecutar con:
```bash
hardhat run scripts/setMinter.js --network confluxESpaceTestnet
```

## Verificación

Después del deployment, verifica que todo funciona:

1. ✅ El contrato aparece en ConfluxScan
2. ✅ Puedes ver las funciones del contrato
3. ✅ El `authorizedMinter` está configurado
4. ✅ La app puede conectarse al contrato

## Troubleshooting

### Error: "insufficient funds"
- Asegúrate de tener CFX testnet en tu wallet
- Obtén más desde: https://conflux-faucets.com/

### Error: "nonce too high"
- Espera unos segundos y vuelve a intentar
- O resetea el nonce en MetaMask

### Error de compilación
- Verifica que tienes todas las dependencias instaladas
- Asegúrate de que la versión de Solidity sea 0.8.20

## Seguridad

- ⚠️ **NUNCA** subas tu `.env` a git
- ⚠️ **NUNCA** compartas tu clave privada
- ⚠️ Usa una wallet separada para testnet
- ⚠️ No uses la misma wallet para mainnet y testnet

