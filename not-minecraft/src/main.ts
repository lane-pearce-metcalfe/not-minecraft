import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/Addons.js'
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

//Adding OrbitControls
const controls = new OrbitControls(camera, canvas)
controls.target.set(0, 3, 0)

//Setting up the width/length of the world at this point as it will be needed for the lights
const dimensions = 200

camera.position.set(dimensions, 200, dimensions / dimensions)

//Adding lights
const color = 0xffffff
const intensity = 10
const light = new THREE.DirectionalLight(color, intensity)
const lightPosition = dimensions / 2
light.position.set(lightPosition, 128, lightPosition)
light.target.position.set(lightPosition - 40, 0, lightPosition - 40)
scene.add(light)

const helper = new THREE.DirectionalLightHelper(light)
scene.add(helper)

//Making the background of the world clear
renderer.setClearColor(0xfffff, 0)

//Storing the box geometry in a varaible as well as different messhes for different types of blocks
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

// Count voxels for each material type
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

// Place voxels in the world
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

// Optional: Optimize by only rendering visible faces (basic culling)
function isVoxelVisible(x, y, z, voxelGrid) {
  const voxelType = voxelGrid[x][y][z]
  if (voxelType === 0) return false // Air voxel

  // Check if any adjacent voxel is air
  const neighbors = [
    [x + 1, y, z],
    [x - 1, y, z], // X axis
    [x, y + 1, z],
    [x, y - 1, z], // Y axis
    [x, y, z + 1],
    [x, y, z - 1], // Z axis
  ]

  for (const [nx, ny, nz] of neighbors) {
    if (
      nx < 0 ||
      nx >= dimensions ||
      ny < 0 ||
      ny >= worldHeight ||
      nz < 0 ||
      nz >= dimensions ||
      voxelGrid[nx][ny][nz] === 0
    ) {
      return true // Has at least one air neighbor
    }
  }

  return false // Completely surrounded
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

// Mouse event handler
function onMouseClick(event) {
  // Calculate mouse position in normalized device coordinates
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1

  // Cast ray from camera through mouse position
  raycaster.setFromCamera(mouse, camera)

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
    removeVoxelAndUpdate(voxelX, voxelY, voxelZ)
  }
}

// Add event listener
window.addEventListener('click', onMouseClick, false)

// Function to remove voxel and update meshes
function removeVoxelAndUpdate(x, y, z) {
  // Check if coordinates are valid
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

  // Remove voxel from grid
  const oldVoxelType = voxelGrid[x][y][z]
  voxelGrid[x][y][z] = 0 // Set to air

  if (oldVoxelType === 0) return // Was already air

  // Rebuild the affected instanced mesh
  rebuildInstancedMeshes()
}

// Function to rebuild all instanced meshes (can be optimized)
function rebuildInstancedMeshes() {
  // Remove old meshes from scene
  scene.remove(stoneInstancedMesh, dirtInstancedMesh, grassInstancedMesh)

  // Count voxels for each material type
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

  // Create new instanced meshes
  const newStoneInstancedMesh = new THREE.InstancedMesh(
    geometry,
    stone,
    stoneCubes
  )
  const newDirtInstancedMesh = new THREE.InstancedMesh(
    geometry,
    dirt,
    dirtCubes
  )
  const newGrassInstancedMesh = new THREE.InstancedMesh(
    geometry,
    grass,
    grassCubes
  )

  // Position matrices
  const stoneMatrix = new THREE.Matrix4()
  const dirtMatrix = new THREE.Matrix4()
  const grassMatrix = new THREE.Matrix4()

  let stoneIndex = 0
  let dirtIndex = 0
  let grassIndex = 0

  // Place remaining voxels
  for (let x = 0; x < dimensions; x++) {
    for (let y = 0; y < worldHeight; y++) {
      for (let z = 0; z < dimensions; z++) {
        const voxelType = voxelGrid[x][y][z]

        if (voxelType === 1) {
          // Stone
          stoneMatrix.setPosition(x * voxelSize, y * voxelSize, z * voxelSize)
          newStoneInstancedMesh.setMatrixAt(stoneIndex, stoneMatrix)
          stoneIndex++
        } else if (voxelType === 2) {
          // Dirt
          dirtMatrix.setPosition(x * voxelSize, y * voxelSize, z * voxelSize)
          newDirtInstancedMesh.setMatrixAt(dirtIndex, dirtMatrix)
          dirtIndex++
        } else if (voxelType === 3) {
          // Grass
          grassMatrix.setPosition(x * voxelSize, y * voxelSize, z * voxelSize)
          newGrassInstancedMesh.setMatrixAt(grassIndex, grassMatrix)
          grassIndex++
        }
      }
    }
  }

  // Update matrices
  newStoneInstancedMesh.instanceMatrix.needsUpdate = true
  newDirtInstancedMesh.instanceMatrix.needsUpdate = true
  newGrassInstancedMesh.instanceMatrix.needsUpdate = true

  // Update global references
  stoneInstancedMesh = newStoneInstancedMesh
  dirtInstancedMesh = newDirtInstancedMesh
  grassInstancedMesh = newGrassInstancedMesh

  // Add new meshes to scene
  scene.add(stoneInstancedMesh, dirtInstancedMesh, grassInstancedMesh)
}

// Animation loop
function animate() {
  renderer.render(scene, camera)
}

renderer.setAnimationLoop(animate)

// More optimized approach - hide voxels instead of rebuilding
function removeVoxelOptimized(x, y, z) {
  // Check if coordinates are valid
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

// Alternative click handler that uses the optimized approach
function onMouseClickOptimized(event) {
  // Calculate mouse position in normalized device coordinates
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1

  // Cast ray from camera through mouse position
  raycaster.setFromCamera(mouse, camera)

  // Check intersections with all instanced meshes
  const intersects = []

  // Test against all voxel meshes
  const stoneIntersects = raycaster.intersectObject(stoneInstancedMesh)
  intersects.push(...stoneIntersects.map((hit) => ({ ...hit, voxelType: 1 })))

  const dirtIntersects = raycaster.intersectObject(dirtInstancedMesh)
  intersects.push(...dirtIntersects.map((hit) => ({ ...hit, voxelType: 2 })))

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

    // Use optimized removal (comment out the line below and uncomment the other for full rebuild)
    removeVoxelOptimized(voxelX, voxelY, voxelZ)
    // removeVoxelAndUpdate(voxelX, voxelY, voxelZ) // Full rebuild approach
  }
}

// Switch between optimized and full rebuild by changing the event listener
// window.addEventListener('click', onMouseClick, false) // Full rebuild
window.addEventListener('click', onMouseClickOptimized, false) // Optimized

// Additional helper: Add voxel back (for building)
function addVoxelAt(x, y, z, voxelType) {
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

  if (voxelGrid[x][y][z] === 0) {
    // Only add if space is empty
    voxelGrid[x][y][z] = voxelType
    rebuildInstancedMeshes() // Would need optimization for this too
  }
}

// Right-click to add voxels (example)
function onMouseRightClick(event) {
  event.preventDefault()

  mouse.x = (event.clientX / window.innerWidth) * 2 - 1
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1

  raycaster.setFromCamera(mouse, camera)

  // Cast ray and find where to place new voxel
  const intersects = raycaster.intersectObjects([
    stoneInstancedMesh,
    dirtInstancedMesh,
    grassInstancedMesh,
  ])

  if (intersects.length > 0) {
    const hit = intersects[0]
    const normal = hit.face.normal.clone()
    const newPos = hit.point.clone().add(normal.multiplyScalar(0.5))

    const voxelX = Math.floor(newPos.x / voxelSize)
    const voxelY = Math.floor(newPos.y / voxelSize)
    const voxelZ = Math.floor(newPos.z / voxelSize)

    addVoxelAt(voxelX, voxelY, voxelZ, 1) // Add stone voxel
  }
}

window.addEventListener('contextmenu', onMouseRightClick, false)
