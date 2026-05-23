'use client'
import { useEffect, useRef } from 'react'
import gsap from 'gsap'

export function HeroTitle({ text, style }: { text: string; style?: React.CSSProperties }) {
  const containerRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const chars = el.querySelectorAll('.char')
    if (!chars.length) return
    gsap.from(chars, {
      opacity: 0,
      y: 40,
      stagger: 0.03,
      duration: 0.6,
      ease: 'power3.out',
    })
  }, [text])

  return (
    <h1 ref={containerRef} style={style}>
      {text.split('').map((char, i) => (
        <span
          key={i}
          className="char"
          style={{ display: 'inline-block', whiteSpace: char === ' ' ? 'pre' : undefined }}
        >
          {char === ' ' ? ' ' : char}
        </span>
      ))}
    </h1>
  )
}
