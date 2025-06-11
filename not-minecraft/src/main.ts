import * as THREE from 'three'
import { Camera } from './camera'
import { World } from './world'
import { Controls } from './controls'
import { VoxelInteraction } from './voxelInteraction'
import { createCrosshair } from './ui'

const scene = new THREE.Scene()

const renderer = new THREE.WebGLRenderer()
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.setClearColor(0x87ceeb, 1)
const canvas = renderer.domElement
document.body.appendChild(canvas)

const camera = new Camera(canvas)
const world = new World(scene)
new Controls(canvas, camera)
new VoxelInteraction(canvas, camera, world)

createCrosshair()

world.initializeCharacterPosition(camera)

function animate() {
  camera.updatePosition(world)
  renderer.render(scene, camera.camera)
}

renderer.setAnimationLoop(animate)
