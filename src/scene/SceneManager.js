import * as THREE from 'three'
import { HDRLoader } from 'three/examples/jsm/loaders/HDRLoader.js'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import gsap from 'gsap'
import CursorParallax from '../utils/CursorParallax'
import CameraRig from './CameraRig.js'
import SectionController from '../sections/SectionController.js'
import ModelManager from './ModelManager.js'
import LightingRig from './LightingRig.js'
import CopyController from '../sections/CopyController.js'
import EventBus from '../utils/EventBus.js'
import sectionConfig from '../sections/sectionConfig.js'
import reducedMotion from '../utils/reducedMotion'

export default class SceneManager {
    /**
     * @param {HTMLElement}          container
     * @param {HTMLElement}          [gridElement]
     * @param {THREE.LoadingManager} [loadingManager] — from LoaderScreen;
     *   
     */
    constructor(container, gridElement, loadingManager) {
        this.container = container
        this.gridElement = gridElement || null
        this.bgGradient = document.getElementById('bg-gradient')
        this._heroText = document.querySelector('.hero_text')
        this._heroDivider = document.querySelector('.hero_divider')
        this._heroScrollHint = document.querySelector('[data-hero="scroll-hint"]')
        this._loadingManager = loadingManager || null

        this.width = container.clientWidth
        this.height = container.clientHeight

        // Renderer
        this._isMobile = window.innerWidth < 768
        this._rm = reducedMotion()
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, this._isMobile ? 1.5 : 2))
        this.renderer.setSize(this.width, this.height)
        this.renderer.setClearColor(0x000000, 0)
        this.renderer.shadowMap.enabled = true
        this.renderer.shadowMap.type = THREE.PCFShadowMap
        container.appendChild(this.renderer.domElement)

        // Scene
        this.scene = new THREE.Scene()

        // Modules
        this.eventBus = new EventBus()
        this.cameraRig = new CameraRig()
        this.cameraRig.setMobile(this._isMobile)
        // Pass loadingManager so every GLB load is tracked
        this.modelManager = new ModelManager(this.scene, this._loadingManager)
        this.modelManager.setMobile(this._isMobile)
        this.lightingRig = new LightingRig(this.scene, this._isMobile)
        this.copyController = new CopyController()

        // SectionController
        this.sectionController = new SectionController(this.eventBus, this.cameraRig)

        // Camera
        this.camera = new THREE.PerspectiveCamera(38, this.width / this.height, 0.1, 20)
        this.camera.position.set(-0.5, 0.5, 1.88)
        this.camera.lookAt(-0.5, 0, 0)

        // Floor 
        this._setupFloor()

        // Cursor
        this.parallax = new CursorParallax(0.08)

        // State
        this.currentSectionId = '00'
        this.sectionProgress = 0

        // Section change detection
        this._lastSectionId = '00'   // hero is set up at boot
        this.loadingSectionId = '00'
        this.eventBus.on('section:progress', ({ sectionId, progress }) => {
            this.currentSectionId = sectionId
            this.sectionProgress = progress

            // Hero background fade — per storyboard, bg layers fade out
            // over the first 20vh of Section 01 (≈ first 14% of 140vh range)
            let bgOpacity = 1
            if (sectionId === '00') {
                bgOpacity = 1
            } else if (sectionId === '01') {
                bgOpacity = Math.max(0, 1 - progress / 0.14)
            } else {
                bgOpacity = 0
            }
            if (this.bgGradient) this.bgGradient.style.opacity = bgOpacity
            if (this.gridElement) this.gridElement.style.opacity = bgOpacity

            // Hero text + divider fade-out on scroll into section 01
            const heroOpacity = sectionId === '00' ? 1 : sectionId === '01' ? Math.max(0, 1 - progress / 0.14) : 0
            if (this._heroText) {
                this._heroText.style.opacity = heroOpacity
                this._heroText.style.transform = sectionId === '01' ? `translateY(${-30 * Math.min(1, progress / 0.14)}px)` : ''
            }
            if (this._heroDivider) this._heroDivider.style.opacity = heroOpacity * 0.5
            if (this._heroScrollHint) this._heroScrollHint.style.opacity = heroOpacity * 0.6

            if (sectionId !== this._lastSectionId) {
                const config = sectionConfig.find(s => s.id === sectionId)
                if (config) {
                    this._lastSectionId = sectionId
                    // Section 07: start gradual lighting transition from prior state
                    if (sectionId === '07') {
                        this.lightingRig.startTransition(config.lighting)
                    } else {
                        this.lightingRig.apply(config.lighting)
                    }
                    this.loadAndSetup(config)
                }
            }
        })

        // Initialize section 00 at boot
        const heroConfig = sectionConfig.find(s => s.id === '00')
        if (heroConfig) {
            this.modelManager.setup(heroConfig)
            this.lightingRig.apply(heroConfig.lighting)
        }

        // Pre-load all watch models in the background to prevent scroll lag
        sectionConfig.forEach(config => {
            if (config.models) {
                config.models.forEach(m => this.modelManager._ensureLoaded(m.file))
            }
        })

        // Environment (HDRI)
        this._loadEnvironment()

        // Carousel navigation
        this._initCarouselNav()

        // Orbit Controls (Section 02 model-5)
        this._setupOrbitControls()

        // Carousel model drag (Section 06 — rotates model, not camera)
        this._setupCarouselDrag()

        // Expose for debugging
        window.__SM = this

        // Animation
        this.clock = new THREE.Timer()
        this._onResize = this._onResize.bind(this)
        window.addEventListener('resize', this._onResize)
        this._animate()
        if (import.meta.env.DEV) this._setupDebugGUI()
    }

    _setupFloor() {
        const plane = new THREE.Mesh(
            new THREE.PlaneGeometry(4, 4),
            new THREE.ShadowMaterial({ opacity: 0.3 })
        )
        plane.rotation.x = -Math.PI / 2
        plane.position.y = -0.1
        plane.receiveShadow = true
        this.scene.add(plane)
    }

    _loadEnvironment() {
        // Pass the loadingManager to HDRLoader so HDRI is also tracked
        const loader = new HDRLoader(this._loadingManager)
        loader.load('/hdri/provence_studio_2k.hdr', (texture) => {
            texture.mapping = THREE.EquirectangularReflectionMapping
            const pmrem = new THREE.PMREMGenerator(this.renderer)
            const envMap = pmrem.fromEquirectangular(texture).texture
            pmrem.dispose()
            texture.dispose()
            this.scene.environment = envMap
            this.scene.environmentIntensity = 0.3
        })
    }

    _animate() {
        requestAnimationFrame(() => this._animate())

        const delta = this.clock.getDelta()
        const elapsed = this.clock.getElapsed()

        // Section scroll
        this.sectionController.update(delta)

        // Cursor
        this.parallax.update()
        const cursor = this.parallax.get()

        // Models
        this.modelManager.update(this.currentSectionId, this.sectionProgress, delta, elapsed, cursor)

        // Lighting
        this.lightingRig.update(this.currentSectionId, this.sectionProgress)

        // Copy
        this.copyController.update(this.currentSectionId, this.sectionProgress)

        // Grid mask — hero only
        if (this.gridElement && this.currentSectionId === '00') {
            this.gridElement.style.setProperty('--mask-x', `${50 + cursor.posX * 5}%`)
            this.gridElement.style.setProperty('--mask-y', `${50 + cursor.posY * 5}%`)
        }

        // Camera rig & OrbitControls — active only for Section 02 model-5 phase
        const isModel5Active = (this.currentSectionId === '02' && this.sectionProgress >= 0.66 && this.sectionProgress < 1.01)
        const shouldEnableOrbit = isModel5Active

        if (shouldEnableOrbit) {
            if (!this.controls.enabled) {
                this.controls.enabled = true
                this.container.style.pointerEvents = 'auto'
                const cam = this.cameraRig.getTransform()
                this.camera.position.copy(cam.position)
                this.controls.target.copy(cam.target)
                this.controls.update()
                this.startResetTimeout()
            }

            if (this._userInteracting) {
                this.controls.update()
                if (this._resetTimer) clearTimeout(this._resetTimer)
            } else if (this._isResetting) {
                const targetCam = this.cameraRig.getTransform()
                this.camera.position.lerp(targetCam.position, 0.03)
                this.controls.target.lerp(targetCam.target, 0.03)
                this.controls.update()

                if (this.camera.position.distanceTo(targetCam.position) < 0.005 &&
                    this.controls.target.distanceTo(targetCam.target) < 0.005) {
                    this._isResetting = false
                }
            } else {
                this.controls.update()
            }

            const targetCam = this.cameraRig.getTransform()
            if (this.camera.fov !== targetCam.fov) {
                this.camera.fov = targetCam.fov
                this.camera.updateProjectionMatrix()
            }
        } else {
            if (this.controls.enabled) {
                this.controls.enabled = false
                this._userInteracting = false
                this._isResetting = false
                if (this._resetTimer) clearTimeout(this._resetTimer)
            }

            
            this.container.style.pointerEvents = (this.currentSectionId === '06') ? 'auto' : 'none'

            const cam = this.cameraRig.getTransform()
            this.camera.position.copy(cam.position)
            this.camera.lookAt(cam.target)
            if (this.camera.fov !== cam.fov) {
                this.camera.fov = cam.fov
                this.camera.updateProjectionMatrix()
            }
        }

        this.renderer.render(this.scene, this.camera)
    }

    _setupOrbitControls() {
        this.controls = new OrbitControls(this.camera, this.renderer.domElement)
        this.controls.enableDamping = true
        this.controls.dampingFactor = 0.15
        this.controls.enableZoom = false
        // Limit vertical orbit — prevents camera from flipping under the model
        this.controls.minPolarAngle = Math.PI * 0.15
        this.controls.maxPolarAngle = Math.PI * 0.75
        this.controls.enabled = false

        this._userInteracting = false
        this._isResetting = false
        this._resetTimer = null

        this.controls.addEventListener('start', () => {
            this._userInteracting = true
            this._isResetting = false
            if (this._resetTimer) clearTimeout(this._resetTimer)
        })

        this.controls.addEventListener('end', () => {
            this._userInteracting = false
            this._startResetTimeout()
        })
    }

    _startResetTimeout() {
        if (this._resetTimer) clearTimeout(this._resetTimer)
        this._resetTimer = setTimeout(() => {
            const isModel5Active = (this.currentSectionId === '02' && this.sectionProgress >= 0.66 && this.sectionProgress < 1.01)
            if (isModel5Active) {
                this._isResetting = true
            }
        }, 2000)
    }

    _setupCarouselDrag() {
        this._carouselDrag = { active: false, lastX: 0, lastY: 0 }
        this._carouselResetTimer = null

        const el = this.renderer.domElement

        el.addEventListener('pointerdown', (e) => {
            if (this.currentSectionId !== '06') return
            if (!this.modelManager.getFrontCarouselSlot()) return
            this._carouselDrag.active = true
            this._carouselDrag.lastX = e.clientX
            this._carouselDrag.lastY = e.clientY
            el.setPointerCapture(e.pointerId)
            if (this._carouselResetTimer) clearTimeout(this._carouselResetTimer)
        })

        el.addEventListener('pointermove', (e) => {
            if (!this._carouselDrag.active) return
            const dx = e.clientX - this._carouselDrag.lastX
            const dy = e.clientY - this._carouselDrag.lastY
            this._carouselDrag.lastX = e.clientX
            this._carouselDrag.lastY = e.clientY
            // Horizontal drag → Y-axis spin, vertical drag → X-axis tilt
            this.modelManager.addCarouselOrbitDelta(dx * 0.008, dy * 0.005)
        })

        el.addEventListener('pointerup', () => {
            if (!this._carouselDrag.active) return
            this._carouselDrag.active = false

            // Start 2s idle timer; on expiry, smoothly spin model back to default
            if (this._carouselResetTimer) clearTimeout(this._carouselResetTimer)
            this._carouselResetTimer = setTimeout(() => {
                this.modelManager.startCarouselOrbitReset()
            }, 2000)
        })
    }

    _setupDebugGUI() {
        import('lil-gui').then(({ default: GUI }) => {
            const gui = new GUI({ title: 'Controls' })

            // Camera
            const camFolder = gui.addFolder('Camera')
            camFolder.add(this.camera.position, 'x', -2, 2, 0.01).name('Pos X')
            camFolder.add(this.camera.position, 'y', -1, 2, 0.01).name('Pos Y')
            camFolder.add(this.camera.position, 'z', 0, 5, 0.01).name('Pos Z')
            camFolder.add(this.camera, 'fov', 20, 80, 0.5).name('FOV').onChange(() => this.camera.updateProjectionMatrix())
            camFolder.open()

            // Lights
            const lights = this.lightingRig.getLights()
            const lightFolder = gui.addFolder('Lights')
            lightFolder.add(lights.key, 'intensity', 0, 6, 0.1).name('Key')
            lightFolder.add(lights.fill, 'intensity', 0, 3, 0.1).name('Fill')
            if (lights.rim) lightFolder.add(lights.rim, 'intensity', 0, 3, 0.1).name('Rim')
            lightFolder.open()

            // Parallax smoothing
            const watchFolder = gui.addFolder('Watch')
            watchFolder.add(this.parallax, 'lerpFactor', 0.01, 0.5, 0.01).name('Cursor Smoothing')
            watchFolder.open()
        })
    }

    _onResize() {
        this.width = this.container.clientWidth
        this.height = this.container.clientHeight
        this.renderer.setSize(this.width, this.height)
        this.camera.aspect = this.width / this.height
        this.camera.updateProjectionMatrix()

        const wasMobile = this._isMobile
        this._isMobile = window.innerWidth < 768
        if (this._isMobile !== wasMobile) {
            this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, this._isMobile ? 1.5 : 2))
            this.cameraRig.setMobile(this._isMobile)
            this.modelManager.setMobile(this._isMobile)
            this.lightingRig.setMobile(this._isMobile)
        }
    }

    async loadAndSetup(config) {
        const sectionId = config.id
        this.loadingSectionId = sectionId

        if (config.models) {
            
            const allCached = config.models.every(m => {
                const c = this.modelManager._cache.get(m.file)
                return c && c.scene
            })

            if (!allCached) {
                try {
                    for (const entry of config.models) {
                        await this.modelManager._ensureLoaded(entry.file)
                    }
                } catch (err) {
                    console.error(`SceneManager: failed to load models for section ${sectionId}`, err)
                }
                // If the user scrolled away while we were loading, abort!
                if (this.loadingSectionId !== sectionId) return
            }
        }

        // Set up the scene synchronously with the pre-loaded models
        const useFade = config.crossFade === true
        this.modelManager.teardown(useFade)
        this.modelManager.setupSync(config, useFade)
        this.modelManager.applyCarousel(config.id)
        if (useFade) {
            this.modelManager.startCrossFade()
            if (!this._rm) {
                gsap.to(this.container, { filter: 'blur(6px)', duration: 0.15, ease: 'power2.out' })
                gsap.to(this.container, { filter: 'blur(0px)', duration: 0.3, delay: 0.2, ease: 'power2.out' })
            }
        }
    }

    startIntro() {
        const tryPlay = () => {
            if (this.modelManager.playIntro('00')) return
            requestAnimationFrame(() => tryPlay())
        }
        tryPlay()
    }

    _initCarouselNav() {
        const prev = document.querySelector('[data-carousel="prev"]')
        const next = document.querySelector('[data-carousel="next"]')
        if (prev) prev.addEventListener('click', () => this.modelManager.navigateCarousel(-1))
        if (next) next.addEventListener('click', () => this.modelManager.navigateCarousel(1))
    }

    destroy() {
        window.removeEventListener('resize', this._onResize)
        this.parallax.destroy()
        this.renderer.dispose()
        this.container.removeChild(this.renderer.domElement)
    }
}