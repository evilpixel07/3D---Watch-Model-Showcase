export default class CursorParallax{
    constructor(lerpFactor = 0.08){
        this.lerpFactor = lerpFactor
        this.target = {x:0 , y:0}
        this.current = {x:0, y:0}

        this._onMouseMove = this._onMouseMove.bind(this)
        this._onTouchMove = this._onTouchMove.bind(this)

        window.addEventListener('mousemove', this._onMouseMove)
        window.addEventListener('touchmove', this._onTouchMove)
    
    }

    _onMouseMove(e){
        this.target.x = (e.clientX / window.innerWidth) * 2 - 1
        this.target.y = -(e.clientY / window.innerHeight) * 2 + 1
    }
    

    _onTouchMove(e){
        const touch = e.touches[0]

        this.target.x = (touch.clientX / window.innerWidth) * 2 - 1
        this.target.y = -(touch.clientY / window.innerHeight) * 2 + 1
    }

    update(){
        this.current.x += (this.target.x - this.current.x) * this.lerpFactor
        this.current.y += (this.target.y - this.current.y) * this.lerpFactor
    }

    get(){
        return {
            rotX: this.current.x,
            rotY: this.current.y,
            posX: this.current.x,
            posY: this.current.y
        }
    }


    
    destroy() {
        window.removeEventListener('mousemove', this._onMouseMove)
        window.removeEventListener('touchmove', this._onTouchMove)
    }

    
}