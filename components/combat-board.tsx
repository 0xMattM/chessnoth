'use client'

import { cn } from '@/lib/utils'
import type { CombatCharacter } from '@/lib/combat'
import type { TerrainType } from '@/lib/terrain'
import { TERRAIN_CONFIGS } from '@/lib/terrain'
import Image from 'next/image'
import { useEffect, useRef } from 'react'

interface CombatBoardProps {
  board: (CombatCharacter | null)[][]
  terrainMap: TerrainType[][]
  selectedPosition: { row: number; col: number } | null
  validMovePositions: Array<{ row: number; col: number }>
  validAttackTargets: CombatCharacter[]
  onCellClick: (row: number, col: number) => void
  currentCharacter: CombatCharacter | null
  movingCharacters?: Map<
    string,
    {
      from: { row: number; col: number }
      to: { row: number; col: number }
      character?: CombatCharacter
    }
  >
}

/**
 * Get sprite path for a character class
 * Handles various formats: "warrior", "Dark Mage", "dark_mage", etc.
 */
function getCharacterSpritePath(characterClass: string): string {
  // Normalize: lowercase, replace spaces/hyphens with underscores
  const normalizedClass = characterClass
    .toLowerCase()
    .trim()
    .replace(/[\s-]+/g, '_')
    .replace(/_+/g, '_') // Remove multiple underscores
  return `/characters/${normalizedClass}.svg`
}

export function CombatBoard({
  board,
  terrainMap,
  selectedPosition,
  validMovePositions,
  validAttackTargets,
  onCellClick,
  currentCharacter,
  movingCharacters = new Map(),
}: CombatBoardProps) {
  const isMovePosition = (row: number, col: number) => {
    return validMovePositions.some(pos => pos.row === row && pos.col === col)
  }

  const isAttackTarget = (row: number, col: number) => {
    return validAttackTargets.some(char => char.position?.row === row && char.position?.col === col)
  }

  const getCharacterAt = (row: number, col: number): CombatCharacter | null => {
    return board[row]?.[col] || null
  }

  // Get all characters for moving overlay
  const allCharacters = board.flat().filter((char): char is CombatCharacter => char !== null)

  // Calculate cell size including gap
  const cellSize = 64 // w-16 = 64px
  const gap = 4 // gap-1 = 4px
  const totalCellSize = cellSize + gap

  return (
    <div className="flex justify-center relative">
      <div className="grid grid-cols-8 gap-1 p-4 bg-muted/30 rounded-lg border-2 border-border relative">
        {Array.from({ length: 8 }, (_, row) =>
          Array.from({ length: 8 }, (_, col) => {
            const character = getCharacterAt(row, col)
            const isSelected = selectedPosition?.row === row && selectedPosition?.col === col
            const isValidMove = isMovePosition(row, col)
            const isValidAttack = isAttackTarget(row, col)
            const isCurrentChar =
              currentCharacter?.position?.row === row && currentCharacter?.position?.col === col

            // Get terrain for this cell
            const terrain = terrainMap[row]?.[col] || 'grassland'
            const terrainConfig = TERRAIN_CONFIGS[terrain]

            return (
              <button
                key={`${row}-${col}`}
                onClick={() => onCellClick(row, col)}
                className={cn(
                  'relative w-16 h-16 rounded-lg transition-all overflow-hidden shadow-md',
                  // Current character - very visible with animation
                  isCurrentChar &&
                    'ring-4 ring-blue-400 ring-offset-2 ring-offset-background animate-pulse shadow-blue-400/50 shadow-lg',
                  // Selected position
                  isSelected && !isCurrentChar && 'ring-2 ring-primary',
                  // Valid move - use cyan/blue instead of green for better contrast
                  isValidMove &&
                    !isCurrentChar &&
                    'cursor-pointer border-2 border-cyan-400 shadow-cyan-400/30',
                  // Valid attack target
                  isValidAttack && 'cursor-pointer border-2 border-red-500 shadow-red-500/30',
                  // Character hover effect
                  character && 'hover:scale-105',
                  // Empty cells
                  !character &&
                    !isValidMove &&
                    !isValidAttack &&
                    !isCurrentChar &&
                    'opacity-90 hover:opacity-100'
                )}
                title={terrainConfig.name}
              >
                {/* Terrain background with improved styling */}
                <div
                  className={cn(
                    'absolute inset-0 transition-opacity',
                    (isValidMove || isValidAttack || isCurrentChar) && 'opacity-75'
                  )}
                >
                  <div
                    className="w-full h-full relative"
                    style={{
                      backgroundColor:
                        terrainConfig.solidColor || terrainConfig.bgColor || '#4ade80',
                      backgroundImage: terrainConfig.texturePath
                        ? `url(${terrainConfig.texturePath})`
                        : undefined,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                    }}
                  >
                    {/* Gradient overlay for depth */}
                    <div className="absolute inset-0 bg-gradient-to-br from-white/15 via-transparent to-black/15" />
                    {/* Pattern overlay for texture */}
                    <div
                      className="absolute inset-0 opacity-30"
                      style={{
                        backgroundImage: `repeating-linear-gradient(
                          45deg,
                          transparent,
                          transparent 2px,
                          rgba(0,0,0,0.05) 2px,
                          rgba(0,0,0,0.05) 4px
                        )`,
                      }}
                    />
                  </div>
                </div>

                {/* Overlay for valid moves - cyan/blue for better visibility */}
                {isValidMove && !isCurrentChar && (
                  <div className="absolute inset-0 bg-cyan-400/50 border-2 border-cyan-300 rounded-lg flex items-center justify-center z-5">
                    <div className="w-3 h-3 bg-cyan-200 rounded-full animate-pulse shadow-lg shadow-cyan-300/50" />
                    <div className="absolute inset-0 bg-gradient-to-br from-cyan-300/20 to-transparent" />
                  </div>
                )}
                {/* Overlay for valid attack targets */}
                {isValidAttack && (
                  <div className="absolute inset-0 bg-red-500/50 border-2 border-red-400 rounded-lg flex items-center justify-center z-5">
                    <div className="w-4 h-4 bg-red-300 rounded-full animate-pulse shadow-lg shadow-red-400/50" />
                    <div className="absolute inset-0 bg-gradient-to-br from-red-400/20 to-transparent" />
                  </div>
                )}
                {/* Current character highlight - very visible with glow effect */}
                {isCurrentChar && (
                  <div className="absolute inset-0 z-5">
                    <div className="absolute inset-0 bg-blue-500/40 border-4 border-blue-400 rounded-lg shadow-[0_0_20px_rgba(96,165,250,0.6)]" />
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-300/30 via-blue-400/20 to-transparent animate-pulse" />
                    <div className="absolute -inset-1 bg-blue-400/20 rounded-lg blur-sm animate-pulse" />
                  </div>
                )}

                {/* Character sprite - only render if not currently moving */}
                {/* Hide character in original position if it's moving */}
                {character && !movingCharacters.has(character.id) && (
                  <div className="absolute inset-0 flex items-center justify-center z-10">
                    <CharacterSprite character={character} />
                  </div>
                )}

                {/* Grid coordinates for debugging */}
                {process.env.NODE_ENV === 'development' && (
                  <div className="absolute top-0 left-0 text-[8px] opacity-30 p-0.5 bg-black/50 rounded-br z-20">
                    {row},{col}
                  </div>
                )}
              </button>
            )
          })
        )}

        {/* Moving characters overlay - rendered above the grid */}
        {Array.from(movingCharacters.entries()).map(([characterId, movement]) => {
          // Use stored character copy or find in board/allCharacters
          const character =
            movement.character ||
            board[movement.from.row]?.[movement.from.col] ||
            allCharacters.find(c => c.id === characterId)
          if (!character) return null

          // Calculate pixel positions relative to grid container
          // Padding is 16px (p-4), cell size is 64px (w-16), gap is 4px (gap-1)
          const padding = 16
          const fromX = padding + movement.from.col * totalCellSize
          const fromY = padding + movement.from.row * totalCellSize
          const toX = padding + movement.to.col * totalCellSize
          const toY = padding + movement.to.row * totalCellSize

          // Calculate translation needed
          const translateX = toX - fromX
          const translateY = toY - fromY

          return (
            <MovingCharacter
              key={`moving-${characterId}`}
              character={character}
              fromX={fromX}
              fromY={fromY}
              translateX={translateX}
              translateY={translateY}
              cellSize={cellSize}
            />
          )
        })}
      </div>
    </div>
  )
}

/**
 * Moving character component with animation
 */
function MovingCharacter({
  character,
  fromX,
  fromY,
  translateX,
  translateY,
  cellSize,
}: {
  character: CombatCharacter
  fromX: number
  fromY: number
  translateX: number
  translateY: number
  cellSize: number
}) {
  const elementRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Trigger animation after component mounts
    if (elementRef.current) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (elementRef.current) {
            elementRef.current.style.transform = `translate(${translateX}px, ${translateY}px)`
          }
        })
      })
    }
  }, [translateX, translateY])

  return (
    <div
      ref={elementRef}
      className="absolute z-50 pointer-events-none"
      style={{
        left: `${fromX}px`,
        top: `${fromY}px`,
        width: `${cellSize}px`,
        height: `${cellSize}px`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transform: 'translate(0px, 0px)',
        transition: 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      <CharacterSprite character={character} />
    </div>
  )
}

/**
 * Character sprite component - reusable for both static and moving characters
 * Shows different animations based on animationState
 */
function CharacterSprite({ character }: { character: CombatCharacter }) {
  const animationState = character.animationState || 'idle'
  const isDefeated = character.stats.hp <= 0

  return (
    <div className="relative">
      {/* Base sprite with animation states */}
      <div
        className={cn(
          'relative transition-all duration-200',
          animationState === 'moving' && 'animate-bounce',
          animationState === 'attacking' && 'animate-pulse',
          animationState === 'casting' && 'animate-pulse',
          animationState === 'hit' && 'animate-shake',
          (animationState === 'defeated' || isDefeated) && 'opacity-50 grayscale'
        )}
      >
        <Image
          src={getCharacterSpritePath(character.class)}
          alt={character.name}
          width={48}
          height={48}
          className={cn(
            'drop-shadow-lg transition-transform duration-200',
            character.team === 'enemy' && 'scale-x-[-1]', // Flip enemy sprites
            animationState === 'attacking' && 'scale-110 brightness-110',
            animationState === 'casting' && 'scale-110 brightness-125',
            animationState === 'hit' && 'brightness-150'
          )}
          unoptimized
          onError={e => {
            // Fallback to colored square if sprite not found
            // Using textContent instead of innerHTML to prevent XSS vulnerabilities
            const target = e.target as HTMLImageElement
            target.style.display = 'none'
            const parent = target.parentElement
            if (parent) {
              // Clear any existing content
              parent.textContent = ''
              // Create fallback element safely
              const fallback = document.createElement('div')
              fallback.className = `w-12 h-12 rounded ${
                character.team === 'player' ? 'bg-blue-500' : 'bg-red-500'
              } flex items-center justify-center text-white text-xs font-bold`
              // Use textContent instead of innerHTML to prevent XSS
              fallback.textContent = character.name.substring(0, 2)
              parent.appendChild(fallback)
            }
          }}
        />

        {/* Attack effect overlay */}
        {animationState === 'attacking' && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none -z-10">
            <div className="w-16 h-16 border-4 border-yellow-400 rounded-full animate-ping opacity-75" />
            <div className="absolute inset-0 bg-gradient-radial from-yellow-400/30 to-transparent" />
            {/* Slash effect */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-8 h-1 bg-yellow-300 rotate-45 animate-pulse" />
            </div>
          </div>
        )}

        {/* Casting effect overlay */}
        {animationState === 'casting' && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none -z-10">
            <div className="w-16 h-16 border-4 border-purple-400 rounded-full animate-ping opacity-75" />
            <div className="absolute inset-0 bg-gradient-radial from-purple-400/30 to-transparent" />
            {/* Magic particles */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 bg-purple-300 rounded-full animate-bounce" />
            <div
              className="absolute top-2 left-1/4 w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce"
              style={{ animationDelay: '75ms' }}
            />
            <div
              className="absolute top-2 right-1/4 w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce"
              style={{ animationDelay: '150ms' }}
            />
            {/* Magic circle */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div
                className="w-12 h-12 border-2 border-purple-300 rounded-full animate-spin"
                style={{ animationDuration: '1s' }}
              />
            </div>
          </div>
        )}

        {/* Hit effect overlay */}
        {animationState === 'hit' && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none -z-10">
            <div className="w-16 h-16 border-4 border-red-500 rounded-full animate-ping opacity-75" />
            <div className="absolute inset-0 bg-gradient-radial from-red-500/40 to-transparent" />
            {/* Impact effect */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-6 h-6 bg-red-400 rounded-full animate-ping" />
            </div>
          </div>
        )}

        {/* Movement trail effect */}
        {animationState === 'moving' && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none -z-10">
            <div className="w-12 h-12 border-2 border-cyan-300 rounded-full animate-pulse opacity-50" />
          </div>
        )}
      </div>

      {/* HP bar */}
      <div className="absolute -bottom-1 left-0 right-0 h-1 bg-black/50 rounded-full overflow-hidden">
        <div
          className={cn(
            'h-full transition-all',
            character.team === 'player' ? 'bg-green-500' : 'bg-red-500'
          )}
          style={{
            width: `${(character.stats.hp / character.stats.maxHp) * 100}%`,
          }}
        />
      </div>
      {/* Team indicator */}
      <div
        className={cn(
          'absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-white',
          character.team === 'player' ? 'bg-blue-500' : 'bg-red-500'
        )}
      />
    </div>
  )
}
