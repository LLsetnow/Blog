<template>
  <div ref="containerRef" class="gradient-waves" aria-hidden="true" />
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, shallowRef, watchEffect } from 'vue'
import { Renderer, Program, Mesh, Triangle } from 'ogl'

/**
 * Vue port of the React Bits `GradientWaves` component.
 *
 * The GLSL is carried over verbatim; the lifecycle is rewritten for Vue. Two
 * deliberate departures from upstream:
 *
 * - Pointer tracking listens on `window`, not the canvas. Used as a full-page
 *   backdrop the host must be `pointer-events: none` or it would swallow every
 *   click, and a non-interactive canvas never receives pointer events.
 * - Animation halts under `prefers-reduced-motion`, matching the rest of the
 *   site. One frame is still painted so the waves are present but static.
 */

interface Props {
  /** Distant haze colour the waves fade into. */
  horizonColor?: string
  /** Mid colour of the rolling wave bodies. */
  waveColor?: string
  /** Highlight colour of the nearest wave crests. */
  crestColor?: string
  speed?: number
  /** Height of the sine-plasma waves. */
  amplitude?: number
  /** Overall spatial frequency of the waves. */
  waveScale?: number
  /** Ratio between the short and long wavelength components. */
  waveRatio?: number
  /** Large-scale horizontal swell distortion. */
  swell?: number
  /** Large-scale cross-flow turbulence distortion. */
  turbulence?: number
  /** Camera pitch toward the horizon (radians). */
  tilt?: number
  zoom?: number
  /** Vertical offset of the horizon line. */
  height?: number
  /** Distance over which the waves fade into haze and transparency. */
  fogDepth?: number
  /** Raymarch quality tier. */
  detail?: 'low' | 'medium' | 'high'
  brightness?: number
  opacity?: number
  mouseInteraction?: boolean
  parallaxStrength?: number
  grain?: boolean
  /** Amplitude of the grain overlay. 0 disables it entirely. */
  grainIntensity?: number
}

const props = withDefaults(defineProps<Props>(), {
  horizonColor: '#5227FF',
  waveColor: '#FF9FFC',
  crestColor: '#FFFFFF',
  speed: 0.4,
  amplitude: 2.5,
  waveScale: 0.6,
  waveRatio: 0.9,
  swell: 35,
  turbulence: 20,
  tilt: 1.11,
  zoom: 1.0,
  height: 5.5,
  fogDepth: 15,
  detail: 'medium',
  brightness: 1.0,
  opacity: 1.0,
  mouseInteraction: true,
  parallaxStrength: 0.5,
  grain: true,
  grainIntensity: 0.05,
})

function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!result) return [1, 1, 1]
  return [
    parseInt(result[1], 16) / 255,
    parseInt(result[2], 16) / 255,
    parseInt(result[3], 16) / 255,
  ]
}

/**
 * Render ceiling, independent of the display's refresh rate.
 *
 * Uncapped this follows the monitor, so a 120Hz panel doubles the GPU cost of
 * an already deep raymarch for motion this slow — the waves drift at a pace
 * where the extra frames are not visible.
 */
const TARGET_FPS = 60
const FRAME_INTERVAL_MS = 1000 / TARGET_FPS

function detailToSteps(detail: Props['detail']): number {
  if (detail === 'low') return 40.0
  if (detail === 'high') return 110.0
  return 70.0
}

const vertex = `#version 300 es
in vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}
`

const fragment = `#version 300 es
precision highp float;
uniform vec2 iResolution;
uniform float iTime;
uniform float uSpeed;
uniform float uAmplitude;
uniform float uWaveScale;
uniform float uWaveRatio;
uniform float uSwell;
uniform float uTurbulence;
uniform float uTilt;
uniform float uZoom;
uniform float uHeight;
uniform float uFogDepth;
uniform float uSteps;
uniform float uBrightness;
uniform float uOpacity;
uniform float uGrain;
uniform float uGrainIntensity;
uniform vec2 uMouse;
uniform float uParallax;
uniform bool uEnableMouse;
uniform vec3 uHorizonColor;
uniform vec3 uWaveColor;
uniform vec3 uCrestColor;
out vec4 fragColor;

const float MAX_DIST = 20000.0;

float hash21(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float plasma(vec3 r, vec2 freq, vec4 tc) {
  float mx = r.x + tc.x;
  mx += uSwell * sin((r.y + mx) / 20.0 + tc.y);
  float my = r.y - tc.z;
  my += uTurbulence * cos(r.x / 23.0 + tc.w);
  return r.z - (sin(mx * freq.x) * uAmplitude + sin(my * freq.y) * uAmplitude + uHeight);
}

float raymarch(vec3 pos, vec3 dir, vec2 freq, vec4 tc) {
  float dist = 0.0;
  for (int i = 0; i < 128; i++) {
    if (float(i) >= uSteps) break;
    float dscene = plasma(pos + dist * dir, freq, tc);
    if (abs(dscene) < 0.1) break;
    dist += 0.9 * dscene;
    if (!(abs(dist) < MAX_DIST)) return MAX_DIST;
  }
  return dist;
}

void main() {
  float T = iTime * uSpeed;
  vec2 freq = vec2(uWaveScale / 7.0, (uWaveScale * uWaveRatio) / 3.0);
  vec4 tc = vec4(T / 0.130, T / 0.810, T / 0.200, T / 0.710);
  float c, s;
  float vfov = (3.14159 / 2.3) / max(uZoom, 0.05);
  vec3 cam = vec3(0.0, 0.0, 30.0);
  vec2 uv = (gl_FragCoord.xy / iResolution.xy) - 0.5;
  uv.x *= iResolution.x / iResolution.y;
  uv.y *= -1.0;

  vec3 dir = vec3(0.0, 0.0, -1.0);
  float ulen = length(uv);
  float xrot = vfov * ulen;
  c = cos(xrot); s = sin(xrot);
  dir = mat3(1.0, 0.0, 0.0, 0.0, c, -s, 0.0, s, c) * dir;
  vec2 nuv = ulen > 1e-5 ? uv / ulen : vec2(1.0, 0.0);
  c = nuv.x; s = nuv.y;
  dir = mat3(c, -s, 0.0, s, c, 0.0, 0.0, 0.0, 1.0) * dir;
  c = cos(uTilt); s = sin(uTilt);
  dir = mat3(c, 0.0, s, 0.0, 1.0, 0.0, -s, 0.0, c) * dir;

  if (uEnableMouse) {
    float yaw = (uMouse.x - 0.5) * uParallax * 0.4;
    float pitch = (uMouse.y - 0.5) * uParallax * 0.4;
    c = cos(yaw); s = sin(yaw);
    dir = mat3(c, 0.0, s, 0.0, 1.0, 0.0, -s, 0.0, c) * dir;
    c = cos(pitch); s = sin(pitch);
    dir = mat3(1.0, 0.0, 0.0, 0.0, c, -s, 0.0, s, c) * dir;
  }

  float dist = raymarch(cam, dir, freq, tc);
  vec3 pos = cam + dist * dir;

  float t = clamp(uFogDepth / max(dist, 0.001), 0.0, 1.0);
  vec3 body = mix(uWaveColor, uCrestColor, clamp(pos.z * 0.08 + 0.5, 0.0, 1.0));
  vec3 col = mix(uHorizonColor, body, t);
  col *= uBrightness;
  col = clamp(col, 0.0, 1.0);

  float alpha = clamp(t, 0.0, 1.0) * uOpacity;
  if (uGrain > 0.5) {
    float g = hash21(gl_FragCoord.xy + mod(iTime, 64.0) * 11.0);
    alpha += (g - 0.5) * uGrainIntensity;
  }
  alpha = clamp(alpha, 0.0, 1.0);
  fragColor = vec4(col * alpha, alpha);
}
`

const containerRef = ref<HTMLDivElement | null>(null)

/**
 * Reactive on purpose. The uniform sync below runs once during setup, before
 * the program exists; holding it in a plain variable meant the watcher tracked
 * nothing, never re-ran, and every uniform kept its constructor default — which
 * left all three colours white and the waves invisible.
 */
const program = shallowRef<Program | null>(null)
let disposeAll: (() => void) | null = null

onMounted(() => {
  const container = containerRef.value
  if (!container) return

  const renderer = new Renderer({
    webgl: 2,
    alpha: true,
    premultipliedAlpha: true,
    antialias: false,
    dpr: Math.min(window.devicePixelRatio || 1, 2),
  })

  const gl = renderer.gl
  gl.clearColor(0, 0, 0, 0)
  const canvas = gl.canvas as HTMLCanvasElement
  canvas.style.width = '100%'
  canvas.style.height = '100%'
  canvas.style.display = 'block'
  container.appendChild(canvas)

  const geometry = new Triangle(gl)
  program.value = new Program(gl, {
    vertex,
    fragment,
    uniforms: {
      iTime: { value: 0 },
      iResolution: { value: new Float32Array([1, 1]) },
      uSpeed: { value: 0.4 },
      uAmplitude: { value: 2.5 },
      uWaveScale: { value: 0.6 },
      uWaveRatio: { value: 0.9 },
      uSwell: { value: 35 },
      uTurbulence: { value: 20 },
      uTilt: { value: 1.11 },
      uZoom: { value: 1.0 },
      uHeight: { value: 5.5 },
      uFogDepth: { value: 15 },
      uSteps: { value: 70.0 },
      uBrightness: { value: 1.0 },
      uOpacity: { value: 1.0 },
      uGrain: { value: 1.0 },
      uGrainIntensity: { value: 0.05 },
      uMouse: { value: new Float32Array([0.5, 0.5]) },
      uParallax: { value: 0.5 },
      uEnableMouse: { value: true },
      uHorizonColor: { value: new Float32Array([1, 1, 1]) },
      uWaveColor: { value: new Float32Array([1, 1, 1]) },
      uCrestColor: { value: new Float32Array([1, 1, 1]) },
    },
  })

  const mesh = new Mesh(gl, { geometry, program: program.value })

  const setSize = () => {
    const rect = container.getBoundingClientRect()
    renderer.setSize(Math.max(1, Math.floor(rect.width)), Math.max(1, Math.floor(rect.height)))
    const res = program.value!.uniforms.iResolution.value as Float32Array
    res[0] = gl.drawingBufferWidth
    res[1] = gl.drawingBufferHeight
    renderer.render({ scene: mesh })
  }

  const ro = new ResizeObserver(setSize)
  ro.observe(container)
  setSize()

  const currentMouse: [number, number] = [0.5, 0.5]
  const targetMouse: [number, number] = [0.5, 0.5]

  // On `window`, not the canvas — see the note at the top of this file.
  const onPointerMove = (e: PointerEvent) => {
    const rect = canvas.getBoundingClientRect()
    targetMouse[0] = (e.clientX - rect.left) / rect.width
    targetMouse[1] = 1.0 - (e.clientY - rect.top) / rect.height
  }
  const onPointerLeave = () => {
    targetMouse[0] = 0.5
    targetMouse[1] = 0.5
  }
  window.addEventListener('pointermove', onPointerMove, { passive: true })
  document.addEventListener('pointerleave', onPointerLeave)

  let raf = 0
  let isVisible = true
  let isPageVisible = !document.hidden
  /**
   * Window focus, tracked separately from tab visibility.
   *
   * `document.hidden` only goes true when the tab is switched away from or the
   * window is minimised — switching to another application leaves it false, so
   * the shader kept running at full rate behind whatever the reader moved on
   * to. That is expensive here: a raymarch of this depth across a retina
   * canvas at 120Hz is real GPU load to be spending on a window nobody is
   * looking at.
   */
  let isFocused = document.hasFocus()
  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
  const t0 = performance.now()

  let lastFrame = 0

  const loop = (t: number) => {
    // Scheduled first so skipped frames still keep the loop alive.
    raf = requestAnimationFrame(loop)

    // Drop frames above the target rate. The tolerance is not cosmetic: on a
    // 120Hz display frames arrive 8.33ms apart, so a 16.66ms gap would lose to
    // a bare 16.67ms threshold and the effective rate would halve again to 40.
    if (t - lastFrame < FRAME_INTERVAL_MS - 1) return
    lastFrame = t

    program.value!.uniforms.iTime.value = (t - t0) * 0.001
    // Read the prop directly: upstream needed a ref to escape the effect's
    // stale closure, Vue's reactive props object is always current.
    const tx = props.mouseInteraction ? targetMouse[0] : 0.5
    const ty = props.mouseInteraction ? targetMouse[1] : 0.5
    currentMouse[0] += 0.05 * (tx - currentMouse[0])
    currentMouse[1] += 0.05 * (ty - currentMouse[1])
    const m = program.value!.uniforms.uMouse.value as Float32Array
    m[0] = currentMouse[0]
    m[1] = currentMouse[1]
    renderer.render({ scene: mesh })
  }

  const tryStart = () => {
    if (motionQuery.matches) return
    if (isVisible && isPageVisible && isFocused && raf === 0) raf = requestAnimationFrame(loop)
  }
  const tryStop = () => {
    if (raf !== 0) {
      cancelAnimationFrame(raf)
      raf = 0
    }
  }

  const io = new IntersectionObserver(
    ([entry]) => {
      isVisible = entry.isIntersecting
      isVisible ? tryStart() : tryStop()
    },
    { threshold: 0 },
  )
  io.observe(container)

  const onVisibility = () => {
    isPageVisible = !document.hidden
    isPageVisible ? tryStart() : tryStop()
  }
  document.addEventListener('visibilitychange', onVisibility)

  const onFocus = () => {
    isFocused = true
    tryStart()
  }
  const onBlur = () => {
    isFocused = false
    tryStop()
  }
  window.addEventListener('focus', onFocus)
  window.addEventListener('blur', onBlur)

  const onMotionChange = () => {
    if (motionQuery.matches) {
      tryStop()
      renderer.render({ scene: mesh })
    } else {
      tryStart()
    }
  }
  motionQuery.addEventListener('change', onMotionChange)

  tryStart()
  // Paint one frame regardless, so an unfocused or reduced-motion load still
  // shows the waves rather than an empty page.
  renderer.render({ scene: mesh })

  disposeAll = () => {
    tryStop()
    ro.disconnect()
    io.disconnect()
    document.removeEventListener('visibilitychange', onVisibility)
    window.removeEventListener('focus', onFocus)
    window.removeEventListener('blur', onBlur)
    motionQuery.removeEventListener('change', onMotionChange)
    window.removeEventListener('pointermove', onPointerMove)
    document.removeEventListener('pointerleave', onPointerLeave)
    try {
      container.removeChild(canvas)
    } catch {
      /* already detached */
    }
    gl.getExtension('WEBGL_lose_context')?.loseContext()
    program.value = null
  }
})

// Mirrors the upstream prop-sync effect; watchEffect tracks whatever it reads.
watchEffect(() => {
  if (!program.value) return
  const u = program.value.uniforms

  u.uSpeed.value = props.speed
  u.uAmplitude.value = props.amplitude
  u.uWaveScale.value = props.waveScale
  u.uWaveRatio.value = props.waveRatio
  u.uSwell.value = props.swell
  u.uTurbulence.value = props.turbulence
  u.uTilt.value = props.tilt
  u.uZoom.value = props.zoom
  u.uHeight.value = props.height
  u.uFogDepth.value = props.fogDepth
  u.uSteps.value = detailToSteps(props.detail)
  u.uBrightness.value = props.brightness
  u.uOpacity.value = props.opacity
  u.uGrain.value = props.grain ? 1.0 : 0.0
  u.uGrainIntensity.value = props.grainIntensity
  u.uParallax.value = props.parallaxStrength
  u.uEnableMouse.value = props.mouseInteraction

  const colors: Array<[string, Float32Array]> = [
    [props.horizonColor, u.uHorizonColor.value as Float32Array],
    [props.waveColor, u.uWaveColor.value as Float32Array],
    [props.crestColor, u.uCrestColor.value as Float32Array],
  ]
  for (const [hex, target] of colors) {
    const [r, g, b] = hexToRgb(hex)
    target[0] = r
    target[1] = g
    target[2] = b
  }
})

onBeforeUnmount(() => {
  disposeAll?.()
  disposeAll = null
})
</script>

<style lang="scss" scoped>
.gradient-waves {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
}
</style>
