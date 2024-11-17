import * as THREE from 'three';

/**
 * @typedef {Object} Dimensions
 * @property {number} width - Width of the renderer.
 * @property {number} height - Height of the renderer.
 */

/**
 * @typedef {Object} Options
 * @property {number} [backgroundColor=0x202020] - Background color of the scene.
 * @property {Object} [cameraPosition] - Initial position of the camera.
 * @property {number} [cameraPosition.x=0] - Camera x-coordinate.
 * @property {number} [cameraPosition.y=5] - Camera y-coordinate.
 * @property {number} [cameraPosition.z=10] - Camera z-coordinate.
 */

/**
 * Creates a Three.js scene with an optional background color.
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
 * @param {Object} [params.position={x: 0, y: 5, z: 10}] - Initial position of the camera.
 * @returns {THREE.PerspectiveCamera} - The created camera.
 */
function createCamera({ aspectRatio, position = { x: 0, y: 5, z: 10 } }) {
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
	if (!width || !height) {
		throw new Error('Both width and height must be provided to create a renderer.');
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
 * Assembles the 3D scene components and returns them.
 * @param {HTMLCanvasElement} canvas - The canvas element.
 * @param {Object} params - Configuration parameters.
 * @param {Dimensions} params.dimensions - Renderer dimensions.
 * @param {Options} [params.options={}] - Additional options.
 * @returns {Object} - The assembled 3D scene components.
 */
export function create3DScene({ canvas, dimensions, options = {} }) {
	// Validate dimensions
	const { width, height } = dimensions;
	if (!width || !height) {
		throw new Error('Dimensions must include both width and height.');
	}

	// Destructure options with defaults
	const { backgroundColor = 0x202020, cameraPosition = { x: 0, y: 5, z: 10 } } = options;

	// Create components using pure functions
	const scene = createScene(backgroundColor);
	const camera = createCamera({ aspectRatio: width / height, position: cameraPosition });
	const renderer = createRenderer(canvas, { width, height });

	// Add default lighting
	addDefaultLighting(scene);

	// Return the assembled components
	return {
		scene,
		camera,
		renderer,
		addObject: (object) => scene.add(object),
		removeObject: (object) => scene.remove(object),
		resize: (newDimensions) => {
			const { width, height } = newDimensions;
			camera.aspect = width / height;
			camera.updateProjectionMatrix();
			renderer.setSize(width, height);
		},
		render: () => renderer.render(scene, camera)
	};
}
