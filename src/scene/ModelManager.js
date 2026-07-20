import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import sectionConfig from '../sections/sectionConfig.js'
import gsap from 'gsap'
import reducedMotion from '../utils/reducedMotion'


export default class ModelManager {
    /**
     * @param {THREE.Scene}          scene
     * @param {THREE.LoadingManager} [loadingManager]
     */
    constructor(scene, loadingManager) {
        this.scene = scene

        this._cache = new Map()

        this._active = new Map()

        this._rotations = new Map()

        this._heroIntroPlayed = false
        this._isMobile = false
        this._rm = reducedMotion()

        // Carousel state
        this._carouselIndex = 0
        this._carouselAngle = 0
        this._carouselTargetAngle = 0
        this._carouselRadius = 1.1
        this._carouselBaseScale = 0.5
        this._carouselFrontScale = 1.0
        this._carouselTween = null

        // Carousel interactive orbit 
        this._carouselOrbitY = 0       
        this._carouselOrbitX = 0       
        this._carouselOrbitResetting = false

        this._handNodes = new Map()

        // Cross-fade state
        this._transitionFading = []
        this._fadingGroups = []

        this._loader = new GLTFLoader(loadingManager)
        const draco = new DRACOLoader()
        draco.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/')
        this._loader.setDRACOLoader(draco)

    }

    static TARGET_SIZE = 0.6

    async _ensureLoaded(filePath) {
        const cached = this._cache.get(filePath)

        if (cached) {
            if (cached.scene) return cached.scene
            return cached.pending
        }

        const pending = this._loader.loadAsync(filePath).then(gltf => {

            const raw = gltf.scene || gltf.scenes[0]

            const box = new THREE.Box3().setFromObject(raw)
            const size = new THREE.Vector3()
            box.getSize(size)

            const maxDim = Math.max(size.x, size.y, size.z)
            if (maxDim > 0) {
                const scale = ModelManager.TARGET_SIZE / maxDim
                raw.scale.multiplyScalar(scale)
            }

            // Recompute bounding box AFTER scaling, then offset to floor
            const scaledBox = new THREE.Box3().setFromObject(raw)
            raw.position.y -= scaledBox.min.y

            // Wrap in a group so clone() copies the transform cleanly
            const wrapper = new THREE.Group()
            wrapper.add(raw)

            this._cache.set(filePath, { scene: wrapper })
            return wrapper
        })

        this._cache.set(filePath, { pending })
        return pending
    }

    async setup(config) {
        if (!config.models) return
        for (const entry of config.models) {
            const { slot, file, position, behavior, visibleAt } = entry

            try {
                const srcScene = await this._ensureLoaded(file)
                const clone = srcScene.clone()

                const usePos = (this._isMobile && entry.mobile && entry.mobile.position)
                    ? entry.mobile.position
                    : position
                const pos = usePos || [0, 0, 0]

                clone.position.set(pos[0], pos[1], pos[2])

                if (!this._active.has(slot)) {
                    this._active.set(slot, [])

                }
                this._active.get(slot).push(clone)

                // Initial Y rotation 
                if (behavior && behavior.initialRotY !== undefined) {
                    const initRad = THREE.MathUtils.degToRad(behavior.initialRotY)
                    clone.rotation.y = initRad
                    this._rotations.set(slot, initRad)
                } else if (!this._rotations.has(slot)) {
                    this._rotations.set(slot, 0)
                }

                if (visibleAt && visibleAt.start > 0) {
                    clone.visible = false
                }

                // Per-model size multiplier
                const targetScale = entry.size || 1
                clone.userData._targetScale = targetScale

                //scale up(hero) 
                if (behavior && behavior.intro && behavior.intro.scale) {
                    if (!this._heroIntroPlayed) {
                        clone.scale.set(0, 0, 0)
                        clone.userData._introPending = behavior.intro
                    }
                }
                if (!clone.userData._introPending) {
                    clone.scale.multiplyScalar(targetScale)
                }

                // enable shadows
                clone.traverse(child => {
                    if (child.isMesh) {
                        child.castShadow = true
                        child.receiveShadow = true
                    }
                })
                this.scene.add(clone)
                this._discoverHandNodes(clone)

            } catch (err) {
                console.error(`ModelManager: failed to load ${file} (slot ${slot})`, err)
            }

        }
    }

    setupSync(config, crossFade = false) {
        if (!config.models) return
        for (const entry of config.models) {
            const { slot, file, position, behavior, visibleAt } = entry

            try {
                const cached = this._cache.get(file)
                if (!cached || !cached.scene) {
                    console.error(`ModelManager: model ${file} not found in cache during synchronous setup`)
                    continue
                }
                const srcScene = cached.scene
                const clone = srcScene.clone()

                // Use mobile position override when on mobile
                const usePos = (this._isMobile && entry.mobile && entry.mobile.position)
                    ? entry.mobile.position
                    : position

                const pos = usePos || [0, 0, 0]

                clone.position.set(pos[0], pos[1], pos[2])

                if (!this._active.has(slot)) {
                    this._active.set(slot, [])

                }
                this._active.get(slot).push(clone)

                // Initial Y rotation 
                if (behavior && behavior.initialRotY !== undefined) {
                    const initRad = THREE.MathUtils.degToRad(behavior.initialRotY)
                    clone.rotation.y = initRad
                    this._rotations.set(slot, initRad)
                } else if (!this._rotations.has(slot)) {
                    this._rotations.set(slot, 0)
                }

                if (visibleAt && visibleAt.start > 0) {
                    clone.visible = false
                }

                // Per-model size multiplier
                const targetScale = entry.size || 1
                clone.userData._targetScale = targetScale

                //scale up(hero) 
                if (behavior && behavior.intro && behavior.intro.scale) {
                    if (!this._heroIntroPlayed) {
                        clone.scale.set(0, 0, 0)
                        clone.userData._introPending = behavior.intro
                    }
                }
                if (!clone.userData._introPending) {
                    clone.scale.multiplyScalar(targetScale)
                }

                // enable shadows
                clone.traverse(child => {
                    if (child.isMesh) {
                        child.castShadow = true
                        child.receiveShadow = true
                    }
                })
                this.scene.add(clone)
                this._discoverHandNodes(clone)

                // Cross-fade: start invisible if old models are fading out
                if (crossFade && this._transitionFading.length > 0) {
                    this._makeMaterialClones(clone)
                    this._setOpacity(clone, 0)
                }

            } catch (err) {
                console.error(`ModelManager: failed to setup ${file} (slot ${slot})`, err)
            }
        }
    }



    //update
    update(sectionId, progress, deltaTime, totalTime, cursor) {
        const section = sectionConfig.find(s => s.id === sectionId)
        if (!section || !section.models) return

        let hasCarousel = false

        for (const entry of section.models) {
            const { slot, position, behavior, visibleAt } = entry
            const groups = this._active.get(slot)
            if (!groups) continue

            const bhv = behavior || {}
            const basePos = position || [0, 0, 0]

            for (const group of groups) {
                // Visibility
                if (visibleAt) {
                    group.visible = (progress >= visibleAt.start && progress < visibleAt.end)
                }
                if (!group.visible) continue

                // Y-rotation accumulator
                if (bhv.rotY && !this._rm) {
                    const prev = this._rotations.get(slot) || 0
                    const step = THREE.MathUtils.degToRad(bhv.rotY) * deltaTime
                    const newRot = prev + step
                    this._rotations.set(slot, newRot)
                    group.rotation.y = newRot
                }

                // Staggered fade-out (section 07)
                if (bhv.fadeOut && !group.userData._staggerDone && !this._rm) {
                    if (progress >= bhv.fadeOut.startProgress) {
                        group.userData._staggerDone = true
                        this._makeMaterialClones(group)
                        const mats = []
                        group.traverse(c => {
                            if (c.isMesh && c.material) {
                                if (Array.isArray(c.material)) c.material.forEach(m => mats.push(m))
                                else mats.push(c.material)
                            }
                        })
                        // Disable shadow 
                        group.traverse(c => { if (c.isMesh) c.castShadow = false })
                        gsap.to(mats, {
                            opacity: 0,
                            duration: 0.5,
                            ease: 'power2.inOut',
                            delay: bhv.fadeOut.delay || 0
                        })
                    }
                }

                // Float offset
                let floatY = 0
                if (bhv.float && !this._rm) {
                    floatY = Math.sin(totalTime * (bhv.float.speed || 0.8)) * (bhv.float.amp || 0.02)
                }

                // Parallax — hero
                if (bhv.parallax && cursor && sectionId === '00' && !this._rm) {
                    group.position.x = basePos[0] + cursor.posX * 0.03
                    group.position.y = basePos[1] + cursor.posY * 0.03 + floatY
                    group.rotation.x = THREE.MathUtils.degToRad(cursor.rotY * 3)
                    group.rotation.y += THREE.MathUtils.degToRad(cursor.rotX * 3)
                } else if (bhv.carousel) {
                    const offset = bhv.carousel.offset || 0
                    const radius = this._carouselRadius
                    const modelAngle = this._carouselAngle + offset

                    // Closeness to front 
                    let diff = ((modelAngle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)
                    if (diff > Math.PI) diff = 2 * Math.PI - diff
                    const closeness = Math.max(0, 1 - diff / Math.PI)
                    const isFront = closeness > 0.92

                    if (isFront) {
                        // Pull to world centre and  elevate
                        group.position.x = radius * Math.sin(modelAngle) * (1 - closeness)
                        group.position.z = radius * Math.cos(modelAngle) * (1 - closeness)
                        group.position.y = (basePos[1] || 0) + 0.12 + floatY
                        // Apply drag orbit rotation on top of the auto rotY accumulator
                        const baseRotY = this._rotations.get(slot) || 0
                        group.rotation.y = baseRotY + this._carouselOrbitY
                        group.rotation.x = this._carouselOrbitX
                    } else {
                        group.position.x = radius * Math.sin(modelAngle)
                        group.position.z = radius * Math.cos(modelAngle)
                        group.position.y = (basePos[1] || 0) + floatY
                    }
                    hasCarousel = true
                } else {

                    group.position.x = basePos[0]
                    group.position.y = basePos[1] + floatY
                    group.position.z = basePos[2]
                }

                // Scroll-driven scale animation
                if (bhv.scaleEnd) {
                    const startScale = entry.size || 1
                    const s = startScale + (bhv.scaleEnd - startScale) * progress
                    group.scale.set(s, s, s)
                }

                // Procedural watch hand animation
                if (!this._rm) {
                    const hands = this._handNodes.get(group)
                    if (hands) {
                        for (const { mesh, speed } of hands) {
                            mesh.rotation.z = THREE.MathUtils.degToRad(speed * totalTime)
                        }
                    }
                }
            }
        }

        if (hasCarousel) this._updateCarouselScales()

        // Smoothly reset carousel orbit rotation back to zero after inactivity
        if (this._carouselOrbitResetting && !this._rm) {
            this._carouselOrbitY *= 0.94
            this._carouselOrbitX *= 0.94
            if (Math.abs(this._carouselOrbitY) < 0.001 && Math.abs(this._carouselOrbitX) < 0.001) {
                this._carouselOrbitY = 0
                this._carouselOrbitX = 0
                this._carouselOrbitResetting = false
            }
        }
    }

    setMobile(val) {
        this._isMobile = val
        this._carouselRadius = val ? 0.75 : 1.1
    }

   
    addCarouselOrbitDelta(deltaY, deltaX) {
        this._carouselOrbitResetting = false
        this._carouselOrbitY += deltaY
        this._carouselOrbitX = Math.max(-0.45, Math.min(0.45, this._carouselOrbitX + deltaX))
    }

    startCarouselOrbitReset() {
        this._carouselOrbitResetting = true
    }

    getFrontCarouselSlot() {
        const section = sectionConfig.find(s => s.id === '06')
        if (!section || !section.models) return null
        let bestSlot = null
        let bestCloseness = 0
        for (const entry of section.models) {
            if (!entry.behavior || !entry.behavior.carousel) continue
            const modelAngle = this._carouselAngle + (entry.behavior.carousel.offset || 0)
            let diff = ((modelAngle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)
            if (diff > Math.PI) diff = 2 * Math.PI - diff
            const closeness = Math.max(0, 1 - diff / Math.PI)
            if (closeness > bestCloseness) { bestCloseness = closeness; bestSlot = entry.slot }
        }
        return bestCloseness > 0.92 ? bestSlot : null
    }

    applyCarousel(sectionId) {
        if (sectionId !== '06') return
        const section = sectionConfig.find(s => s.id === '06')
        if (!section || !section.models) return
        for (const entry of section.models) {
            if (!entry.behavior || !entry.behavior.carousel) continue
            const groups = this._active.get(entry.slot)
            if (!groups) continue
            for (const group of groups) {
                const offset = entry.behavior.carousel.offset || 0
                const radius = entry.behavior.carousel.radius || this._carouselRadius
                const angle = this._carouselAngle + offset
                group.position.x = radius * Math.sin(angle)
                group.position.z = radius * Math.cos(angle)
            }
        }
        this._updateCarouselScales()
    }

    navigateCarousel(direction) {
        const count = 6
        const step = (2 * Math.PI) / count
        this._carouselIndex = (this._carouselIndex + direction + count) % count
        this._carouselTargetAngle = -this._carouselIndex * step

        if (this._carouselTween) this._carouselTween.kill()

        if (this._rm) {
            this._carouselAngle = this._carouselTargetAngle
            this._updateCarouselScales()
        } else {
            this._carouselTween = gsap.to(this, {
                _carouselAngle: this._carouselTargetAngle,
                duration: 0.8,
                ease: 'power3.inOut',
                overwrite: true,
                onUpdate: () => this._updateCarouselScales()
            })
        }
    }

    _updateCarouselScales() {
        const section = sectionConfig.find(s => s.id === '06')
        if (!section || !section.models) return

        for (const entry of section.models) {
            if (!entry.behavior || !entry.behavior.carousel) continue
            const groups = this._active.get(entry.slot)
            if (!groups) continue

            for (const group of groups) {
                const offset = entry.behavior.carousel.offset || 0
                const modelAngle = this._carouselAngle + offset
                let diff = ((modelAngle % (2 * Math.PI)) + (2 * Math.PI)) % (2 * Math.PI)
                if (diff > Math.PI) diff = 2 * Math.PI - diff
                const closeness = Math.max(0, 1 - (diff / Math.PI))
                const s = this._carouselBaseScale + (this._carouselFrontScale - this._carouselBaseScale) * closeness
                group.scale.set(s, s, s)
            }
        }
    }

    playIntro(sectionId) {
        const config = sectionConfig.find(s => s.id === sectionId)
        if (!config || !config.models) return false

        let played = false
        for (const entry of config.models) {
            const groups = this._active.get(entry.slot)
            if (!groups) return false
            for (const group of groups) {
                const cfg = group.userData._introPending
                if (cfg) {
                    const target = group.userData._targetScale || 1
                    if (this._rm) {
                        group.scale.set(target, target, target)
                    } else {
                        gsap.to(group.scale, {
                            x: target, y: target, z: target,
                            duration: cfg.duration || 1.3,
                            ease: cfg.ease || 'power4.out',
                            delay: cfg.delay || 0
                        })
                    }
                    delete group.userData._introPending
                    played = true
                }
            }
        }
        if (played) this._heroIntroPlayed = true
        return played
    }

    _makeMaterialClones(group) {
        group.traverse(child => {
            if (child.isMesh && child.material) {
                if (Array.isArray(child.material)) {
                    child.material = child.material.map(m => m.clone())
                } else {
                    child.material = child.material.clone()
                }
                child.material.transparent = true
            }
        })
    }

    _discoverHandNodes(group) {
        const hands = []
        group.traverse(child => {
            if (!child.isMesh) return
            const name = child.name.toLowerCase()
            if (name.includes('second') || name.includes('seconde')) {
                hands.push({ mesh: child, speed: 6 })
            } else if (name.includes('minute')) {
                hands.push({ mesh: child, speed: 0.1 })
            } else if (name.includes('hour')) {
                hands.push({ mesh: child, speed: 0.0083 })
            } else if (name.includes('hand') || name.includes('needle') || name.includes('aiguille')) {
                hands.push({ mesh: child, speed: 0.5 })
            }
        })
        if (hands.length > 0) {
            this._handNodes.set(group, hands)
        }
    }

    _setOpacity(group, opacity) {
        group.traverse(child => {
            if (child.isMesh && child.material) {
                if (Array.isArray(child.material)) {
                    child.material.forEach(m => { m.opacity = opacity; m.needsUpdate = true })
                } else {
                    child.material.opacity = opacity
                    child.material.needsUpdate = true
                }
            }
        })
    }

    _disposeGroup(group) {
        group.traverse(child => {
            if (child.isMesh && child.material) {
                if (Array.isArray(child.material)) {
                    child.material.forEach(m => m.dispose())
                } else {
                    child.material.dispose()
                }
            }
        })
    }

    teardown(crossFade = false) {
        for (const g of this._fadingGroups) {
            g.traverse(child => {
                if (child.isMesh && child.material) {
                    const mats = Array.isArray(child.material) ? child.material : [child.material]
                    mats.forEach(m => gsap.killTweensOf(m))
                }
            })
            this.scene.remove(g)
            this._disposeGroup(g)
        }
        this._fadingGroups = []

        for (const [, groups] of this._active) {
            for (const g of groups) {
                g.traverse(child => {
                    if (child.isMesh && child.material) {
                        const mats = Array.isArray(child.material) ? child.material : [child.material]
                        mats.forEach(m => gsap.killTweensOf(m))
                    }
                })
            }
        }

        if (crossFade) {
            for (const [, groups] of this._active) {
                for (const group of groups) {
                    this._makeMaterialClones(group)
                    this._setOpacity(group, 1)
                    this._transitionFading.push(group)
                }
            }
        } else {
            for (const [, groups] of this._active) {
                for (const group of groups) {
                    this.scene.remove(group)
                }
            }
        }
        this._active.clear()
        this._rotations.clear()
        this._handNodes.clear()
    }

    startCrossFade() {
        if (this._rm) {
            // Reduced motion: immediately remove old, no fade
            for (const g of this._transitionFading) { this.scene.remove(g); this._disposeGroup(g) }
            this._transitionFading = []
            this._fadingGroups = []

            // Ensure new models are at full opacity
            for (const groups of this._active.values()) {
                for (const g of groups) this._setOpacity(g, 1)
            }
            return
        }

        const fading = [...this._transitionFading]
        this._transitionFading = []

        if (fading.length === 0) return

        this._fadingGroups = fading

        // Fade out old models
        const oldMaterials = []
        for (const g of fading) {
            g.traverse(child => {
                if (child.isMesh && child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach(m => oldMaterials.push(m))
                    } else {
                        oldMaterials.push(child.material)
                    }
                }
            })
        }
        gsap.to(oldMaterials, {
            opacity: 0,
            duration: 0.3,
            ease: 'power2.out',
            onComplete: () => {
                this._fadingGroups = []
                for (const g of fading) { this.scene.remove(g); this._disposeGroup(g) }
            }
        })

        const newMaterials = []
        for (const groups of this._active.values()) {
            for (const g of groups) {
                g.traverse(child => {
                    if (child.isMesh && child.material) {
                        if (Array.isArray(child.material)) {
                            child.material.forEach(m => newMaterials.push(m))
                        } else {
                            newMaterials.push(child.material)
                        }
                    }
                })
            }
        }
        gsap.to(newMaterials, {
            opacity: 1,
            duration: 0.35,
            ease: 'power2.out',
            delay: 0.05
        })
    }

    getActiveModels() {
        const all = []
        for (const groups of this._active.values()) {
            all.push(...groups)
        }
        return all
    }

}