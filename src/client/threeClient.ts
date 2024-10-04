import type { Texture } from 'three';
import {
  //ACESFilmicToneMapping,
  //AmbientLight,
  AxesHelper,
  Box3,
  BoxGeometry,
  Color,
  DirectionalLight,
  GridHelper,
  Group,
  //LinearEncoding,
  Mesh,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  PerspectiveCamera,
  PCFSoftShadowMap,
  PlaneGeometry,
  PMREMGenerator,
  Scene,
  ShadowMaterial,
  WebGLRenderer,
} from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { EXRLoader } from 'three/examples/jsm/loaders/EXRLoader';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader';
import Stats from 'three/examples/jsm/libs/stats.module';
import { GUI } from 'dat.gui';

export const helloCube = (canvas: HTMLElement) => {
  const renderer = new WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFSoftShadowMap;
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  //renderer.toneMapping = NoToneMapping;
  //renderer.outputEncoding = sRGBEncoding;
  //renderer.toneMapping = ACESFilmicToneMapping;

  const camera = new PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.y = 4;
  camera.position.z = 8;
  const controls = new OrbitControls(camera, renderer.domElement);

  const exrLoader = new EXRLoader();
  const rgbeLoader = new RGBELoader();
  const scene = new Scene();
  scene.background = new Color(0xc0c0c0);
  const pmremGenerator = new PMREMGenerator(renderer);
  const roomEnvironment = new RoomEnvironment();
  const environmentTexture = pmremGenerator.fromScene(
    roomEnvironment,
    0.04
  ).texture;
  scene.environment = environmentTexture;
  //scene.background = environmentTexture;
  scene.background = new Color(0xffffff);

  const gridHelper = new GridHelper(10, 10);
  scene.add(gridHelper);
  const axesHelper = new AxesHelper(2);
  scene.add(axesHelper);

  const directionalLight = new DirectionalLight(0xffffff, 0.5);
  directionalLight.position.set(1, 3, 1);
  directionalLight.castShadow = true;
  scene.add(directionalLight);
  const lightTransformControl = new TransformControls(
    camera,
    renderer.domElement
  );
  lightTransformControl.addEventListener('dragging-changed', (event: any) => {
    controls.enabled = !event.value;
  });
  lightTransformControl.attach(directionalLight);
  lightTransformControl.getHelper().visible = false;
  scene.add(lightTransformControl.getHelper());

  const groundGeometry = new PlaneGeometry(10, 10);
  groundGeometry.rotateX(-Math.PI / 2);
  const groundMaterial = new ShadowMaterial();
  const groundMesh = new Mesh(groundGeometry, groundMaterial);
  groundMesh.receiveShadow = true;
  scene.add(groundMesh);

  const meshGroup = new Group();
  scene.add(meshGroup);
  const geometry = new BoxGeometry(1, 1, 1);
  const material = new MeshPhysicalMaterial({ color: 0xe02020 });
  const mesh = new Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.position.y = 0.5;
  meshGroup.add(mesh);
  const meshTransformControl = new TransformControls(
    camera,
    renderer.domElement
  );
  meshTransformControl.addEventListener('dragging-changed', (event: any) => {
    controls.enabled = !event.value;
  });
  meshTransformControl.attach(meshGroup);
  meshTransformControl.getHelper().visible = false;
  scene.add(meshTransformControl.getHelper());

  const stats = new Stats();
  document.body.appendChild(stats.dom);
  const gui = new GUI();
  const uiProperties = {
    'mesh transform control': meshTransformControl.getHelper().visible,
    'light transform control': lightTransformControl.getHelper().visible,
  };
  gui
    .add(uiProperties, 'mesh transform control')
    .onChange(
      (value: any) => (meshTransformControl.getHelper().visible = value)
    );
  gui
    .add(uiProperties, 'light transform control')
    .onChange(
      (value: any) => (lightTransformControl.getHelper().visible = value)
    );

  window.addEventListener(
    'resize',
    () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    },
    false
  );

  let previousTimeStamp: number | undefined;
  const animate = (timestamp: number) => {
    const deltaTimeMs = timestamp - (previousTimeStamp ?? timestamp);
    previousTimeStamp = timestamp;
    requestAnimationFrame(animate);
    meshGroup.rotation.y += (((45 * Math.PI) / 180) * deltaTimeMs) / 1000;
    controls.update();
    render();
    stats.update();
  };

  const loadGLTF = async (resource: string) => {
    const gltfLoader = new GLTFLoader();
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('three/examples/jsm/libs/draco/'); // TODO

    // Optional: Provide a DRACOLoader instance to decode compressed mesh data
    // const dracoLoader = new DRACOLoader();
    // dracoLoader.setDecoderPath( '/examples/jsm/libs/draco/' );
    // loader.setDRACOLoader( dracoLoader );

    const gltf = await gltfLoader.loadAsync(resource);
    gltf.scene.traverse((child) => {
      if (child instanceof Mesh) {
        if (child.isMesh) {
          const childMaterial = child.material;
          if (childMaterial instanceof MeshStandardMaterial) {
            if (childMaterial.transparent === false) {
              child.castShadow = true;
              child.receiveShadow = true;
            }
          }
        }
        if (child.material instanceof MeshStandardMaterial) {
          child.material.envMapIntensity = 1;
          child.material.needsUpdate = true;
        }
      }
    });
    const meshBox = new Box3().setFromObject(gltf.scene);
    gltf.scene.position.y = -meshBox.min.y;
    meshGroup.clear();
    meshGroup.add(gltf.scene);
  };

  const loadResource = (resourceName: string, resource: string) => {
    const lowerName = resourceName.toLowerCase();
    if (lowerName.endsWith('.exr')) {
      exrLoader.load(resource, (texture: Texture, _textureData: any) => {
        const environmentMapTexture =
          pmremGenerator.fromEquirectangular(texture).texture;
        scene.background = environmentMapTexture;
        scene.environment = environmentMapTexture;
      });
    } else if (lowerName.endsWith('.hdr')) {
      rgbeLoader.load(resource, (texture: Texture, _textureData: any) => {
        const environmentMapTexture =
          pmremGenerator.fromEquirectangular(texture).texture;
        scene.background = environmentMapTexture;
        scene.environment = environmentMapTexture;
      });
    } else if (lowerName.endsWith('.glb') || lowerName.endsWith('.gltf')) {
      void loadGLTF(resource);
    }
  };

  setupDragDrop(
    'holder',
    'hover',
    (file: File, event: ProgressEvent<FileReader>) => {
      // @ts-ignore
      loadResource(file.name, event.target.result);
    }
  );

  const render = () => {
    renderer.render(scene, camera);
  };
  requestAnimationFrame(animate);
};

const setupDragDrop = (
  elementId: string,
  className: string,
  load: (file: File, event: ProgressEvent<FileReader>) => void
) => {
  const holder = document.getElementById(elementId);
  if (!holder) {
    return;
  }
  holder.ondragover = function () {
    // @ts-ignore
    this.className = className;
    return false;
  };
  holder.ondragend = function () {
    // @ts-ignore
    this.className = '';
    return false;
  };
  holder.ondrop = function (e) {
    // @ts-ignore
    this.className = '';
    e.preventDefault();
    // @ts-ignore
    const file = e.dataTransfer.files[0];
    const reader = new FileReader();
    reader.onload = (event) => load(file, event);
    reader.readAsDataURL(file);
  };
};

const threeCanvas = document.getElementById('three_canvas');
if (threeCanvas === null) {
  throw new Error('three_canvas not found');
}
helloCube(threeCanvas);
