import * as THREE from 'three'
import { generateNoiseMap } from './perlinNoise'
import { Camera } from './camera'

export class World {
  public dimensions = 200
  public worldHeight = 64
  public voxelSize = 1
  voxelGrid!: number[][][]

  stoneInstancedMesh!: THREE.InstancedMesh
  dirtInstancedMesh!: THREE.InstancedMesh
  grassInstancedMesh!: THREE.InstancedMesh

  geometry!: THREE.BoxGeometry
  materials!: {
    stone: THREE.MeshStandardMaterial
    dirt: THREE.MeshStandardMaterial
    grass: THREE.MeshStandardMaterial
  }

  constructor(scene: THREE.Scene) {
    this.setupMaterials()
    this.setupLighting(scene)
    this.generateWorld()
    this.createInstancedMeshes(scene)
  }

  setupMaterials() {
    this.geometry = new THREE.BoxGeometry(1, 1, 1)
    this.materials = {
      grass: new THREE.MeshStandardMaterial({ color: 'green' }),
      stone: new THREE.MeshStandardMaterial({ color: 'grey' }),
      dirt: new THREE.MeshStandardMaterial({ color: 'rgb(84, 57, 23)' }),
    }
  }

  setupLighting(scene: THREE.Scene) {
    const color = 0xffffff
    const intensity = 10
    const light = new THREE.DirectionalLight(color, intensity)
    const lightPosition = this.dimensions / 2
    light.position.set(lightPosition, 128, lightPosition)
    light.target.position.set(lightPosition - 40, 0, lightPosition - 40)
    const ambientLight = new THREE.AmbientLight(0x404040, 20)
    scene.add(light, ambientLight)
  }

  generateWorld() {
    const scale = 0.03
    const octaves = 3
    const frequency = 0.4

    const noiseMap = generateNoiseMap(
      this.dimensions,
      this.dimensions,
      scale,
      octaves,
      frequency
    )

    this.voxelGrid = new Array(this.dimensions)
    for (let x = 0; x < this.dimensions; x++) {
      this.voxelGrid[x] = new Array(this.worldHeight)
      for (let y = 0; y < this.worldHeight; y++) {
        this.voxelGrid[x][y] = new Array(this.dimensions).fill(0) // Initialize with air
      }
    }

    noiseMap.forEach((row, z) => {
      row.forEach((cell, x) => {
        const surfaceHeight = Math.round(cell * 100) - 42
        const clampedHeight = Math.max(
          1,
          Math.min(surfaceHeight, this.worldHeight - 1)
        )

        for (let y = 0; y <= clampedHeight; y++) {
          if (y < clampedHeight - 2) {
            this.voxelGrid[x][y][z] = 1
          } else if (y < clampedHeight) {
            this.voxelGrid[x][y][z] = 2
          } else {
            this.voxelGrid[x][y][z] = 3
          }
        }
      })
    })
  }

  createInstancedMeshes(scene: THREE.Scene) {
    let stoneCubes = 0
    let dirtCubes = 0
    let grassCubes = 0

    for (let x = 0; x < this.dimensions; x++) {
      for (let y = 0; y < this.worldHeight; y++) {
        for (let z = 0; z < this.dimensions; z++) {
          const voxelType = this.voxelGrid[x][y][z]
          if (voxelType === 1) stoneCubes++
          else if (voxelType === 2) dirtCubes++
          else if (voxelType === 3) grassCubes++
        }
      }
    }

    this.stoneInstancedMesh = new THREE.InstancedMesh(
      this.geometry,
      this.materials.stone,
      stoneCubes
    )
    this.dirtInstancedMesh = new THREE.InstancedMesh(
      this.geometry,
      this.materials.dirt,
      dirtCubes
    )
    this.grassInstancedMesh = new THREE.InstancedMesh(
      this.geometry,
      this.materials.grass,
      grassCubes
    )

    const stoneMatrix = new THREE.Matrix4()
    const dirtMatrix = new THREE.Matrix4()
    const grassMatrix = new THREE.Matrix4()

    let stoneIndex = 0
    let dirtIndex = 0
    let grassIndex = 0

    for (let x = 0; x < this.dimensions; x++) {
      for (let y = 0; y < this.worldHeight; y++) {
        for (let z = 0; z < this.dimensions; z++) {
          const voxelType = this.voxelGrid[x][y][z]

          if (voxelType === 1) {
            stoneMatrix.setPosition(
              x * this.voxelSize,
              y * this.voxelSize,
              z * this.voxelSize
            )
            this.stoneInstancedMesh.setMatrixAt(stoneIndex, stoneMatrix)
            stoneIndex++
          } else if (voxelType === 2) {
            dirtMatrix.setPosition(
              x * this.voxelSize,
              y * this.voxelSize,
              z * this.voxelSize
            )
            this.dirtInstancedMesh.setMatrixAt(dirtIndex, dirtMatrix)
            dirtIndex++
          } else if (voxelType === 3) {
            grassMatrix.setPosition(
              x * this.voxelSize,
              y * this.voxelSize,
              z * this.voxelSize
            )
            this.grassInstancedMesh.setMatrixAt(grassIndex, grassMatrix)
            grassIndex++
          }
        }
      }
    }

    this.stoneInstancedMesh.instanceMatrix.needsUpdate = true
    this.dirtInstancedMesh.instanceMatrix.needsUpdate = true
    this.grassInstancedMesh.instanceMatrix.needsUpdate = true

    scene.add(
      this.stoneInstancedMesh,
      this.dirtInstancedMesh,
      this.grassInstancedMesh
    )
  }

  isVoxelSolid(x: number, y: number, z: number): boolean {
    if (
      x < 0 ||
      x >= this.dimensions ||
      y < 0 ||
      y >= this.worldHeight ||
      z < 0 ||
      z >= this.dimensions
    ) {
      return false
    }
    return this.voxelGrid[Math.floor(x)][Math.floor(y)][Math.floor(z)] !== 0
  }

  getGroundHeight(x: number, z: number): number {
    const floorX = Math.floor(x)
    const floorZ = Math.floor(z)

    for (let y = this.worldHeight - 1; y >= 0; y--) {
      if (this.isVoxelSolid(floorX, y, floorZ)) {
        return y + 1
      }
    }
    return 0
  }

  checkCollision(position: THREE.Vector3, checkY = true): boolean {
    const x = position.x
    const y = position.y
    const z = position.z

    const characterHeight = 1.5
    const feetY = y - characterHeight

    const collisionPoints = [
      { x: x - 0.3, z: z - 0.3 },
      { x: x + 0.3, z: z - 0.3 },
      { x: x - 0.3, z: z + 0.3 },
      { x: x + 0.3, z: z + 0.3 },
      { x: x, z: z },
    ]

    for (const point of collisionPoints) {
      for (
        let checkHeight = Math.floor(feetY);
        checkHeight <= Math.ceil(y);
        checkHeight++
      ) {
        if (this.isVoxelSolid(point.x, checkHeight, point.z)) {
          return true
        }
      }
    }

    return false
  }

  removeVoxel(x: number, y: number, z: number) {
    if (
      x < 0 ||
      x >= this.dimensions ||
      y < 0 ||
      y >= this.worldHeight ||
      z < 0 ||
      z >= this.dimensions
    ) {
      return
    }

    const oldVoxelType = this.voxelGrid[x][y][z]
    if (oldVoxelType === 0) return // Already air

    this.voxelGrid[x][y][z] = 0

    const targetPosition = new THREE.Vector3(
      x * this.voxelSize,
      y * this.voxelSize,
      z * this.voxelSize
    )
    let targetMesh

    switch (oldVoxelType) {
      case 1:
        targetMesh = this.stoneInstancedMesh
        break
      case 2:
        targetMesh = this.dirtInstancedMesh
        break
      case 3:
        targetMesh = this.grassInstancedMesh
        break
    }

    if (targetMesh) {
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

  getInstancedMeshes() {
    return {
      stone: this.stoneInstancedMesh,
      dirt: this.dirtInstancedMesh,
      grass: this.grassInstancedMesh,
    }
  }

  initializeCharacterPosition(camera: Camera) {
    const groundHeight = this.getGroundHeight(
      camera.camera.position.x,
      camera.camera.position.z
    )
    camera.camera.position.y = groundHeight + camera.getCharacterHeight()
  }
}
