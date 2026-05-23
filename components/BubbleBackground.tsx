'use client'
import { useEffect, useRef } from 'react'
import gsap from 'gsap'

type Bubble = {
  x: number
  y: number
  r: number
  vspeed: number
}

export function BubbleBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    const W = () => canvas.width
    const H = () => canvas.height

    const bubbles: Bubble[] = Array.from({ length: 18 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      r: 30 + Math.random() * 130,
      vspeed: 0.15 + Math.random() * 0.35,
    }))

    // GSAP tweens for organic horizontal drift on each bubble
    const driftTargets = bubbles.map(b => {
      const target = { x: b.x }
      const amp = 20 + Math.random() * 50
      const dur = 2.5 + Math.random() * 2.5
      const dir = Math.random() > 0.5 ? 1 : -1
      gsap.to(target, {
        x: b.x + dir * amp,
        duration: dur,
        ease: 'sine.inOut',
        yoyo: true,
        repeat: -1,
      })
      return target
    })

    const tick = () => {
      ctx.clearRect(0, 0, W(), H())
      bubbles.forEach((b, i) => {
        b.x = driftTargets[i].x
        b.y -= b.vspeed
        if (b.y + b.r < 0) {
          b.y = H() + b.r
          b.x = Math.random() * W()
          driftTargets[i].x = b.x
        }
        ctx.beginPath()
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(100,200,255,0.03)'
        ctx.fill()
      })
    }

    gsap.ticker.fps(60)
    gsap.ticker.add(tick)

    return () => {
      gsap.ticker.remove(tick)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'fixed', inset: 0, zIndex: -1, pointerEvents: 'none' }}
    />
  )
}
