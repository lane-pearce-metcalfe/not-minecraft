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
