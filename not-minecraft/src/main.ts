import * as THREE from 'three'
import { generateNoiseMap } from './perlinNoise'

//Camera settings
const fov = 75
const aspect = window.innerWidth / window.innerHeight
const near = 0.1
const far = 1000

//Creating camera
const camera = new THREE.PerspectiveCamera(fov, aspect, near, far)

//Setup scene
const scene = new THREE.Scene()

//Setup up renderer and canvas
const renderer = new THREE.WebGLRenderer()
renderer.setSize(window.innerWidth, window.innerHeight)
const canvas = renderer.domElement
document.body.appendChild(canvas)

//Setting up the width/length of the world
const dimensions = 200

//Setting up varibales for camera
const characterHeight = 1.5
const gravity = -0.05
const jumpStrength = 0.5
const maxFallSpeed = -1.5
const moveSpeed = 0.15
const mouseSensitivity = 0.002
let mouseX = 0
let mouseY = 0
let pitch = 0
let yaw = 0

//Character physics state
let velocity = new THREE.Vector3(0, 0, 0)
let isOnGround = false
let canJump = true

//Start character at a safe height
camera.position.set(dimensions / 2, 50, dimensions / 2)

// First person controls
const keys = {
  forward: false,
  backward: false,
  left: false,
  right: false,
  jump: false,
}

// Pointer lock for mouse look
function requestPointerLock() {
  canvas.requestPointerLock()
}

function onPointerLockChange() {
  if (document.pointerLockElement === canvas) {
    document.addEventListener('mousemove', onMouseMove, false)
  } else {
    document.removeEventListener('mousemove', onMouseMove, false)
  }
}

function onMouseMove(event: { movementX: number; movementY: number }) {
  if (document.pointerLockElement === canvas) {
    mouseX = event.movementX || 0
    mouseY = event.movementY || 0

    yaw -= mouseX * mouseSensitivity
    pitch -= mouseY * mouseSensitivity

    //Prevent camera flipping
    pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, pitch))
  }
}

//Listening for
function onKeyDown(event: { code: any; preventDefault: () => void }) {
  if (event.code === 'KeyW') {
    keys.forward = true
  }
  if (event.code === 'KeyS') {
    keys.backward = true
  }
  if (event.code === 'KeyA') {
    keys.left = true
  }
  if (event.code === 'KeyD') {
    keys.right = true
  }
  if (event.code === 'Space') {
    event.preventDefault()
    keys.jump = true
  }
}

function onKeyUp(event: { code: any }) {
  if (event.code === 'KeyW') {
    keys.forward = false
  }
  if (event.code === 'KeyS') {
    keys.backward = false
  }
  if (event.code === 'KeyA') {
    keys.left = false
  }
  if (event.code === 'KeyD') {
    keys.right = false
  }
  if (event.code === 'Space') {
    keys.jump = false
  }
}

//Add event listeners
canvas.addEventListener('click', requestPointerLock, false)
document.addEventListener('pointerlockchange', onPointerLockChange, false)
document.addEventListener('keydown', onKeyDown, false)
document.addEventListener('keyup', onKeyUp, false)

// Check if a voxel exists at given coordinates
function isVoxelSolid(x: number, y: number, z: number) {
  if (
    x < 0 ||
    x >= dimensions ||
    y < 0 ||
    y >= worldHeight ||
    z < 0 ||
    z >= dimensions
  ) {
    return false // Out of bounds is considered air
  }
  return voxelGrid[Math.floor(x)][Math.floor(y)][Math.floor(z)] !== 0
}

// Get the height of the ground at a given x, z position
function getGroundHeight(x: number, z: number) {
  const floorX = Math.floor(x)
  const floorZ = Math.floor(z)

  // Find the highest solid voxel at this position
  for (let y = worldHeight - 1; y >= 0; y--) {
    if (isVoxelSolid(floorX, y, floorZ)) {
      return y + 1 // Return the position above the solid block
    }
  }
  return 0 // If no solid ground found, return 0
}

// Check collision with the world
function checkCollision(position: THREE.Vector3, _checkY = true) {
  const x = position.x
  const y = position.y
  const z = position.z

  // Check feet position (character bottom)
  const feetY = y - characterHeight

  // Character occupies space from feetY to y
  // Check multiple points around the character's body
  const collisionPoints = [
    { x: x - 0.3, z: z - 0.3 }, // corners
    { x: x + 0.3, z: z - 0.3 },
    { x: x - 0.3, z: z + 0.3 },
    { x: x + 0.3, z: z + 0.3 },
    { x: x, z: z }, // center
  ]

  for (const point of collisionPoints) {
    // Check if any part of the character intersects with solid voxels
    for (
      let checkHeight = Math.floor(feetY);
      checkHeight <= Math.ceil(y);
      checkHeight++
    ) {
      if (isVoxelSolid(point.x, checkHeight, point.z)) {
        return true
      }
    }
  }

  return false
}

function updateCamera() {
  camera.rotation.order = 'YXZ'
  camera.rotation.y = yaw
  camera.rotation.x = pitch

  //Calculate movement direction based on camera rotation
  const direction = new THREE.Vector3()
  const right = new THREE.Vector3()
  const horizontalMovement = new THREE.Vector3()

  // Forward/backward movement
  if (keys.forward || keys.backward) {
    camera.getWorldDirection(direction)
    direction.y = 0 // Keep movement horizontal
    direction.normalize()

    if (keys.forward) {
      horizontalMovement.add(direction.multiplyScalar(moveSpeed))
    }
    if (keys.backward) {
      horizontalMovement.add(direction.multiplyScalar(-moveSpeed))
    }
  }

  // Left/right movement (strafe)
  if (keys.left || keys.right) {
    camera.getWorldDirection(direction)
    right.crossVectors(direction, camera.up).normalize()

    if (keys.left) {
      horizontalMovement.add(right.multiplyScalar(-moveSpeed))
    }
    if (keys.right) {
      horizontalMovement.add(right.multiplyScalar(moveSpeed))
    }
  }

  // Test horizontal movement
  const newPosition = camera.position.clone()
  newPosition.add(horizontalMovement)

  // Only apply horizontal movement if it doesn't cause collision
  if (!checkCollision(newPosition, false)) {
    camera.position.x = newPosition.x
    camera.position.z = newPosition.z
  }

  //Jumping
  if (keys.jump && isOnGround && canJump) {
    velocity.y = jumpStrength
    isOnGround = false
    canJump = false
  }

  //Reset jump when key is released
  if (!keys.jump) {
    canJump = true
  }

  // Apply gravity
  velocity.y += gravity

  // Limit fall speed
  if (velocity.y < maxFallSpeed) {
    velocity.y = maxFallSpeed
  }

  // Apply vertical movement
  const newY = camera.position.y + velocity.y
  const testPosition = camera.position.clone()
  testPosition.y = newY

  // Ground collision detection
  const groundHeight = getGroundHeight(camera.position.x, camera.position.z)
  const characterBottom = newY - characterHeight

  if (characterBottom <= groundHeight) {
    // Character is on or below ground
    camera.position.y = groundHeight + characterHeight
    velocity.y = 0
    isOnGround = true
  } else {
    // Character is in the air
    camera.position.y = newY
    isOnGround = false
  }

  // Keep camera within world bounds horizontally
  camera.position.x = Math.max(1, Math.min(dimensions - 1, camera.position.x))
  camera.position.z = Math.max(1, Math.min(dimensions - 1, camera.position.z))

  // Prevent falling through the world
  if (camera.position.y < characterHeight) {
    camera.position.y = characterHeight
    velocity.y = 0
    isOnGround = true
  }
}

//Adding lights
const color = 0xffffff
const intensity = 10
const light = new THREE.DirectionalLight(color, intensity)
const lightPosition = dimensions / 2
light.position.set(lightPosition, 128, lightPosition)
light.target.position.set(lightPosition - 40, 0, lightPosition - 40)
scene.add(light)

// Add ambient light for better visibility
const ambientLight = new THREE.AmbientLight(0x404040, 0.3)
scene.add(ambientLight)

//Making the background of the world clear
renderer.setClearColor(0x87ceeb, 1) // Sky blue background

//Storing the box geometry in a variable as well as different meshes for different types of blocks
const geometry = new THREE.BoxGeometry(1, 1, 1)
const grass = new THREE.MeshStandardMaterial({ color: 'green' })
const stone = new THREE.MeshStandardMaterial({ color: 'grey' })
const dirt = new THREE.MeshStandardMaterial({ color: 'rgb(84, 57, 23)' })

//Creating a perlin noise map
const scale = 0.03
const octaves = 3
const frequency = 0.4
const voxelSize = 1 // Size of each voxel
const worldHeight = 64 // Maximum height of the voxel world

// Generate height map
const noiseMap = generateNoiseMap(
  dimensions,
  dimensions,
  scale,
  octaves,
  frequency
)

// Create 3D voxel grid
// 0 = air, 1 = stone, 2 = dirt, 3 = grass
const voxelGrid = new Array(dimensions)
for (let x = 0; x < dimensions; x++) {
  voxelGrid[x] = new Array(worldHeight)
  for (let y = 0; y < worldHeight; y++) {
    voxelGrid[x][y] = new Array(dimensions).fill(0) // Initialize with air
  }
}

// Fill voxel grid based on noise map
noiseMap.forEach((row, z) => {
  row.forEach((cell, x) => {
    const surfaceHeight = Math.round(cell * 100) - 42
    const clampedHeight = Math.max(1, Math.min(surfaceHeight, worldHeight - 1))

    for (let y = 0; y <= clampedHeight; y++) {
      if (y < clampedHeight - 2) {
        voxelGrid[x][y][z] = 1 // Stone
      } else if (y < clampedHeight) {
        voxelGrid[x][y][z] = 2 // Dirt
      } else {
        voxelGrid[x][y][z] = 3 // Grass
      }
    }
  })
})

// Count VISIBLE voxels for each material type (with culling optimization)
let stoneCubes = 0
let dirtCubes = 0
let grassCubes = 0

for (let x = 0; x < dimensions; x++) {
  for (let y = 0; y < worldHeight; y++) {
    for (let z = 0; z < dimensions; z++) {
      const voxelType = voxelGrid[x][y][z]
      if (voxelType === 1) stoneCubes++
      else if (voxelType === 2) dirtCubes++
      else if (voxelType === 3) grassCubes++
    }
  }
}

// Create instanced meshes
let stoneInstancedMesh = new THREE.InstancedMesh(geometry, stone, stoneCubes)
let dirtInstancedMesh = new THREE.InstancedMesh(geometry, dirt, dirtCubes)
let grassInstancedMesh = new THREE.InstancedMesh(geometry, grass, grassCubes)

// Position matrices
const stoneMatrix = new THREE.Matrix4()
const dirtMatrix = new THREE.Matrix4()
const grassMatrix = new THREE.Matrix4()

let stoneIndex = 0
let dirtIndex = 0
let grassIndex = 0

// Place ONLY VISIBLE voxels in the world (with culling optimization)
for (let x = 0; x < dimensions; x++) {
  for (let y = 0; y < worldHeight; y++) {
    for (let z = 0; z < dimensions; z++) {
      const voxelType = voxelGrid[x][y][z]

      if (voxelType === 1) {
        // Stone
        stoneMatrix.setPosition(x * voxelSize, y * voxelSize, z * voxelSize)
        stoneInstancedMesh.setMatrixAt(stoneIndex, stoneMatrix)
        stoneIndex++
      } else if (voxelType === 2) {
        // Dirt
        dirtMatrix.setPosition(x * voxelSize, y * voxelSize, z * voxelSize)
        dirtInstancedMesh.setMatrixAt(dirtIndex, dirtMatrix)
        dirtIndex++
      } else if (voxelType === 3) {
        // Grass
        grassMatrix.setPosition(x * voxelSize, y * voxelSize, z * voxelSize)
        grassInstancedMesh.setMatrixAt(grassIndex, grassMatrix)
        grassIndex++
      }
    }
  }
}

// Update instance matrices
stoneInstancedMesh.instanceMatrix.needsUpdate = true
dirtInstancedMesh.instanceMatrix.needsUpdate = true
grassInstancedMesh.instanceMatrix.needsUpdate = true

// Add meshes to scene
scene.add(stoneInstancedMesh, dirtInstancedMesh, grassInstancedMesh)

// Raycasting setup for voxel interaction
const raycaster = new THREE.Raycaster()
const mouse = new THREE.Vector2()

// Mouse click for voxel destruction (only works when pointer is locked)
function onMouseClick(event: any) {
  if (document.pointerLockElement !== canvas) return

  // Cast ray from camera center (crosshair)
  raycaster.setFromCamera(new THREE.Vector2(0, 0), camera)

  // Check intersections with all instanced meshes
  const intersects = []

  // Test against stone voxels
  const stoneIntersects = raycaster.intersectObject(stoneInstancedMesh)
  intersects.push(...stoneIntersects.map((hit) => ({ ...hit, voxelType: 1 })))

  // Test against dirt voxels
  const dirtIntersects = raycaster.intersectObject(dirtInstancedMesh)
  intersects.push(...dirtIntersects.map((hit) => ({ ...hit, voxelType: 2 })))

  // Test against grass voxels
  const grassIntersects = raycaster.intersectObject(grassInstancedMesh)
  intersects.push(...grassIntersects.map((hit) => ({ ...hit, voxelType: 3 })))

  if (intersects.length > 0) {
    // Sort by distance to get the closest voxel
    intersects.sort((a, b) => a.distance - b.distance)
    const closestHit = intersects[0]

    // Calculate voxel coordinates from world position
    const worldPos = closestHit.point
    const voxelX = Math.floor(worldPos.x / voxelSize)
    const voxelY = Math.floor(worldPos.y / voxelSize)
    const voxelZ = Math.floor(worldPos.z / voxelSize)

    // Remove the voxel
    removeVoxelOptimized(voxelX, voxelY, voxelZ)
  }
}

// Add event listener for voxel interaction
window.addEventListener('click', onMouseClick, false)

// Optimized voxel removal
function removeVoxelOptimized(x: number, y: number, z: number) {
  if (
    x < 0 ||
    x >= dimensions ||
    y < 0 ||
    y >= worldHeight ||
    z < 0 ||
    z >= dimensions
  ) {
    return
  }

  const oldVoxelType = voxelGrid[x][y][z]
  if (oldVoxelType === 0) return // Already air

  // Remove voxel from grid
  voxelGrid[x][y][z] = 0

  // Find and hide the specific voxel instance
  const targetPosition = new THREE.Vector3(
    x * voxelSize,
    y * voxelSize,
    z * voxelSize
  )
  let targetMesh

  switch (oldVoxelType) {
    case 1:
      targetMesh = stoneInstancedMesh
      break
    case 2:
      targetMesh = dirtInstancedMesh
      break
    case 3:
      targetMesh = grassInstancedMesh
      break
  }

  if (targetMesh) {
    // Find the instance with matching position
    const matrix = new THREE.Matrix4()
    const position = new THREE.Vector3()

    for (let i = 0; i < targetMesh.count; i++) {
      targetMesh.getMatrixAt(i, matrix)
      position.setFromMatrixPosition(matrix)

      if (position.distanceTo(targetPosition) < 0.1) {
        // Hide this instance by scaling it to 0
        matrix.makeScale(0, 0, 0)
        targetMesh.setMatrixAt(i, matrix)
        targetMesh.instanceMatrix.needsUpdate = true
        break
      }
    }
  }
}

// Add crosshair for aiming
function createCrosshair() {
  const crosshairSize = 20
  const crosshairThickness = 2

  const crosshairDiv = document.createElement('div')
  crosshairDiv.style.position = 'fixed'
  crosshairDiv.style.top = '50%'
  crosshairDiv.style.left = '50%'
  crosshairDiv.style.width = crosshairSize + 'px'
  crosshairDiv.style.height = crosshairSize + 'px'
  crosshairDiv.style.marginTop = -(crosshairSize / 2) + 'px'
  crosshairDiv.style.marginLeft = -(crosshairSize / 2) + 'px'
  crosshairDiv.style.pointerEvents = 'none'
  crosshairDiv.style.zIndex = '1000'

  // Horizontal line
  const horizontal = document.createElement('div')
  horizontal.style.position = 'absolute'
  horizontal.style.top = '50%'
  horizontal.style.left = '0'
  horizontal.style.width = '100%'
  horizontal.style.height = crosshairThickness + 'px'
  horizontal.style.backgroundColor = 'white'
  horizontal.style.marginTop = -(crosshairThickness / 2) + 'px'

  // Vertical line
  const vertical = document.createElement('div')
  vertical.style.position = 'absolute'
  vertical.style.left = '50%'
  vertical.style.top = '0'
  vertical.style.width = crosshairThickness + 'px'
  vertical.style.height = '100%'
  vertical.style.backgroundColor = 'white'
  vertical.style.marginLeft = -(crosshairThickness / 2) + 'px'

  crosshairDiv.appendChild(horizontal)
  crosshairDiv.appendChild(vertical)
  document.body.appendChild(crosshairDiv)
}

createCrosshair()

// Position the camera at the correct height when the world loads
function initializeCharacterPosition() {
  const groundHeight = getGroundHeight(camera.position.x, camera.position.z)
  camera.position.y = groundHeight + characterHeight
  velocity.y = 0
  isOnGround = true
}

// Initialize character position after world generation
initializeCharacterPosition()

// Animation loop
function animate() {
  updateCamera()
  renderer.render(scene, camera)
}

renderer.setAnimationLoop(animate)
