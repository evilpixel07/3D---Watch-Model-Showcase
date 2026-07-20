const mq = window.matchMedia('(prefers-reduced-motion: reduce)')

export default function reducedMotion() {
    return mq.matches
}

export function onReducedMotionChange(fn) {
    mq.addEventListener('change', fn)
}
