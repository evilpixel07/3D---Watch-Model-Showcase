import sectionConfig from '../sections/sectionConfig.js'

export default class NavController {
    constructor() {
        this.burger = document.querySelector('[data-ui="burger_menu"]')
        this.overlay = document.getElementById('nav-overlay')
        this.inner = this.overlay?.querySelector('.nav-overlay_inner')
        this._lastFocused = null

        if (!this.burger || !this.overlay || !this.inner) return

        this._generateLinks()
        this._bindEvents()
        this._initNavbarScroll()
    }

    _initNavbarScroll() {
        const navbar = document.getElementById('navbar')
        if (!navbar) return
        const onScroll = () => {
            if (window.scrollY > window.innerHeight * 0.5) {
                navbar.classList.add('navbar--scrolled')
            } else {
                navbar.classList.remove('navbar--scrolled')
            }
        }
        window.addEventListener('scroll', onScroll, { passive: true })
        onScroll()
    }

    _generateLinks() {
        sectionConfig.forEach(s => {
            const a = document.createElement('a')
            a.href = 'javascript:void(0)'
            a.textContent = s.name
            a.dataset.section = s.id
            this.inner.appendChild(a)
        })
    }

    _getFocusableElements() {
        return [...this.inner.querySelectorAll('a')]
    }

    _trapFocus(e) {
        if (e.key === 'Escape') { this.close(); return }
        if (e.key !== 'Tab') return

        const focusable = this._getFocusableElements()
        if (focusable.length === 0) return

        const first = focusable[0]
        const last = focusable[focusable.length - 1]

        if (e.shiftKey) {
            if (document.activeElement === first) {
                e.preventDefault()
                last.focus()
            }
        } else {
            if (document.activeElement === last) {
                e.preventDefault()
                first.focus()
            }
        }
    }

    _bindEvents() {
        this.burger.addEventListener('click', () => this.toggle())

        this.inner.addEventListener('click', e => {
            e.preventDefault()
            const link = e.target.closest('a')
            if (!link) return
            this.close()
            const target = document.querySelector(`section[data-section="${link.dataset.section}"]`)
            if (target) target.scrollIntoView({ behavior: 'smooth' })
        })

        this.overlay.addEventListener('keydown', (e) => this._trapFocus(e))
    }

    toggle() {
        const opening = !this.overlay.classList.contains('nav-overlay--open')
        if (opening) {
            this._lastFocused = document.activeElement
            this.overlay.classList.add('nav-overlay--open')
            const focusable = this._getFocusableElements()
            if (focusable.length > 0) focusable[0].focus()
        } else {
            this.close()
        }
    }

    close() {
        this.overlay.classList.remove('nav-overlay--open')
        if (this._lastFocused && this._lastFocused.focus) {
            this._lastFocused.focus()
            this._lastFocused = null
        }
    }
}