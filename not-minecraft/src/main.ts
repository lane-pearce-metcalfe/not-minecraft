import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/Addons.js'

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
