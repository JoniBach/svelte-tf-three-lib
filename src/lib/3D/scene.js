import * as THREE from 'three';
import { EventManager } from './event.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

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

	// Add lines to the group
	guides.add(xLine, yLine, zLine);

	return guides;
}

/**
 * Creates a Three.js scene with optional OrbitControls.
 * @param {HTMLCanvasElement} canvas - The canvas element.
 * @param {Object} params - Configuration parameters.
 * @param {Dimensions} params.dimensions - Renderer dimensions.
 * @param {Options} [params.options={}] - Additional options.
 * @param {boolean} [params.options.enableOrbitControls=false] - Enable OrbitControls.
 * @param {Object} [params.options.orbitControlsConfig={}] - Configuration for OrbitControls.
 * @returns {Object} - The assembled 3D scene components.
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

	// Core components
	const scene = createScene(backgroundColor);
	const camera = createCamera({ aspectRatio: width / height, position: cameraPosition });
	const renderer = createRenderer(canvas, { width, height });
	addDefaultLighting(scene);

	// Handle resizing
	handleResize(renderer, camera);

	// Maintain a registry of update functions
	const updateFunctions = [];

	// Initialize the event manager
	const eventManager = new EventManager(scene, camera, renderer);

	// Add world guides if enabled
	if (enableWorldGuides) {
		const worldGuides = createWorldGuides(worldGuidesConfig);
		scene.add(worldGuides);
	}

	// OrbitControls (optional)
	let orbitControls = null;
	if (enableOrbitControls) {
		orbitControls = new OrbitControls(camera, renderer.domElement);

		// Apply user-defined configuration
		Object.entries(orbitControlsConfig).forEach(([key, value]) => {
			if (key in orbitControls) orbitControls[key] = value;
		});

		// Add OrbitControls update to the animation loop
		updateFunctions.push(() => orbitControls.update());
	}

	// Hook into the EventManager to manage OrbitControls state
	if (orbitControls) {
		eventManager.addGlobalDragHandlers({
			onDragStart: () => (orbitControls.enabled = false),
			onDragEnd: () => (orbitControls.enabled = true)
		});
	}

	// Drag handling logic
	function makeDraggable(object) {
		eventManager.addObject(object, {
			onDrag: (event) => {
				const dragPlaneNormal = new THREE.Vector3(0, 1, 0); // X-Z plane normal
				const dragPlane = new THREE.Plane(dragPlaneNormal, 0);
				const intersectPoint = new THREE.Vector3();

				// Raycast to the drag plane
				eventManager.raycaster.setFromCamera(eventManager.pointer, camera);
				eventManager.raycaster.ray.intersectPlane(dragPlane, intersectPoint);

				// Calculate world movement based on pointer deltas
				const movement = new THREE.Vector3(
					event.movementX * 0.01,
					0, // Restrict to the X-Z plane
					-event.movementY * 0.01
				);

				// Adjust for camera orientation
				const worldMovement = movement.applyQuaternion(camera.quaternion);

				// Apply movement to the object's position
				object.position.add(worldMovement);
			}
		});
	}

	// Animation loop
	function animate() {
		requestAnimationFrame(animate);
		updateFunctions.forEach((fn) => fn());
		renderer.render(scene, camera);
	}

	animate();

	// Exposed API
	return {
		scene,
		camera,
		renderer,
		eventManager, // Expose the event manager
		orbitControls, // Expose OrbitControls for advanced usage
		addObject: (object) => scene.add(object),
		removeObject: (object) => scene.remove(object),
		makeDraggable, // Expose makeDraggable for external usage
		addUpdate: (fn) => updateFunctions.push(fn),
		removeUpdate: (fn) => {
			const index = updateFunctions.indexOf(fn);
			if (index > -1) updateFunctions.splice(index, 1);
		},
		resize: (newDimensions) => {
			const { width, height } = newDimensions;
			camera.aspect = width / height;
			camera.updateProjectionMatrix();
			renderer.setSize(width, height);
		}
	};
}
