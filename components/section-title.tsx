import Image from 'next/image'
import { ReactNode } from 'react'

interface SectionTitleProps {
  title: string
  subtitle?: string | ReactNode
  className?: string
}

/**
 * SectionTitle component - Displays section titles with frame.svg background
 * Used across all pages for consistent title styling
 */
export function SectionTitle({ title, subtitle, className = '' }: SectionTitleProps) {
  return (
    <div className={`mb-8 animate-slide-up flex flex-col items-center ${className}`}>
      <div className="relative w-full max-w-xl mx-auto">
        {/* Frame SVG background */}
        <div className="absolute inset-0 flex items-center justify-center opacity-80">
          <Image
            src="/frame.svg"
            alt=""
            width={400}
            height={112}
            className="w-full h-auto"
            priority
          />
        </div>
        
        {/* Content centered over frame */}
        <div className="relative z-10 flex flex-col items-center justify-center py-8 px-4">
          <h1 className="mb-4 text-5xl font-bold tracking-tight bg-gradient-to-r from-gray-500 via-gray-400 to-gray-500 bg-clip-text text-transparent font-display text-center drop-shadow-[0_0_4px_rgba(156,163,175,0.3)]">
            {title}
          </h1>
          {subtitle && (
            <div className="text-lg text-gray-500 text-center max-w-2xl">
              {subtitle}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
