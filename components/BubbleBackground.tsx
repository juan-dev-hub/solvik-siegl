'use client'
import { useEffect, useRef } from 'react'
import gsap from 'gsap'

type Bubble = { x: number; y: number; r: number; vspeed: number }

export function BubbleBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resize = () => {
      canvas.width  = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    const W = () => canvas.width
    const H = () => canvas.height

    const bubbles: Bubble[] = Array.from({ length: 20 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      r: 40 + Math.random() * 120,
      vspeed: 0.2 + Math.random() * 0.4,
    }))

    // Use gsap.context so ALL tweens are killed on cleanup (fixes Strict Mode)
    const gCtx = gsap.context(() => {})

    const driftTargets = bubbles.map(b => {
      const target = { x: b.x }
      const amp = 25 + Math.random() * 60
      const dur = 3 + Math.random() * 3
      const dir = Math.random() > 0.5 ? 1 : -1
      gCtx.add(() =>
        gsap.to(target, { x: b.x + dir * amp, duration: dur, ease: 'sine.inOut', yoyo: true, repeat: -1 })
      )
      return target
    })

    function resetDrift(target: { x: number }, newX: number) {
      gsap.killTweensOf(target)
      const amp = 25 + Math.random() * 60
      const dur = 3 + Math.random() * 3
      const dir = Math.random() > 0.5 ? 1 : -1
      gCtx.add(() =>
        gsap.to(target, { x: newX + dir * amp, duration: dur, ease: 'sine.inOut', yoyo: true, repeat: -1 })
      )
    }

    const tick = () => {
      ctx.clearRect(0, 0, W(), H())
      bubbles.forEach((b, i) => {
        b.x  = driftTargets[i].x
        b.y -= b.vspeed
        if (b.y + b.r < 0) {
          b.y = H() + b.r
          b.x = Math.random() * W()
          driftTargets[i].x = b.x
          resetDrift(driftTargets[i], b.x)
        }

        const grad = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r)
        grad.addColorStop(0,   'rgba(74,186,255,0.10)')
        grad.addColorStop(0.5, 'rgba(74,186,255,0.06)')
        grad.addColorStop(1,   'rgba(0,100,200,0)')

        ctx.beginPath()
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2)
        ctx.fillStyle = grad
        ctx.fill()

        ctx.beginPath()
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2)
        ctx.strokeStyle = 'rgba(100,200,255,0.08)'
        ctx.lineWidth = 1
        ctx.stroke()
      })
    }

    gsap.ticker.add(tick)

    return () => {
      gsap.ticker.remove(tick)
      gCtx.revert()
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}
    />
  )
}
