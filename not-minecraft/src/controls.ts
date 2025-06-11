import { Camera } from './camera'

export class Controls {
  private canvas: HTMLCanvasElement
  private camera: Camera

  constructor(canvas: HTMLCanvasElement, camera: Camera) {
    this.canvas = canvas
    this.camera = camera
    this.setupEventListeners()
  }

  private setupEventListeners() {
    this.canvas.addEventListener(
      'click',
      this.requestPointerLock.bind(this),
      false
    )
    document.addEventListener('keydown', this.onKeyDown.bind(this), false)
    document.addEventListener('keyup', this.onKeyUp.bind(this), false)
  }

  private requestPointerLock() {
    this.canvas.requestPointerLock()
  }

  private onKeyDown(event: KeyboardEvent) {
    switch (event.code) {
      case 'KeyW':
        this.camera.keys.forward = true
        break
      case 'KeyS':
        this.camera.keys.backward = true
        break
      case 'KeyA':
        this.camera.keys.left = true
        break
      case 'KeyD':
        this.camera.keys.right = true
        break
      case 'Space':
        event.preventDefault()
        this.camera.keys.jump = true
        break
    }
  }

  private onKeyUp(event: KeyboardEvent) {
    switch (event.code) {
      case 'KeyW':
        this.camera.keys.forward = false
        break
      case 'KeyS':
        this.camera.keys.backward = false
        break
      case 'KeyA':
        this.camera.keys.left = false
        break
      case 'KeyD':
        this.camera.keys.right = false
        break
      case 'Space':
        this.camera.keys.jump = false
        break
    }
  }
}
