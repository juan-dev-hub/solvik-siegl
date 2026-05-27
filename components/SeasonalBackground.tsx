'use client'
import { useEffect, useRef } from 'react'

type Season = 'spring' | 'summer' | 'autumn' | 'winter'

function getSeason(month: number): Season {
  if (month >= 3 && month <= 5)  return 'spring'
  if (month >= 6 && month <= 8)  return 'summer'
  if (month >= 9 && month <= 11) return 'autumn'
  return 'winter'
}

type Particle = {
  x: number
  y: number
  vx: number
  vy: number
  r: number
  opacity: number
  wobble: number
  wobbleSpeed: number
  wobbleAmp: number
  color: string
}

const SEASON_COLORS: Record<Season, string[]> = {
  spring: ['#FFB7C5', '#FF9EAD', '#FFD1DC', '#E8A0B4'],
  summer: ['#00D4FF', '#40E0FF', '#00B8D9', '#7BE8FF'],
  autumn: ['#D2691E', '#CD853F', '#A0522D', '#E8A04B'],
  winter: ['#FFFFFF', '#B06FFF', '#E0D0FF', '#C8AAFF'],
}

function createParticle(canvas: HTMLCanvasElement, colors: string[]): Particle {
  return {
    x: Math.random() * canvas.width,
    y: -20,
    vx: (Math.random() - 0.5) * 0.6,
    vy: 0.4 + Math.random() * 0.8,
    r: 3 + Math.random() * 5,
    opacity: 0.5 + Math.random() * 0.5,
    wobble: Math.random() * Math.PI * 2,
    wobbleSpeed: 0.02 + Math.random() * 0.03,
    wobbleAmp: 15 + Math.random() * 25,
    color: colors[Math.floor(Math.random() * colors.length)],
  }
}

function drawParticle(ctx: CanvasRenderingContext2D, p: Particle, season: Season) {
  ctx.save()
  ctx.globalAlpha = p.opacity
  ctx.fillStyle = p.color

  if (season === 'winter') {
    // Snowflake
    ctx.beginPath()
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalAlpha = p.opacity * 0.4
    ctx.strokeStyle = p.color
    ctx.lineWidth = 0.5
    for (let i = 0; i < 6; i++) {
      ctx.save()
      ctx.translate(p.x, p.y)
      ctx.rotate((i * Math.PI) / 3)
      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.lineTo(0, p.r * 2.5)
      ctx.stroke()
      ctx.restore()
    }
  } else if (season === 'spring') {
    // Petal
    ctx.translate(p.x, p.y)
    ctx.rotate(p.wobble)
    ctx.beginPath()
    ctx.ellipse(0, 0, p.r, p.r * 1.8, 0, 0, Math.PI * 2)
    ctx.fill()
  } else if (season === 'summer') {
    // Water drop
    ctx.beginPath()
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalAlpha = p.opacity * 0.3
    ctx.beginPath()
    ctx.arc(p.x - p.r * 0.3, p.y - p.r * 0.3, p.r * 0.4, 0, Math.PI * 2)
    ctx.fillStyle = '#ffffff'
    ctx.fill()
  } else {
    // Autumn leaf — simple oval
    ctx.translate(p.x, p.y)
    ctx.rotate(p.wobble)
    ctx.beginPath()
    ctx.ellipse(0, 0, p.r, p.r * 1.5, 0, 0, Math.PI * 2)
    ctx.fill()
  }

  ctx.restore()
}

export function SeasonalBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    // Respect user preference — no animation for reduced-motion devices
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d', { alpha: true, willReadFrequently: false })
    if (!ctx) return

    const month  = new Date().getMonth() + 1 // 1–12
    const season = getSeason(month)
    const colors = SEASON_COLORS[season]

    const resize = () => {
      canvas.width  = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize, { passive: true })

    // Reduce particle count on low-memory devices (deviceMemory is Chrome-only)
    const memory = (navigator as { deviceMemory?: number }).deviceMemory ?? 4
    const MAX_PARTICLES = memory <= 2 ? 12 : 20

    const particles: Particle[] = []
    let animId: number
    let lastSpawn = 0
    let paused = false

    const c = canvas
    const x = ctx

    const handleVisibility = () => { paused = document.hidden }
    document.addEventListener('visibilitychange', handleVisibility)

    function tick(now: number) {
      animId = requestAnimationFrame(tick)
      if (paused) return

      x.clearRect(0, 0, c.width, c.height)

      if (particles.length < MAX_PARTICLES && now - lastSpawn > 500) {
        particles.push(createParticle(c, colors))
        lastSpawn = now
      }

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]
        p.wobble += p.wobbleSpeed
        p.x += p.vx + Math.sin(p.wobble) * p.wobbleAmp * 0.02
        p.y += p.vy

        drawParticle(x, p, season)

        if (p.y > c.height + 30) {
          particles.splice(i, 1)
        }
      }
    }

    animId = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', resize)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}
    />
  )
}
