import * as THREE from 'three'

export class Camera {
  //Setting up the camera
  camera: THREE.PerspectiveCamera
  mouseSensitivity = 0.002
  pitch = 0
  yaw = 0

  //Setting up the characters physics
  characterHeight = 1.5
  gravity = -0.05
  jumpStrength = 0.5
  maxFallSpeed = -1.5
  moveSpeed = 0.15
  velocity = new THREE.Vector3(0, 0, 0)
  isOnGround = false
  canJump = true

  //This is an object that can be looked over constantly to see if the character should be moving or not
  keys = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    jump: false,
  }

  constructor(canvas: HTMLCanvasElement) {
    //Camera settings
    const fov = 75
    const aspect = window.innerWidth / window.innerHeight
    const near = 0.1
    const far = 1000

    //Finally creating the camera
    this.camera = new THREE.PerspectiveCamera(fov, aspect, near, far)

    //This is just what the worlds length/width is so the character can be placed in the middle of the world
    const dimensions = 200

    //Spawn character at safe height
    this.camera.position.set(dimensions / 2, 50, dimensions / 2)

    this.mouseMoving(canvas)
  }

  mouseMoving(canvas: HTMLCanvasElement) {
    //Whenever the mouse moves this function will run which will help translate it to actually moving the camera
    const onMouseMove = (event: MouseEvent) => {
      //Checking to see if the mouse is locked onto the game
      if (document.pointerLockElement === canvas) {
        //These grab the difference of mouse movement since the last mouseEvent
        const mouseX = event.movementX || 0
        const mouseY = event.movementY || 0

        //Converting that movement into actually moving the camera
        this.yaw -= mouseX * this.mouseSensitivity
        this.pitch -= mouseY * this.mouseSensitivity

        //Stop the camera from flipping
        this.pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.pitch))
      }
    }

    const onPointerLockChange = () => {
      //Seeing if the mouse is currently locked onto the game
      if (document.pointerLockElement === canvas) {
        document.addEventListener('mousemove', onMouseMove)

        //Otherwise we dont want the code to keep running
      } else {
        document.removeEventListener('mousemove', onMouseMove)
      }
    }

    //Adding the above function to run whenever the mouse is locked or unlocked from the game
    document.addEventListener('pointerlockchange', onPointerLockChange)
  }

  updatePosition(world) {
    this.camera.rotation.order = 'YXZ'
    this.camera.rotation.y = this.yaw
    this.camera.rotation.x = this.pitch

    this.handleMovement(world)
    this.handleJumping()
    this.applyGravity(world)
    this.constrainToWorld()
  }

  handleMovement(world) {
    const direction = new THREE.Vector3()
    const right = new THREE.Vector3()
    const horizontalMovement = new THREE.Vector3()

    if (this.keys.forward || this.keys.backward) {
      this.camera.getWorldDirection(direction)
      direction.y = 0
      direction.normalize()

      if (this.keys.forward) {
        horizontalMovement.add(direction.multiplyScalar(this.moveSpeed))
      }

      if (this.keys.backward) {
        horizontalMovement.add(direction.multiplyScalar(-this.moveSpeed))
      }
    }

    if (this.keys.left || this.keys.right) {
      this.camera.getWorldDirection(direction)
      right.crossVectors(direction, this.camera.up).normalize()

      if (this.keys.left) {
        horizontalMovement.add(right.multiplyScalar(-this.moveSpeed))
      }

      if (this.keys.right) {
        horizontalMovement.add(right.multiplyScalar(this.moveSpeed))
      }
    }

    const newPosition = this.camera.position.clone()
    newPosition.add(horizontalMovement)

    if (!world.checkCollision(newPosition, false)) {
      this.camera.position.x = newPosition.x
      this.camera.position.z = newPosition.z
    }
  }

  handleJumping() {
    if (this.keys.jump && this.isOnGround && this.canJump) {
      this.velocity.y = this.jumpStrength
      this.isOnGround = false
      this.canJump = false
    }

    if (!this.keys.jump) {
      this.canJump = true
    }
  }

  applyGravity(world) {
    this.velocity.y += this.gravity

    if (this.velocity.y < this.maxFallSpeed) {
      this.velocity.y = this.maxFallSpeed
    }

    const newY = this.camera.position.y + this.velocity.y
    const groundHeight = world.getGroundHeight(
      this.camera.position.x,
      this.camera.position.z
    )
    const characterBottom = newY - this.characterHeight

    if (characterBottom <= groundHeight) {
      this.camera.position.y = groundHeight + this.characterHeight
      this.velocity.y = 0
      this.isOnGround = true
    } else {
      this.camera.position.y = newY
      this.isOnGround = false
    }
  }

  constrainToWorld() {
    const dimensions = 200
    this.camera.position.x = Math.max(
      1,
      Math.min(dimensions - 1, this.camera.position.x)
    )
    this.camera.position.y = Math.max(
      1,
      Math.min(dimensions - 1, this.camera.position.y)
    )

    if (this.camera.position.y < this.characterHeight) {
      this.camera.position.y = this.characterHeight
      this.velocity.y = this.characterHeight
      this.velocity.y = 0
      this.isOnGround = true
    }
  }

  getCharacterHeight(): number {
    return this.characterHeight
  }
}
