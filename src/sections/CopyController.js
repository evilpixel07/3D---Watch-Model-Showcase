import gsap from "gsap";
import reducedMotion from '../utils/reducedMotion'


export default class CopyController {
    constructor() {
        this._rm = reducedMotion()
        if (!this._rm) this._heroStagger()
    }

    _heroStagger() {
        gsap.fromTo('[data-typo="hero-line-1"]',
            { opacity: 0, y: 40 },
            { opacity: 1, y: 0, duration: 0.8, delay: 0.3, ease: 'power2.out' }
        )
        gsap.fromTo('[data-typo="hero-line-2"]',
            { opacity: 0, y: 40 },
            { opacity: 1, y: 0, duration: 0.8, delay: 0.7, ease: 'power2.out' }
        )
    }

    update(sectionId, progress) {
        const section = document.querySelector(`section[data-section="${sectionId}"]`)
        if (!section) return

        // Reset fixed-position Explore text when not in section 02
        if (sectionId !== '02') {
            const explore = document.querySelector('[data-section="02"] .section_explore_container')
            if (explore) explore.style.opacity = 0
        }

        const headline = section.querySelector('[data-typo="headline"]')
        const body = section.querySelector('[data-typo="body"]')

        // Standard sections: fade in at 0.1–0.3, out at 0.8–1.0
        if (headline && sectionId !== '02' && sectionId !== '06' && sectionId !== '07') {
            const fadeIn = Math.min(1, Math.max(0, (progress - 0.1) / 0.2))
            const fadeOut = Math.min(1, Math.max(0, (1 - progress) / 0.2))
            const opacity = Math.min(fadeIn, fadeOut)
            headline.style.opacity = opacity
            if (body) body.style.opacity = opacity
        }

        // Section 02: hard-cut captions
        if (sectionId === '02') {
            this._section02Captions(progress)
        }

        // Section 06: headline swap at progress 0.42
        if (sectionId === '06') {
            const partA = section.querySelector('[data-collection-part="a"]')
            const partB = section.querySelector('[data-collection-part="b"]')
            if (partA && partB) {
                partA.style.opacity = progress < 0.42 ? 1 : 0
                partB.style.opacity = progress >= 0.42 ? 1 : 0
            }
        }

        // Section 07: no fade — text always visible in footer
        if (sectionId === '07') {
            const wm = section.querySelector('[data-typo="closing-wordmark"]')
            const cl = section.querySelector('[data-typo="closing-line"]')
            if (wm) wm.style.opacity = 1
            if (cl) cl.style.opacity = 1
        }
    }

    _section02Captions(progress) {
        const caps = document.querySelectorAll('[data-section="02"] .section_caption')
        caps.forEach((cap, i) => {
            const start = i * 0.33
            const end = (i + 1) * 0.33
            cap.style.opacity = (progress >= start && progress < end) ? 1 : 0
        })
        const explore = document.querySelector('[data-section="02"] .section_explore_container')
        if (explore) {
            explore.style.opacity = (progress >= 0.66 && progress < 1.01) ? 1 : 0
        }
    }
}