import * as THREE from 'three';
import { createEventManager } from './event.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

/**
 * Creates a Three.js scene with optional OrbitControls and collision handling.
 * @param {Object} config - Configuration options.
 * @param {HTMLCanvasElement} config.canvas - The canvas to use for rendering.
 * @param {Object} config.dimensions - The dimensions for the renderer.
 * @param {number} config.dimensions.width - The width of the renderer.
 * @param {number} config.dimensions.height - The height of the renderer.
 * @param {Object} config.options - Additional configuration options.
 * @returns {Object} - The created 3D scene and its components.
 */
export function create3DScene({ canvas, dimensions, options = {} }) {
	const { width, height } = dimensions;
	const {
		backgroundColor = 0x202020,
		cameraPosition = { x: 0, y: 5, z: 10 },
		enableWorldGuides = false,
		worldGuidesConfig = { length: 10 },
		enableOrbitControls = false,
		orbitControlsConfig = {}
	} = options;

	// Create modular components
	const scene = createScene(backgroundColor);
	const camera = createCamera({ aspectRatio: width / height, position: cameraPosition });
	const renderer = createRenderer(canvas, { width, height });

	// Add lighting
	addDefaultLighting(scene);

	// OrbitControls setup
	let orbitControls = null;
	if (enableOrbitControls) {
		orbitControls = new OrbitControls(camera, renderer.domElement);
		Object.entries(orbitControlsConfig).forEach(([key, value]) => {
			if (key in orbitControls) orbitControls[key] = value;
		});
	}

	// Initialize the event manager
	const eventManager = createEventManager({ scene, camera, renderer, orbitControls });

	// Add world guides if enabled
	if (enableWorldGuides) {
		const guides = createWorldGuides(worldGuidesConfig);
		scene.add(guides);
	}

	// Handle resizing
	handleResize(renderer, camera);

	// Animation loop
	function animate() {
		requestAnimationFrame(animate);
		if (orbitControls) orbitControls.update();
		eventManager.updateCollisions();
		renderer.render(scene, camera);
	}

	animate();

	return {
		scene,
		camera,
		renderer,
		eventManager,
		addObject: eventManager.addObject,
		removeObject: eventManager.removeObject
	};
}

/**
 * Creates a Three.js scene.
 * @param {number} backgroundColor - Background color for the scene.
 * @returns {THREE.Scene} - The created scene.
 */
function createScene(backgroundColor = 0x202020) {
	const scene = new THREE.Scene();
	scene.background = new THREE.Color(backgroundColor);
	return scene;
}

/**
 * Creates a Three.js perspective camera.
 * @param {Object} params - Camera parameters.
 * @param {number} params.aspectRatio - Aspect ratio for the camera.
 * @param {Object} params.position - Initial position of the camera.
 * @returns {THREE.PerspectiveCamera} - The created camera.
 */
function createCamera({ aspectRatio, position }) {
	const camera = new THREE.PerspectiveCamera(75, aspectRatio, 0.1, 1000);
	camera.position.set(position.x, position.y, position.z);
	return camera;
}

/**
 * Creates a WebGL renderer and binds it to a canvas.
 * @param {HTMLCanvasElement} canvas - The canvas to bind the renderer to.
 * @param {Object} params - Renderer parameters.
 * @param {number} params.width - Width of the renderer.
 * @param {number} params.height - Height of the renderer.
 * @returns {THREE.WebGLRenderer} - The created renderer.
 */
function createRenderer(canvas, { width, height }) {
	if (!canvas) {
		throw new Error('A valid canvas element is required to create a renderer.');
	}
	const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
	renderer.setSize(width, height);
	renderer.setPixelRatio(window.devicePixelRatio);
	return renderer;
}

/**
 * Adds default lighting to a scene.
 * @param {THREE.Scene} scene - The scene to add lights to.
 */
function addDefaultLighting(scene) {
	const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
	scene.add(ambientLight);

	const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
	directionalLight.position.set(10, 10, 10);
	scene.add(directionalLight);
}

/**
 * Handles resizing the renderer and updating the camera's aspect ratio.
 * @param {THREE.WebGLRenderer} renderer - The renderer to resize.
 * @param {THREE.PerspectiveCamera} camera - The camera to update.
 */
function handleResize(renderer, camera) {
	window.addEventListener('resize', () => {
		const width = window.innerWidth;
		const height = window.innerHeight;
		renderer.setSize(width, height);
		camera.aspect = width / height;
		camera.updateProjectionMatrix();
	});
}

/**
 * Creates XYZ world guides (lines) at the origin.
 * @param {Object} params - Configuration parameters for the guides.
 * @param {number} [params.length=10] - Length of the guides.
 * @returns {THREE.Group} - A group containing the XYZ guides.
 */
function createWorldGuides({ length = 10 } = {}) {
	const guides = new THREE.Group();

	// X-axis (Red)
	const xMaterial = new THREE.LineBasicMaterial({ color: 0xff0000 });
	const xGeometry = new THREE.BufferGeometry().setFromPoints([
		new THREE.Vector3(0, 0, 0),
		new THREE.Vector3(length, 0, 0)
	]);
	const xLine = new THREE.Line(xGeometry, xMaterial);

	// Y-axis (Green)
	const yMaterial = new THREE.LineBasicMaterial({ color: 0x00ff00 });
	const yGeometry = new THREE.BufferGeometry().setFromPoints([
		new THREE.Vector3(0, 0, 0),
		new THREE.Vector3(0, length, 0)
	]);
	const yLine = new THREE.Line(yGeometry, yMaterial);

	// Z-axis (Blue)
	const zMaterial = new THREE.LineBasicMaterial({ color: 0x0000ff });
	const zGeometry = new THREE.BufferGeometry().setFromPoints([
		new THREE.Vector3(0, 0, 0),
		new THREE.Vector3(0, 0, length)
	]);
	const zLine = new THREE.Line(zGeometry, zMaterial);

	guides.add(xLine, yLine, zLine);

	return guides;
}
