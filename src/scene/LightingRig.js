import * as THREE from 'three'
import gsap from 'gsap'
import sectionConfig from '../sections/sectionConfig.js'
import reducedMotion from '../utils/reducedMotion'

export default class LightingRig {
    constructor(scene, isMobile) {
        this.scene = scene
        this._isMobile = isMobile || false
        this._lastFlashProgress = -1
        this._rm = reducedMotion()

        // Gradual lighting transition state
        this._fromState = null
        this._toState = null
        this._transitionProgress = 0

        // Create all lights 

        this.lights = {
            key:   new THREE.DirectionalLight(0xffffff, 0),
            fill:  new THREE.DirectionalLight(0xffffff, 0),
            rim:   new THREE.DirectionalLight(0xC9A66B, 0),
            key2:  new THREE.DirectionalLight(0xffffff, 0),
            fill2: new THREE.DirectionalLight(0xffffff, 0),
            rim2:  new THREE.DirectionalLight(0xC9A66B, 0)
        }

        // Key light casts shadows (always, intensity managed by apply)
        this.lights.key.castShadow = true
        const shadowSize = this._isMobile ? 1024 : 2048
        this.lights.key.shadow.mapSize.width = shadowSize
        this.lights.key.shadow.mapSize.height = shadowSize
        this.lights.key.shadow.camera.near = 0.1
        this.lights.key.shadow.camera.far = 10
        this.lights.key.shadow.camera.left = -2
        this.lights.key.shadow.camera.right = 2
        this.lights.key.shadow.camera.top = 2
        this.lights.key.shadow.camera.bottom = -2
        this.lights.key.shadow.radius = 6

        // Add all to scene (they start invisible at intensity 0)
        for (const light of Object.values(this.lights)) {
            this.scene.add(light)
        }
    }

    apply(lighting) {
        if (!lighting) return

        // Environment intensity
        if (lighting.envIntensity !== undefined) {
            gsap.to(this.scene, {
                environmentIntensity: lighting.envIntensity,
                duration: 0.9,
                ease: 'power2.out'
            })
        }

        // Map config keys to light objects
        const lightMap = {
            key:  'key',
            fill: 'fill',
            rim:  'rim',
            key2: 'key2',
            fill2:'fill2',
            rim2: 'rim2'
        }

        for (const [configKey, lightKey] of Object.entries(lightMap)) {
            const config = lighting[configKey]
            const light = this.lights[lightKey]
            if (!light) continue

            if (!config) {
                // Fade this light to zero
                gsap.to(light, { intensity: 0, duration: 0.9, ease: 'power2.out' })
                continue
            }

            // Position
            if (config.position) {
                gsap.to(light.position, {
                    x: config.position[0],
                    y: config.position[1],
                    z: config.position[2],
                    duration: 0.9,
                    ease: 'power2.out'
                })
            }

            // Intensity
            gsap.to(light, { intensity: config.intensity, duration: 0.9, ease: 'power2.out' })

            // Color
            if (config.color) {
                const c = new THREE.Color(config.color)
                gsap.to(light.color, {
                    r: c.r, g: c.g, b: c.b,
                    duration: 0.9,
                    ease: 'power2.out'
                })
            }
        }
    }

    
    startTransition(toLighting) {
        if (!toLighting) return
        this._fromState = this._captureState()
        this._toState = toLighting
        this._transitionProgress = 0
    }

    _captureState() {
        const s = { envIntensity: this.scene.environmentIntensity, lights: {} }
        const names = ['key', 'fill', 'rim', 'key2', 'fill2', 'rim2']
        for (const n of names) {
            const l = this.lights[n]
            if (!l) continue
            s.lights[n] = {
                intensity: l.intensity,
                color: l.color.getHex(),
                position: [l.position.x, l.position.y, l.position.z]
            }
        }
        return s
    }

    _lerpLight(from, to, t) {
        const out = {}
        for (const key of Object.keys(to.lights)) {
            const f = from.lights[key]
            const tgt = to.lights[key]
            if (!f || !tgt) continue
            out[key] = {
                intensity: f.intensity + (tgt.intensity - f.intensity) * t,
                color: new THREE.Color(f.color).lerp(new THREE.Color(tgt.color), t).getHex(),
                position: [
                    f.position[0] + (tgt.position[0] - f.position[0]) * t,
                    f.position[1] + (tgt.position[1] - f.position[1]) * t,
                    f.position[2] + (tgt.position[2] - f.position[2]) * t
                ]
            }
        }
        return { envIntensity: from.envIntensity + (to.envIntensity - from.envIntensity) * t, lights: out }
    }

    _applyTransitionState(state) {
        this.scene.environmentIntensity = state.envIntensity
        const names = ['key', 'fill', 'rim', 'key2', 'fill2', 'rim2']
        for (const n of names) {
            const light = this.lights[n]
            const cfg = state.lights[n]
            if (!light || !cfg) continue
            light.intensity = cfg.intensity
            light.position.set(cfg.position[0], cfg.position[1], cfg.position[2])
            light.color.setHex(cfg.color)
        }
    }

    update(sectionId, progress) {
        const section = sectionConfig.find(s => s.id === sectionId)
        if (!section || !section.lighting) return

        // Section 07)
        if (sectionId === '07' && this._fromState && this._toState) {
            const t = Math.min(1, progress / 0.66)
            if (t < 1 || this._transitionProgress < 1) {
                const state = this._lerpLight(this._fromState, this._toState, t)
                this._applyTransitionState(state)
                this._transitionProgress = t
            }
        }

        // Section 03: key light sweep
        if (!this._rm) {
            const sweep = section.lighting.key?.sweep
            if (sweep && this.lights.key) {
                const from = section.lighting.key.position
                const to = sweep.to
                this.lights.key.position.lerpVectors(
                    new THREE.Vector3(from[0], from[1], from[2]),
                    new THREE.Vector3(to[0], to[1], to[2]),
                    Math.min(1, progress)
                )
            }
        }

        // Section 02: rim-light flash at visibleAt swap points
        if (!this._rm && sectionId === '02') {
            const swapPoints = [0.33, 0.66]
            const rim = this.lights.rim
            if (rim) {
                for (const sp of swapPoints) {
                    if (this._lastFlashProgress < sp && progress >= sp) {
                        const base = section.lighting.rim?.intensity || 1
                        gsap.to(rim, { intensity: base * 2.5, duration: 0.016, overwrite: true })
                        gsap.to(rim, { intensity: base, duration: 0.12, delay: 0.033, ease: 'power2.out' })
                    }
                }
            }
            this._lastFlashProgress = progress
        } else if (sectionId !== '02') {
            this._lastFlashProgress = -1
        }
    }

    setMobile(val) {
        this._isMobile = val
    }

    getLights() {
        return this.lights
    }

    getEnvironmentIntensity() {
        return this.scene.environmentIntensity
    }
}