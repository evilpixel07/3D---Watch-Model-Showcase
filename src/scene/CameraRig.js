import * as THREE from 'three'
import sectionConfig from "../sections/sectionConfig.js";

export default class CameraRig {
    constructor() {
        this.current = {
            sectionId: '00',
            progress: 0,
            position: new THREE.Vector3(-0.5, 0.5, 1.88),
            target: new THREE.Vector3(-0.5, 0, 0),
            fov: 38
        }
        this._isMobile = false
    }

    setMobile(val) {
        this._isMobile = val
    }

    update(sectionId, progress) {
        const section = sectionConfig.find(s => s.id === sectionId)
        if (!section) return;

        const cam = (this._isMobile && section.camera.mobile) ? section.camera.mobile : section.camera
        const kfs = cam.keyframes

        let from = kfs[0], to = kfs[kfs.length - 1]

        for (let i = 0; i < kfs.length - 1; i++) {
            if (progress >= kfs[i].progress && progress <= kfs[i + 1].progress) {
                from = kfs[i];
                to = kfs[i + 1]
                break
            }
        }


        const range = to.progress - from.progress
        const t = range === 0 ? 0 : (progress - from.progress) / range


        //lerp all values
        this.current.position.set(
            from.position[0] + (to.position[0] - from.position[0]) * t,
            from.position[1] + (to.position[1] - from.position[1]) * t,
            from.position[2] + (to.position[2] - from.position[2]) * t
        )

        this.current.target.set(
            from.target[0] + (to.target[0] - from.target[0]) * t,
            from.target[1] + (to.target[1] - from.target[1]) * t,
            from.target[2] + (to.target[2] - from.target[2]) * t
        )

        this.current.fov = from.fov + (to.fov - from.fov) * t

        this.current.sectionId = sectionId
        this.current.progress = progress
    }

    getTransform() {
        return this.current;
    }
}