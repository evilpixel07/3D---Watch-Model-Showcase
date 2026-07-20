

import * as THREE from 'three'
import gsap from 'gsap'

const BEZEL_RADIUS  = 54                          
const BEZEL_CIRCUM  = 2 * Math.PI * BEZEL_RADIUS  
const MIN_DISPLAY_MS = 3200   
const HOLD_MS        = 700    
const EXIT_DUR       = 1    
const LERP_DUR       = 1    

/** @returns {boolean} */
const prefersReduced = () =>
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

export default class LoaderScreen {

    constructor() {
        this._progress  = 0           // 0–1 real loading fraction
        this._exiting   = false
        this._allLoaded = false       
        this._gsapProxy = { val: 0 }  
        this._startTime = Date.now()

        // Resolves after the full exit animation completes
        this._readyPromise = new Promise(res => { this._resolveReady = res })

        this._manager = new THREE.LoadingManager(
             () => this._onAllLoaded(),
             (_url, loaded, total) => this._onProgress(loaded, total),
            (url)                  => {
                console.warn('[LoaderScreen] Asset failed:', url)
                this._progress = Math.min(1, this._progress + 0.04)
                this._syncGSAP()
            }
        )

        // DOM refs (populated in _build)
        this._el        = null
        this._numberEl  = null
        this._barFillEl = null
        this._ringEl    = null
        this._handEl    = null
        this._labelEl   = null
        this._stageEl   = null
        this._barWrapEl = null
        this._gleamEl   = null

        this._build()
        this._bodyOverflow = document.body.style.overflow
        document.body.style.overflow = 'hidden'
    }

    
    init() {
        this._playEntrance()
        this._tickHand()
    }

    getManager() { return this._manager }

    ready() { return this._readyPromise }

    // ─── DOM Construction ────

    _build() {
        const el = document.createElement('div')
        el.id = 'arcis-loader'
        el.setAttribute('role',       'status')
        el.setAttribute('aria-label', 'Loading Arcis — please wait')
        el.setAttribute('aria-live',  'polite')

        el.innerHTML = /* html */ `
            <!-- Ivory background panel -->
            <div class="al-bg"    aria-hidden="true"></div>
            <!-- Subtle noise-grain overlay -->
            <div class="al-grain" aria-hidden="true"></div>

            <!-- ─── Centre stage ──────────────────────────────── -->
            <div class="al-stage" aria-hidden="true">

                <!-- Watch-bezel precision ring -->
                <div class="al-ring-wrap">
                    <svg class="al-svg" viewBox="0 0 120 120"
                         xmlns="http://www.w3.org/2000/svg" aria-hidden="true">

                        <!-- 60 minute-tick markers (real watch dial) -->
                        <g class="al-ticks">${this._buildTicks()}</g>

                        <!-- Ghost track -->
                        <circle class="al-track"
                                cx="60" cy="60" r="${BEZEL_RADIUS}"
                                fill="none" stroke-width="0.75" />

                        <!-- Progress fill ring (clockwise fill) -->
                        <circle id="al-ring" class="al-ring"
                                cx="60" cy="60" r="${BEZEL_RADIUS}"
                                fill="none"
                                stroke-width="1.5"
                                stroke-dasharray="${BEZEL_CIRCUM.toFixed(3)}"
                                stroke-dashoffset="${BEZEL_CIRCUM.toFixed(3)}"
                                stroke-linecap="round"
                                transform="rotate(-90 60 60)" />

                        <!-- Diamond centre ornament -->
                        <polygon class="al-diamond"
                                 points="60,50 63.5,60 60,70 56.5,60" />

                        <!-- Sweep second hand (rAF-driven) -->
                        <line id="al-hand" class="al-hand"
                              x1="60" y1="60" x2="60" y2="10"
                              stroke-linecap="round" />

                        <!-- Centre pivot -->
                        <circle class="al-centre-dot" cx="60" cy="60" r="2" />

                    </svg>
                </div>

                <!-- Brand wordmark -->
                <div class="al-wordmark" aria-hidden="true">ARCIS</div>

                <!-- Animated percentage -->
                <div class="al-pct-wrap" aria-hidden="true">
                    <span class="al-pct" id="al-pct">00</span
                    ><span class="al-pct-sym">%</span>
                </div>

                <!-- Status label -->
                <div class="al-label" aria-hidden="true">
                    <span id="al-label-text" class="al-label-text">Preparing experience</span>
                    <span class="al-label-dots" aria-hidden="true"></span>
                </div>

            </div>
            <!-- ─────────────────────────────────────────────── -->

            <!-- Thin precision progress bar (bottom) -->
            <div class="al-bar-wrap" aria-hidden="true">
                <div class="al-bar-bg"></div>
                <div class="al-bar-fill"  id="al-bar-fill"></div>
                <div class="al-bar-gleam" id="al-bar-gleam"></div>
            </div>

            <!-- Corner typographic stamps -->
            <div class="al-stamp al-stamp--tl" aria-hidden="true">EST.&nbsp;MMXXV</div>
            <div class="al-stamp al-stamp--br" aria-hidden="true">SWISS&nbsp;CRAFTED</div>
        `

        document.body.appendChild(el)

        this._el        = el
        this._numberEl  = el.querySelector('#al-pct')
        this._barFillEl = el.querySelector('#al-bar-fill')
        this._ringEl    = el.querySelector('#al-ring')
        this._handEl    = el.querySelector('#al-hand')
        this._labelEl   = el.querySelector('#al-label-text')
        this._stageEl   = el.querySelector('.al-stage')
        this._barWrapEl = el.querySelector('.al-bar-wrap')
        this._gleamEl   = el.querySelector('#al-bar-gleam')
    }

    // starting ticks
    _buildTicks() {
        const lines = []
        for (let i = 0; i < 60; i++) {
            const isMajor = i % 5 === 0
            const outerR  = 57
            const innerR  = outerR - (isMajor ? 5 : 2.5)
            const sw      = isMajor ? 0.9 : 0.35
            const rad     = ((i / 60) * 360 - 90) * (Math.PI / 180)
            const cos     = Math.cos(rad)
            const sin     = Math.sin(rad)
            lines.push(
                `<line x1="${(60 + outerR * cos).toFixed(2)}"` +
                ` y1="${(60 + outerR * sin).toFixed(2)}"` +
                ` x2="${(60 + innerR * cos).toFixed(2)}"` +
                ` y2="${(60 + innerR * sin).toFixed(2)}"` +
                ` stroke-width="${sw}" />`
            )
        }
        return lines.join('\n')
    }

    

    _onProgress(loaded, total) {
        if (total > 0) {
            
            this._progress = Math.min(loaded / total, 0.97)
        } else {
            this._progress = Math.min(this._progress + 0.08, 0.95)
        }
        this._syncGSAP()
        this._updateLabel(loaded, total)
    }

    _onAllLoaded() {
        this._allLoaded = true
        this._progress  = 1
        this._syncGSAP()
        if (this._labelEl) this._labelEl.textContent = 'Ready'

        
        const elapsed    = Date.now() - this._startTime
        const lerpMs     = LERP_DUR * 1000   
        const remainingMin = Math.max(0, MIN_DISPLAY_MS - elapsed)
        const delay      = Math.max(remainingMin, lerpMs) + HOLD_MS

        setTimeout(() => this._exit(), delay)
    }

    // ─── GSAP smooth counter ───
    _syncGSAP() {
        const target = Math.round(this._progress * 100)

        if (prefersReduced()) {
            this._gsapProxy.val = target
            this._applyDisplay(target)
            return
        }

        gsap.to(this._gsapProxy, {
            val: target,
            duration: LERP_DUR,
            ease: 'power2.out',
            overwrite: true,
            onUpdate: () => this._applyDisplay(Math.round(this._gsapProxy.val))
        })
    }

    _applyDisplay(val) {
        this._numberEl.textContent = String(val).padStart(2, '0')

        this._barFillEl.style.width = val + '%'

        const offset = BEZEL_CIRCUM * (1 - val / 100)
        this._ringEl.setAttribute('stroke-dashoffset', offset.toFixed(3))

        if (this._gleamEl) {
            this._gleamEl.style.left = `calc(${val}% - 60px)`
        }
    }

    _updateLabel(loaded, total) {
        const msgs = [
            'Preparing experience',
            'Calibrating optics',
            'Polishing surfaces',
            'Setting the movement',
            'Winding the mainspring',
            'Aligning the hands',
            'Closing the caseback',
        ]
        const frac = total > 0 ? loaded / total : 0
        const idx  = Math.min(Math.floor(frac * msgs.length), msgs.length - 1)
        if (this._labelEl) this._labelEl.textContent = msgs[idx]
    }

    // ─── Entrance ──

    _playEntrance() {
        if (prefersReduced()) return

        // Stage fade
        gsap.from(this._stageEl, {
            opacity: 0,
            y: 18,
            duration: 1.0,
            ease: 'power3.out',
            delay: 0.1
        })
        // Bar fade
        gsap.from(this._barWrapEl, {
            opacity: 0,
            duration: 0.8,
            delay: 0.55,
            ease: 'power2.out'
        })
        //  stamps 
        gsap.from(this._el.querySelectorAll('.al-stamp'), {
            opacity: 0,
            duration: 0.7,
            delay: 0.8,
            stagger: 0.18,
            ease: 'power2.out'
        })
    }


    _tickHand() {
        if (prefersReduced() || !this._handEl) return

        let angle   = -90
        let lastNow = performance.now()

        const tick = (now) => {
            if (this._exiting) return
            const dt = (now - lastNow) / 1000
            lastNow  = now
            angle = (angle + dt * 6) % 360
            const rad = angle * (Math.PI / 180)
            this._handEl.setAttribute('x2', (60 + 44 * Math.cos(rad)).toFixed(3))
            this._handEl.setAttribute('y2', (60 + 44 * Math.sin(rad)).toFixed(3))
            requestAnimationFrame(tick)
        }

        requestAnimationFrame(tick)
    }

    // ─── Exit sequence ──

    _exit() {
        if (this._exiting) return
        this._exiting = true

        if (prefersReduced()) {
            this._el.style.display = 'none'
            document.body.style.overflow = this._bodyOverflow
            document.body.classList.add('site-ready')
            this._resolveReady()
            return
        }

        const tl = gsap.timeline({
            onComplete: () => {
                this._el.remove()
                document.body.style.overflow = this._bodyOverflow
                document.body.classList.add('site-ready')
                this._resolveReady()
            }
        })

        tl.to(this._ringEl, {
            attr: { 'stroke-width': 3 },
            duration: 0.12,
            ease: 'power2.in'
        })
        tl.to(this._ringEl, {
            attr: { 'stroke-width': 1.5 },
            duration: 0.22,
            ease: 'power2.out'
        })

        // label fade up and out
        tl.to(this._el.querySelector('.al-pct-wrap'), {
            opacity: 0,
            y: -12,
            duration: 0.3,
            ease: 'power2.in'
        }, '+=0.08')
        tl.to(this._el.querySelector('.al-label'), {
            opacity: 0,
            duration: 0.22,
            ease: 'power2.in'
        }, '<')

        tl.to(this._stageEl, {
            scale: 1.06,
            opacity: 0,
            duration: 0.48,
            ease: 'power3.in'
        }, '-=0.12')

        // cinematic curtain lift
        tl.to(this._el, {
            y: '-100%',
            duration: EXIT_DUR,
            ease: 'power4.inOut'
        }, '-=0.14')
    }

    // ─── Force destroy 

    destroy() {
        this._exiting = true
        document.body.style.overflow = this._bodyOverflow
        if (this._el && this._el.parentNode) this._el.remove()
        this._resolveReady()
    }
}
