'use client'
import { useEffect, useRef } from 'react'
import gsap from 'gsap'

export function HeroTitle({ text, style, className }: { text: string; style?: React.CSSProperties; className?: string }) {
  const containerRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const ctx = gsap.context(() => {
      gsap.fromTo(
        '.char',
        { opacity: 0, y: 44, rotationX: -20 },
        {
          opacity: 1,
          y: 0,
          rotationX: 0,
          stagger: 0.028,
          duration: 0.65,
          ease: 'power3.out',
        }
      )
    }, el)

    return () => ctx.revert()
  }, [text])

  const words = text.split(' ')

  return (
    <h1 ref={containerRef} style={{ ...style, perspective: 500 }} className={className}>
      {words.map((word, wi) => (
        <span key={wi}>
          {/* nowrap wrapper = browser can only break between words, never mid-word */}
          <span style={{ display: 'inline-block', whiteSpace: 'nowrap' }}>
            {word.split('').map((char, ci) => (
              <span key={ci} className="char" style={{ display: 'inline-block', opacity: 0 }}>
                {char}
              </span>
            ))}
          </span>
          {wi < words.length - 1 && (
            <span className="char" style={{ display: 'inline-block', opacity: 0, whiteSpace: 'pre' }}>{' '}</span>
          )}
        </span>
      ))}
    </h1>
  )
}
