import './styles/tokens.css'
import './styles/base.css'
import './styles/layout.css'
import './styles/loader.css'   // ← premium loader styles

import Waves from './utils/Waves.js'
import SceneManager from './scene/SceneManager.js'
import NavController from './ui/NavController.js'
import LoaderScreen from './ui/LoaderScreen.js'

document.addEventListener('DOMContentLoaded', () => {

    const loader  = new LoaderScreen()
    loader.init()

    const manager = loader.getManager()

    const gridEl = document.getElementById('grid-mesh')
    if (gridEl) {
        gridEl.style.backgroundImage = 'none'

        const canvas = document.createElement('canvas')
        canvas.className = 'waves-canvas'
        gridEl.appendChild(canvas)

        new Waves(canvas, {
            lineColor:     '#B7BEC2',
            waveSpeedX:    0.006,
            waveSpeedY:    0.003,
            waveAmpX:      18,
            waveAmpY:      10,
            xGap:          40,
            yGap:          40,
            friction:      0.92,
            tension:       0.004,
            maxCursorMove: 60
        })
    }

    const container = document.getElementById('canvas-container')
    let sceneManager
    if (container) {
        sceneManager = new SceneManager(container, gridEl, manager)
    }

    const nav = new NavController()

    loader.ready().then(() => {
        if (sceneManager) sceneManager.startIntro()
    })
})