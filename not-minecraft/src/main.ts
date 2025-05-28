import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/Addons.js'
import { generateNoiseMap } from './perlinNoise'

//Camera settings
const fov = 75
const aspect = window.innerWidth / window.innerHeight
const near = 0.1
const far = 100

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
const dimensions = 128

//Adding lights
const color = 0xffffff
const intensity = 10
const light = new THREE.DirectionalLight(color, intensity)
const lightPosition = dimensions / 2
light.position.set(lightPosition, 128, lightPosition)
light.target.position.set(lightPosition, 0, lightPosition)
scene.add(light)

//Making the background of the world clear
renderer.setClearColor(0xfffff, 0)

//Storing the box geometry in a varaible as well as different messhes for different types of blocks
const geometry = new THREE.BoxGeometry(1, 1, 1)
const grass = new THREE.MeshBasicMaterial({ color: 'green' })
const stone = new THREE.MeshBasicMaterial({ color: 'grey' })
const dirt = new THREE.MeshBasicMaterial({ color: 'rgb(84, 57, 23)' })

//Creating a perlin noise map
const scale = 0.03
const octaves = 3
const frequency = 0.4
const noiseMap = generateNoiseMap(
  dimensions,
  dimensions,
  scale,
  octaves,
  frequency
)

//Creating a the stone in the worlds mesh
let totalCubes = 0
noiseMap.forEach((row) => {
  row.forEach((cell) => {
    const height = Math.round(cell * 100) - 42
    if (height > 0) {
      totalCubes += height
    }
  })
})

const stoneInstancedMesh = new THREE.InstancedMesh(geometry, stone, totalCubes)

const stoneMatrix = new THREE.Matrix4()
let stoneIndex = 0

noiseMap.forEach((row, i) => {
  row.forEach((cell, j) => {
    const maxHeight = Math.round(cell * 100) - 42
    for (let y = 1; y <= maxHeight; y++) {
      stoneMatrix.setPosition(j, y, i)
      stoneInstancedMesh.setMatrixAt(stoneIndex, stoneMatrix)
      stoneIndex++
    }
  })
})

//Creating the dirt in the world
const dirtInstancedMesh = new THREE.InstancedMesh(
  geometry,
  dirt,
  dimensions * dimensions
)

const dirtMatrix = new THREE.Matrix4()
let dirtIndex = 0

noiseMap.forEach((row, i) => {
  row.forEach((cell, j) => {
    let y = Math.round(cell * 100) - 41
    if (y < 1) {
      y = 1
    }
    dirtMatrix.setPosition(j, y, i)
    dirtInstancedMesh.setMatrixAt(dirtIndex, dirtMatrix)
    dirtIndex++
  })
})

const grassInstancedMesh = new THREE.InstancedMesh(
  geometry,
  grass,
  dimensions * dimensions
)

const grassMatrix = new THREE.Matrix4()
let grassIndex = 0

noiseMap.forEach((row, i) => {
  row.forEach((cell, j) => {
    let y = Math.round(cell * 100) - 40
    if (y < 2) {
      y = 2
    }
    grassMatrix.setPosition(j, y, i)
    grassInstancedMesh.setMatrixAt(grassIndex, grassMatrix)
    grassIndex++
  })
})

//Honestly cant remember why I need to do this I just followed the docs but I think this makes it so that the meshes have been modified and need to be uploaded to the GPU
stoneInstancedMesh.instanceMatrix.needsUpdate = true
dirtInstancedMesh.instanceMatrix.needsUpdate = true
grassInstancedMesh.instanceMatrix.needsUpdate = true

//Adding meshes to the scene
scene.add(stoneInstancedMesh, dirtInstancedMesh, grassInstancedMesh)

//Animating scene
function animate() {
  renderer.render(scene, camera)
}

renderer.setAnimationLoop(animate)
