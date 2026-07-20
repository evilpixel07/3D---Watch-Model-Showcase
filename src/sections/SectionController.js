import sectionConfig from "./sectionConfig.js";

export default class SectionController {
    constructor(eventBus, cameraRig) {
        this.eventBus = eventBus
        this.cameraRig = cameraRig
        this.sections = []

        let totalVH = 0
        sectionConfig.forEach(section => {
            this.sections.push({
                ...section,
                startVH: totalVH,
                endVH: totalVH + section.duration
            })
            totalVH += section.duration
        })

        this.totalVH = totalVH
        this.smoothProgress = 0
        this.rawProgress = 0
        this.currentSectionId = '00'
        this.currentProgress = 0

        // Velocity-adaptive lerp
        this.lerpFactor = 0.08
        this._minLerp = 0.04
        this._maxLerp = 0.3
        this._scrollVelocity = 0
        this._lastRaw = 0
        this._lastScrollTime = performance.now()

        // Capture initial scroll position immediately
        const maxScroll = document.documentElement.scrollHeight - window.innerHeight
        this.rawProgress = maxScroll > 0 ? window.scrollY / maxScroll : 0
        this._lastRaw = this.rawProgress

        this._onScroll = this._onScroll.bind(this)
        window.addEventListener('scroll', this._onScroll, { passive: true })
    }

    _onScroll() {
        const now = performance.now()
        const dt = Math.max(1, now - this._lastScrollTime)

        const maxScroll = document.documentElement.scrollHeight - window.innerHeight
        const newRaw = maxScroll > 0 ? window.scrollY / maxScroll : 0

        this._scrollVelocity = Math.abs(newRaw - this._lastRaw) / (dt / 1000)
        this._lastRaw = newRaw
        this._lastScrollTime = now
        this.rawProgress = newRaw
    }

    update(delta) {
        const v = this._scrollVelocity
        this.lerpFactor = this._minLerp + (this._maxLerp - this._minLerp) * (1 - Math.exp(-v * 12))
        this._scrollVelocity *= Math.pow(0.001, delta)

        this.smoothProgress += (this.rawProgress - this.smoothProgress) * this.lerpFactor

        const scrollVH = this.smoothProgress * this.totalVH

        let active = this.sections[0]
        for (let i = this.sections.length - 1; i >= 0; i--) {
            if (scrollVH >= this.sections[i].startVH) {
                active = this.sections[i]
                break
            }
        }

        const localProgress = Math.min(1,
            (scrollVH - active.startVH) / active.duration
        )

        this.currentSectionId = active.id
        this.currentProgress = localProgress

        this.cameraRig.update(active.id, localProgress)
        this.eventBus.emit('section:progress', {
            sectionId: active.id,
            progress: localProgress
        })
    }

    destroy() {
        window.removeEventListener('scroll', this._onScroll)
    }
}
