/**
 * 磁性粒子动画组件
 * 生成中状态时显示不规则运动的液体小星星
 * 鼠标悬浮/靠近时粒子被吸引（磁铁效果）
 * 鼠标快速移动时粒子追不上，恢复无规律运动
 */

import { useEffect, useRef } from 'react'

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  opacity: number
  hue: number
  shape: number
  baseVx: number
  baseVy: number
  attracted: boolean
}

const MagneticParticles = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const mouseRef = useRef({ x: -1000, y: -1000, prevX: -1000, prevY: -1000, speed: 0 })
  const particlesRef = useRef<Particle[]>([])
  const animFrameRef = useRef<number>(0)

  useEffect(() => {
    const canvas = canvasRef.current

    if (!canvas) {
      return
    }

    const ctx = canvas.getContext('2d')

    if (!ctx) {
      return
    }

    // 调整画布尺寸
    const resize = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio
      canvas.height = canvas.offsetHeight * window.devicePixelRatio
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio)
    }

    resize()
    window.addEventListener('resize', resize)

    // 初始化粒子
    const particleCount = 60
    const particles: Particle[] = []

    for (let i = 0; i < particleCount; i++) {
      const baseVx = (Math.random() - 0.5) * 1.5
      const baseVy = (Math.random() - 0.5) * 1.5

      particles.push({
        x: Math.random() * canvas.offsetWidth,
        y: Math.random() * canvas.offsetHeight,
        vx: baseVx,
        vy: baseVy,
        size: Math.random() * 4 + 2,
        opacity: Math.random() * 0.5 + 0.3,
        hue: Math.random() * 60 + 200,
        shape: Math.floor(Math.random() * 3),
        baseVx,
        baseVy,
        attracted: false,
      })
    }

    particlesRef.current = particles

    // 鼠标事件处理
    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      const prevX = mouseRef.current.x
      const prevY = mouseRef.current.y
      const newX = e.clientX - rect.left
      const newY = e.clientY - rect.top
      const dx = newX - prevX
      const dy = newY - prevY
      const speed = Math.sqrt(dx * dx + dy * dy)

      mouseRef.current = { x: newX, y: newY, prevX, prevY, speed }
    }

    const handleMouseLeave = () => {
      mouseRef.current = { x: -1000, y: -1000, prevX: -1000, prevY: -1000, speed: 0 }
    }

    canvas.addEventListener('mousemove', handleMouseMove)
    canvas.addEventListener('mouseleave', handleMouseLeave)

    // 磁铁吸引半径
    const ATTRACT_RADIUS = 150
    const ATTRACT_FORCE = 0.08
    const MAX_ATTRACT_SPEED = 6

    // 绘制不规则星形
    const drawStar = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number, shape: number) => {
      ctx.beginPath()

      if (shape === 0) {
        // 不规则四角星
        const points = 4
        for (let i = 0; i < points * 2; i++) {
          const angle = (i * Math.PI) / points - Math.PI / 2
          const r = i % 2 === 0 ? size : size * (0.3 + Math.random() * 0.3)
          const px = x + Math.cos(angle) * r
          const py = y + Math.sin(angle) * r

          if (i === 0) {
            ctx.moveTo(px, py)
          } else {
            ctx.lineTo(px, py)
          }
        }
      } else if (shape === 1) {
        // 液滴形
        ctx.ellipse(x, y, size * 0.7, size, 0, 0, Math.PI * 2)
      } else {
        // 不规则多边形
        const sides = 5 + Math.floor(Math.random() * 3)
        for (let i = 0; i < sides; i++) {
          const angle = (i * 2 * Math.PI) / sides
          const r = size * (0.5 + Math.random() * 0.5)
          const px = x + Math.cos(angle) * r
          const py = y + Math.sin(angle) * r

          if (i === 0) {
            ctx.moveTo(px, py)
          } else {
            ctx.lineTo(px, py)
          }
        }
      }

      ctx.closePath()
    }

    // 动画循环
    const animate = () => {
      const w = canvas.offsetWidth
      const h = canvas.offsetHeight

      ctx.clearRect(0, 0, w, h)

      const mouse = mouseRef.current
      const mouseSpeed = mouse.speed

      particles.forEach(p => {
        // 计算与鼠标的距离
        const dx = mouse.x - p.x
        const dy = mouse.y - p.y
        const dist = Math.sqrt(dx * dx + dy * dy)

        if (dist < ATTRACT_RADIUS && mouseSpeed < 30) {
          // 鼠标在吸引范围内且移动不快 → 吸引粒子
          const force = ATTRACT_FORCE * (1 - dist / ATTRACT_RADIUS)
          p.vx += dx * force * 0.02
          p.vy += dy * force * 0.02
          p.attracted = true

          // 限制吸引速度
          const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy)
          if (speed > MAX_ATTRACT_SPEED) {
            p.vx = (p.vx / speed) * MAX_ATTRACT_SPEED
            p.vy = (p.vy / speed) * MAX_ATTRACT_SPEED
          }
        } else if (mouseSpeed >= 30) {
          // 鼠标快速移动 → 粒子追不上，恢复自由运动
          p.attracted = false

          // 缓慢恢复到基础速度
          p.vx += (p.baseVx - p.vx) * 0.02
          p.vy += (p.baseVy - p.vy) * 0.02
        } else {
          // 不在吸引范围 → 缓慢恢复自由运动
          if (p.attracted) {
            p.vx += (p.baseVx - p.vx) * 0.01
            p.vy += (p.baseVy - p.vy) * 0.01

            if (Math.abs(p.vx - p.baseVx) < 0.1 && Math.abs(p.vy - p.baseVy) < 0.1) {
              p.attracted = false
            }
          }
        }

        // 更新位置
        p.x += p.vx
        p.y += p.vy

        // 边界反弹
        if (p.x < 0 || p.x > w) {
          p.vx *= -1
          p.x = Math.max(0, Math.min(w, p.x))
        }
        if (p.y < 0 || p.y > h) {
          p.vy *= -1
          p.y = Math.max(0, Math.min(h, p.y))
        }

        // 绘制粒子
        ctx.save()
        ctx.globalAlpha = p.opacity
        const color = `hsla(${p.hue}, 70%, 70%, ${p.opacity})`
        ctx.fillStyle = color
        ctx.shadowColor = color
        ctx.shadowBlur = p.size * 2

        drawStar(ctx, p.x, p.y, p.size, p.shape)
        ctx.fill()
        ctx.restore()
      })

      // 绘制粒子间的连线（距离近时）
      ctx.save()
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x
          const dy = particles[i].y - particles[j].y
          const dist = Math.sqrt(dx * dx + dy * dy)

          if (dist < 80) {
            ctx.strokeStyle = `rgba(180, 180, 220, ${0.15 * (1 - dist / 80)})`
            ctx.lineWidth = 0.5
            ctx.beginPath()
            ctx.moveTo(particles[i].x, particles[i].y)
            ctx.lineTo(particles[j].x, particles[j].y)
            ctx.stroke()
          }
        }
      }
      ctx.restore()

      animFrameRef.current = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      cancelAnimationFrame(animFrameRef.current)
      window.removeEventListener('resize', resize)
      canvas.removeEventListener('mousemove', handleMouseMove)
      canvas.removeEventListener('mouseleave', handleMouseLeave)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        cursor: 'none',
        zIndex: 1,
      }}
    />
  )
}

export default MagneticParticles
