import * as THREE from 'three'
import { Camera } from './camera'
import { World } from './world'

export class VoxelInteraction {
  private canvas: HTMLCanvasElement
  private camera: Camera
  private world: World
  private raycaster: THREE.Raycaster

  constructor(canvas: HTMLCanvasElement, camera: Camera, world: World) {
    this.canvas = canvas
    this.camera = camera
    this.world = world
    this.raycaster = new THREE.Raycaster()

    this.setupEventListeners()
  }

  private setupEventListeners() {
    window.addEventListener('click', this.onMouseClick.bind(this), false)
  }

  private onMouseClick(event: MouseEvent) {
    if (document.pointerLockElement !== this.canvas) return

    this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera.camera)
    const intersects = []
    const meshes = this.world.getInstancedMeshes()

    const stoneIntersects = this.raycaster.intersectObject(meshes.stone)
    intersects.push(...stoneIntersects.map((hit) => ({ ...hit, voxelType: 1 })))

    const dirtIntersects = this.raycaster.intersectObject(meshes.dirt)
    intersects.push(...dirtIntersects.map((hit) => ({ ...hit, voxelType: 2 })))

    const grassIntersects = this.raycaster.intersectObject(meshes.grass)
    intersects.push(...grassIntersects.map((hit) => ({ ...hit, voxelType: 3 })))

    if (intersects.length > 0) {
      intersects.sort((a, b) => a.distance - b.distance)
      const closestHit = intersects[0]

      const worldPos = closestHit.point
      const voxelX = Math.floor(worldPos.x / this.world.voxelSize)
      const voxelY = Math.floor(worldPos.y / this.world.voxelSize)
      const voxelZ = Math.floor(worldPos.z / this.world.voxelSize)

      this.world.removeVoxel(voxelX, voxelY, voxelZ)
    }
  }
}
