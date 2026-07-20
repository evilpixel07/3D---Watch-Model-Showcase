const sectionConfig = [
    // section 0 (hero)
    {
        id: '00',
        name: 'Hero',
        duration: 100,
        crossFade: false,
        camera: {
            keyframes: [

                { progress: 0, position: [-0.5, 0.5, 1.88], target: [-0.5, 0, 0], fov: 38 },
                { progress: 1, position: [-0.5, 0.5, 1.88], target: [-0.5, 0, 0], fov: 38 }
            ]
        },
        models: [
            {
                slot: 'a',
                file: '/models/model4.glb',
                position: [0, -0.25, 0],
                size: 1.05,
                behavior: {
                    intro: { scale: true, duration: 1.3, ease: 'power4.out', delay: 0.35 },
                    float: { speed: 0.8, amp: 0.02 },
                    initialRotY: -90,
                    rotY: 2,
                    parallax: true
                }
            }
        ],
        lighting: {
            envIntensity: 0.3,
            key: { position: [3, 3.5, 2.5], intensity: 3.0, color: '#ffeedd' },
            fill: { position: [-2, 1, 1.5], intensity: 0.5, color: '#ccddff' },
            rim: null
        }
    },

    //Section 1
    {
        id: '01',
        name: 'Precision',
        duration: 140,
        crossFade: false,
        camera: {
            keyframes: [
                { progress: 0, position: [0, 0.4, 1.1], target: [0, 0.25, 0], fov: 32 },
                { progress: 1, position: [0.35, 0.15, 0.28], target: [0, 0.1, 0], fov: 24 }
            ],
            mobile: {
                keyframes: [
                    { progress: 0, position: [0, 0.4, 1.1], target: [0, 0.25, 0], fov: 36 },
                    { progress: 1, position: [0.35, 0.15, 0.28], target: [0, 0.1, 0], fov: 28 }
                ]
            }
        },
        models: [
            {
                slot: 'b',
                file: '/models/model2.glb',
                position: [0, 0, 0],
                size: 0.65,
                behavior: { rotY: 8 }
            }
        ],
        lighting: {
            envIntensity: 0.25,
            key: { position: [1, 2, 1.5], intensity: 3.0, color: '#ffffff' },
            fill: { position: [-2, 1, 1.5], intensity: 0.3, color: '#ccddff' },
            rim: null
        }
    },

    // Section 2
    {
        id: '02',
        name: 'The Line',
        duration: 180,
        crossFade: false,
        camera: {
            keyframes: [

                { progress: 0, position: [-0.8, 0.2, 1.9], target: [-0.01, 0.08, 0.05], fov: 36 },
                { progress: 1, position: [0.8, 0.2, 1.9], target: [-0.01, 0.08, 0.05], fov: 36 }
            ],
            mobile: {
                keyframes: [
                    { progress: 0, position: [-0.6, 0.15, 1.7], target: [-0.01, 0.2, 0.05], fov: 40 },
                    { progress: 1, position: [0.6, 0.15, 1.7], target: [-0.01, 0.2, 0.05], fov: 40 }
                ]
            }
        },
        models: [
            { slot: 'c', file: '/models/model3.glb', position: [0, -0.2, 0], behavior: { rotY: 0 }, visibleAt: { start: 0.00, end: 0.33 } },
            { slot: 'd', file: '/models/model4.glb', position: [0, -0.14, 0], behavior: { initialRotY: -90, rotY: 0 }, visibleAt: { start: 0.33, end: 0.66 } },
            { slot: 'e', file: '/models/model5.glb', position: [0, -0.12, 0], behavior: { rotY: 0 }, visibleAt: { start: 0.66, end: 1.01 } }
        ],
        lighting: {
            envIntensity: 0.35,
            key: { position: [0, 2.5, 1.8], intensity: 2.2, color: '#ffffff' },
            fill: { position: [-1.5, 1, -1], intensity: 0.8, color: '#ccddff' },
            rim: { position: [1.5, 1.2, -1.5], intensity: 1.4, color: '#C9A66B' }
        }
    },

    // Section 3
    {
        id: '03',
        name: 'Material Study',
        duration: 130,
        crossFade: false,
        camera: {
            keyframes: [

                { progress: 0, position: [0.5, 0.35, 0.6], target: [0, 0.22, 0], fov: 28 },
                { progress: 1, position: [0.15, 0.28, 0.22], target: [0.05, 0.2, 0], fov: 18 }
            ]
        },
        models: [
            { slot: 'f', file: '/models/model6.glb', position: [0, 0.11, 0], size: 0.30, behavior: { rotY: 0, scaleEnd: 0.49 } }
        ],
        lighting: {
            envIntensity: 0.5,
            key: { position: [2, 2, 1], intensity: 2.6, color: '#ffffff', sweep: { to: [-1, 2, 1.5] } },
            fill: { position: [0, 1, -1.5], intensity: 0.5, color: '#ccddff' },
            rim: null
        }
    },

    // Section 4
    {
        id: '04',
        name: 'Kindred Forms',
        duration: 110,
        crossFade: true,
        camera: {
            keyframes: [
                { progress: 0, position: [0, 0.4, 1.6], target: [0, 0.2, 0], fov: 34 },
                { progress: 1, position: [0, 0.32, 1.15], target: [0, 0.2, 0], fov: 30 }
            ],
            mobile: {
                keyframes: [
                    { progress: 0, position: [0, 0.4, 1.6], target: [0, 0.2, 0], fov: 40 },
                    { progress: 1, position: [0, 0.32, 1.15], target: [0, 0.2, 0], fov: 36 }
                ]
            }
        },
        models: [
            { slot: 'b', file: '/models/model2.glb', position: [-0.4, 0, 0], mobile: { position: [-0.28, 0, 0] }, behavior: { rotY: 3 } },
            { slot: 'c', file: '/models/model3.glb', position: [0.4, 0, 0], mobile: { position: [0.28, 0, 0] }, behavior: { rotY: -3 } }
        ],
        lighting: {
            envIntensity: 0.4,
            key: { position: [-0.8, 2.2, 1.5], intensity: 2.0, color: '#ffffff' },
            key2: { position: [0.8, 2.2, 1.5], intensity: 2.0, color: '#ffffff' },
            fill: { position: [0, 1, -1.8], intensity: 0.6, color: '#ccddff' },
            rim: { position: [0, 1.6, -2], intensity: 1.0, color: '#C9A66B' }
        }
    },

    // Section 5
    {
        id: '05',
        name: 'The Detail',
        duration: 130,
        crossFade: true,
        camera: {
            keyframes: [
                { progress: 0, position: [0, 0.5, 1.9], target: [0, 0.2, 0], fov: 30 },
                { progress: 1, position: [-0.22, 0.18, 0.3], target: [-0.05, 0.15, 0], fov: 20 }
            ]
        },
        models: [
            { slot: 'd', file: '/models/model4.glb', position: [0, 0, 0], size: 0.55, behavior: { initialRotY: -90, rotY: 5 } }
        ],
        lighting: {
            envIntensity: 0.35,
            key: { position: [1.2, 2, 1.2], intensity: 2.3, color: '#ffffff' },
            fill: { position: [-1, 0.8, 1], intensity: 0.5, color: '#ccddff' },
            rim: { position: [0, 1.4, -1.8], intensity: 1.2, color: '#C9A66B' }
        }
    },

    // Section 6
    {
        id: '06',
        name: 'The Collection',
        duration: 220,
        crossFade: true,
        camera: {
            keyframes: [
                { progress: 0, position: [0, 0.6, 2.4], target: [0, 0.2, 0], fov: 30 },
                { progress: 0.4, position: [0.3, 0.25, 0.5], target: [0, 0.18, 0], fov: 26 },
                { progress: 1, position: [0, 2.4, 3.6], target: [0, 0, 0], fov: 46 }
            ],
            mobile: {
                keyframes: [
                    { progress: 0, position: [0, 0.6, 2.4], target: [0, 0.2, 0], fov: 30 },
                    { progress: 0.4, position: [0.3, 0.25, 0.5], target: [0, 0.18, 0], fov: 26 },
                    { progress: 1, position: [0, 2.4, 3.6], target: [0, 0, 0], fov: 52 }
                ]
            }
        },
        models: [
            { slot: 'a', file: '/models/model1.glb', position: [0, 0, 0], behavior: { carousel: { offset: 0, radius: 1.1 }, rotY: 2 } },
            { slot: 'b', file: '/models/model2.glb', position: [0, 0, 0], behavior: { carousel: { offset: Math.PI / 3, radius: 1.1 }, rotY: 2 } },
            { slot: 'c', file: '/models/model3.glb', position: [0, 0, 0], behavior: { carousel: { offset: 2 * Math.PI / 3, radius: 1.1 }, rotY: 2 } },
            { slot: 'd', file: '/models/model4.glb', position: [0, 0, 0], behavior: { carousel: { offset: Math.PI, radius: 1.1 }, rotY: 2, initialRotY: -90 } },
            { slot: 'e', file: '/models/model5.glb', position: [0, 0, 0], behavior: { carousel: { offset: 4 * Math.PI / 3, radius: 1.1 }, rotY: 2 } },
            { slot: 'f', file: '/models/model6.glb', position: [0, 0, 0], behavior: { carousel: { offset: 5 * Math.PI / 3, radius: 1.1 }, rotY: 2 } }
        ],
        lighting: {
            envIntensity: 0.45,
            key: { position: [0, 3, 2], intensity: 2.0, color: '#ffffff' },
            fill: { position: [0, 1.5, 0], intensity: 0.9, color: '#ccddff' },
            rim: { position: [1.5, 1.5, -2], intensity: 1.0, color: '#C9A66B' },
            rim2: { position: [-1.5, 1.5, -2], intensity: 1.0, color: '#C9A66B' }
        }
    },

    // Section 7
    {
        id: '07',
        name: 'Closing',
        duration: 90,
        crossFade: false,
        camera: {
            keyframes: [
                { progress: 0, position: [0, 2.4, 3.6], target: [0, 0, 0], fov: 46 },
                { progress: 1, position: [0, 0.5, 2.0], target: [0, 0.15, 0], fov: 30 }
            ]
        },
        models: [
            { slot: 'a', file: '/models/model1.glb', position: [0, 0, 0], size: 1, behavior: { initialRotY: 0, rotY: 2 } }
        ],
        lighting: {
            envIntensity: 0.3,
            key: { position: [2, 3, 2], intensity: 2.4, color: '#ffeedd' },
            fill: { position: [-2, 1, 1.5], intensity: 0.6, color: '#ccddff' },
            rim: { position: [0, 1.5, -2], intensity: 1.1, color: '#C9A66B' }
        }
    }

]

export default sectionConfig