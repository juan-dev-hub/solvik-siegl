'use client'
import { useEffect, useRef } from 'react'
import gsap from 'gsap'

export function HeroTitle({ text, style }: { text: string; style?: React.CSSProperties }) {
  const containerRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    // gsap.context scopes all tweens to this element and properly
    // kills them on cleanup — fixes React 18 Strict Mode double-invoke
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

  return (
    <h1 ref={containerRef} style={{ ...style, perspective: 500 }}>
      {text.split('').map((char, i) => (
        <span
          key={i}
          className="char"
          style={{
            display: 'inline-block',
            opacity: 0,
            whiteSpace: char === ' ' ? 'pre' : undefined,
          }}
        >
          {char === ' ' ? ' ' : char}
        </span>
      ))}
    </h1>
  )
}
