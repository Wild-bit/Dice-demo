import * as CANNON from "cannon-es"
import * as THREE from "three"
import * as BufferGeometryUtils from "three/addons/utils/BufferGeometryUtils.js"
// import { MapControls } from "three/examples/jsm/controls/OrbitControls"
import { OrbitControls } from "https://cdn.skypack.dev/three@0.133.1/examples/jsm/controls/OrbitControls"

import GUI from "lil-gui"

const container = document.querySelector(".content")
const canvasEl = document.querySelector("#canvas")

let renderer, scene, camera, orbit, lightHolder, clock
let boxMaterialOuter, boxMaterialOuterWireframe

// const params = {
//   alpha: true,
//   antialias: true, // 是否执行抗锯齿。默认为false.
//   canvas: canvasEl, // 一个供渲染器绘制其输出的canvas
// }
let diceMesh

const params = {
  segments: 50,
  edgeRadius: 0.07,
  notchRadius: 0.12,
  notchDepth: 0.1,
  showOuterMesh: true,
  showInnerMesh: true,
  showOuterWireframe: false,
}

initScene()
createControls()
window.addEventListener("resize", updateSceneSize)

function initScene() {
  renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: true,
    canvas: canvasEl,
  })
  renderer.shadowMap.enabled = true
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

  scene = new THREE.Scene()

  camera = new THREE.PerspectiveCamera(
    45,
    container.clientWidth / container.clientHeight,
    0.1,
    100
  )
  camera.position.set(1, 1, 3)

  updateSceneSize()

  clock = new THREE.Clock()

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5)
  scene.add(ambientLight)
  lightHolder = new THREE.Group()
  const sideLight = new THREE.PointLight(0xffffff, 0.5)
  sideLight.position.set(5, 5, 5)
  lightHolder.add(sideLight)
  scene.add(lightHolder)

  orbit = new OrbitControls(camera, canvasEl)
  orbit.enableDamping = true

  createDiceMesh()

  render()
}

function createDiceMesh() {
  boxMaterialOuterWireframe = new THREE.MeshNormalMaterial({
    wireframe: true,
  })
  boxMaterialOuter = new THREE.MeshStandardMaterial({
    color: 0xeeeeee,
    visible: params.showOuterMesh,
  })
  const boxMaterialInner = new THREE.MeshStandardMaterial({
    color: 0x000000,
    roughness: 0,
    metalness: 1,
    visible: params.showInnerMesh,
    side: THREE.DoubleSide,
  })

  diceMesh = new THREE.Group()
  const innerMesh = new THREE.Mesh(createInnerGeometry(), boxMaterialInner)
  const outerMesh = new THREE.Mesh(
    createBoxGeometry(),
    params.showOuterWireframe ? boxMaterialOuterWireframe : boxMaterialOuter
  )
  diceMesh.add(innerMesh, outerMesh)
  scene.add(diceMesh)
}

function createBoxGeometry() {
  let boxGeometry = new THREE.BoxGeometry(
    1,
    1,
    1,
    params.segments,
    params.segments,
    params.segments
  )

  const positionAttr = boxGeometry.attributes.position
  const subCubeHalfSize = 0.5 - params.edgeRadius

  for (let i = 0; i < positionAttr.count; i++) {
    let position = new THREE.Vector3().fromBufferAttribute(positionAttr, i)

    const subCube = new THREE.Vector3(
      Math.sign(position.x),
      Math.sign(position.y),
      Math.sign(position.z)
    ).multiplyScalar(subCubeHalfSize)
    const addition = new THREE.Vector3().subVectors(position, subCube)

    if (
      Math.abs(position.x) > subCubeHalfSize &&
      Math.abs(position.y) > subCubeHalfSize &&
      Math.abs(position.z) > subCubeHalfSize
    ) {
      addition.normalize().multiplyScalar(params.edgeRadius)
      position = subCube.add(addition)
    } else if (
      Math.abs(position.x) > subCubeHalfSize &&
      Math.abs(position.y) > subCubeHalfSize
    ) {
      addition.z = 0
      addition.normalize().multiplyScalar(params.edgeRadius)
      position.x = subCube.x + addition.x
      position.y = subCube.y + addition.y
    } else if (
      Math.abs(position.x) > subCubeHalfSize &&
      Math.abs(position.z) > subCubeHalfSize
    ) {
      addition.y = 0
      addition.normalize().multiplyScalar(params.edgeRadius)
      position.x = subCube.x + addition.x
      position.z = subCube.z + addition.z
    } else if (
      Math.abs(position.y) > subCubeHalfSize &&
      Math.abs(position.z) > subCubeHalfSize
    ) {
      addition.x = 0
      addition.normalize().multiplyScalar(params.edgeRadius)
      position.y = subCube.y + addition.y
      position.z = subCube.z + addition.z
    }

    const notchWave = (v) => {
      v = (1 / params.notchRadius) * v
      v = Math.PI * Math.max(-1, Math.min(1, v))
      return params.notchDepth * (Math.cos(v) + 1)
    }
    const notch = (pos) => notchWave(pos[0]) * notchWave(pos[1])

    const offset = 0.23

    if (position.y === 0.5) {
      position.y -= notch([position.x, position.z])
    } else if (position.x === 0.5) {
      position.x -= notch([position.y + offset, position.z + offset])
      position.x -= notch([position.y - offset, position.z - offset])
    } else if (position.z === 0.5) {
      position.z -= notch([position.x - offset, position.y + offset])
      position.z -= notch([position.x, position.y])
      position.z -= notch([position.x + offset, position.y - offset])
    } else if (position.z === -0.5) {
      position.z += notch([position.x + offset, position.y + offset])
      position.z += notch([position.x + offset, position.y - offset])
      position.z += notch([position.x - offset, position.y + offset])
      position.z += notch([position.x - offset, position.y - offset])
    } else if (position.x === -0.5) {
      position.x += notch([position.y + offset, position.z + offset])
      position.x += notch([position.y + offset, position.z - offset])
      position.x += notch([position.y, position.z])
      position.x += notch([position.y - offset, position.z + offset])
      position.x += notch([position.y - offset, position.z - offset])
    } else if (position.y === -0.5) {
      position.y += notch([position.x + offset, position.z + offset])
      position.y += notch([position.x + offset, position.z])
      position.y += notch([position.x + offset, position.z - offset])
      position.y += notch([position.x - offset, position.z + offset])
      position.y += notch([position.x - offset, position.z])
      position.y += notch([position.x - offset, position.z - offset])
    }

    positionAttr.setXYZ(i, position.x, position.y, position.z)
  }

  boxGeometry.deleteAttribute("normal")
  boxGeometry.deleteAttribute("uv")
  boxGeometry = BufferGeometryUtils.mergeVertices(boxGeometry)

  boxGeometry.computeVertexNormals()

  return boxGeometry
}

function createInnerGeometry() {
  const baseGeometry = new THREE.PlaneGeometry(
    1 - 2 * params.edgeRadius,
    1 - 2 * params.edgeRadius
  )
  const offset = 0.48
  return BufferGeometryUtils.mergeBufferGeometries(
    [
      baseGeometry.clone().translate(0, 0, offset),
      baseGeometry.clone().translate(0, 0, -offset),
      baseGeometry
        .clone()
        .rotateX(0.5 * Math.PI)
        .translate(0, -offset, 0),
      baseGeometry
        .clone()
        .rotateX(0.5 * Math.PI)
        .translate(0, offset, 0),
      baseGeometry
        .clone()
        .rotateY(0.5 * Math.PI)
        .translate(-offset, 0, 0),
      baseGeometry
        .clone()
        .rotateY(0.5 * Math.PI)
        .translate(offset, 0, 0),
    ],
    false
  )
}

function recreateGeometry() {
  diceMesh.children[0].geometry = createInnerGeometry()
  diceMesh.children[1].geometry = createBoxGeometry()
}

function render() {
  orbit.update()
  lightHolder.quaternion.copy(camera.quaternion)

  const elapsedTime = 0.4 * clock.getElapsedTime()
  diceMesh.rotation.x = 2.2 + elapsedTime
  diceMesh.rotation.y = elapsedTime

  renderer.render(scene, camera)
  requestAnimationFrame(render)
}

function updateSceneSize() {
  camera.aspect = container.clientWidth / container.clientHeight
  camera.updateProjectionMatrix()
  renderer.setSize(container.clientWidth, container.clientHeight)
}

function createControls() {
  const gui = new GUI()
  gui.add(params, "showInnerMesh").onChange((v) => {
    diceMesh.children[0].visible = v
  })
  gui.add(params, "showOuterWireframe").onChange((v) => {
    diceMesh.children[1].visible = true
    diceMesh.children[1].material = v
      ? boxMaterialOuterWireframe
      : boxMaterialOuter
  })
  gui.add(params, "showOuterMesh").onChange((v) => {
    diceMesh.children[1].visible = v
  })
  gui
    .add(params, "edgeRadius", 0.01, 0.2)
    .step(0.01)
    .onChange(recreateGeometry)
    .name("box edgeRadius")
  gui
    .add(params, "notchRadius", 0.01, 0.2)
    .step(0.01)
    .onChange(recreateGeometry)
    .name("notches edgeRadius")
  gui
    .add(params, "notchDepth", 0.02, 0.2)
    .step(0.01)
    .onChange(recreateGeometry)
    .name("notches depth")
  gui
    .add(params, "segments", 2, 70)
    .step(1)
    .onChange(recreateGeometry)
    .name("outer mesh segments")
}
