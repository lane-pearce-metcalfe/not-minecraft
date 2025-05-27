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
