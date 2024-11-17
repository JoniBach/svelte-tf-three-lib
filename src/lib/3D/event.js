import * as THREE from 'three';
import { CollisionManager } from './collision.js';

/**
 * Creates an EventManager instance that consolidates collision handling, dragging,
 * and custom event handlers into a single `addObject` call.
 */
export function createEventManager({ scene, camera, renderer, orbitControls = null }) {
	const raycaster = new THREE.Raycaster();
	const pointer = new THREE.Vector2();
	const objectHandlers = new Map();
	const collisionManager = new CollisionManager();
	let dragging = null;

	/**
	 * Add an object to the EventManager with integrated collision, dragging, and handlers.
	 * Automatically checks for overlaps using the collision system before adding.
	 *
	 * @param {THREE.Object3D} object - The object to manage.
	 * @param {Object} options - Options for the object.
	 * @param {Object} [options.handlers={}] - Event handlers (onDragStart, onDrag, onDragEnd, onClick).
	 * @param {Object} [options.collisionOptions={}] - Collision options (onCollide).
	 * @param {Function} [options.constraintCallback] - Optional callback to constrain object position during dragging.
	 */
	function addObject(object, { handlers = {}, collisionOptions = {}, constraintCallback } = {}) {
		// Ensure object does not overlap with existing objects
		if (collisionManager.isOverlapping(object)) {
			console.warn('Attempted to add an overlapping object:', object);
			return;
		}

		// Add to collision manager if collision options exist
		collisionManager.addObject(object, collisionOptions);

		// Add handlers for dragging or other events
		objectHandlers.set(object, {
			onDragStart: () => {
				if (orbitControls) orbitControls.enabled = false;
				if (handlers.onDragStart) handlers.onDragStart();
			},
			onDrag: (event) => {
				const dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0); // XZ plane
				const intersectPoint = new THREE.Vector3();
				raycaster.setFromCamera(pointer, camera);
				raycaster.ray.intersectPlane(dragPlane, intersectPoint);

				if (constraintCallback) {
					constraintCallback(intersectPoint);
				}

				object.position.copy(intersectPoint);
				if (handlers.onDrag) handlers.onDrag(event);
			},
			onDragEnd: () => {
				if (orbitControls) orbitControls.enabled = true;
				if (handlers.onDragEnd) handlers.onDragEnd();
			},
			onClick: handlers.onClick
		});
	}

	/**
	 * Remove an object from the EventManager.
	 * @param {THREE.Object3D} object - The object to remove.
	 */
	function removeObject(object) {
		objectHandlers.delete(object);
		collisionManager.removeObject(object);
	}

	/**
	 * Update the collision system to check for interactions.
	 */
	function updateCollisions() {
		collisionManager.checkCollisions();
	}

	// Attach pointer event listeners
	renderer.domElement.addEventListener('pointermove', (event) =>
		handlePointerMove({ pointer, raycaster, camera, objectHandlers, dragging, event })
	);
	renderer.domElement.addEventListener('pointerdown', (event) => {
		dragging = handlePointerDown({ pointer, raycaster, camera, objectHandlers, event });
	});
	renderer.domElement.addEventListener('pointerup', () => {
		handlePointerUp({ dragging, objectHandlers });
		dragging = null;
	});

	/**
	 * Exposes isOverlapping to check potential overlaps.
	 * @param {THREE.Object3D} newObject - The object to check for overlap.
	 * @returns {boolean} - True if overlapping, false otherwise.
	 */
	function isOverlapping(newObject) {
		return collisionManager.isOverlapping(newObject);
	}

	return {
		addObject,
		removeObject,
		updateCollisions,
		isOverlapping
	};
}

/**
 * Handles pointer movement.
 * @param {Object} options - Options for pointer movement.
 * @param {THREE.Vector2} options.pointer - Pointer vector.
 * @param {THREE.Raycaster} options.raycaster - Raycaster instance.
 * @param {THREE.Camera} options.camera - Camera used for raycasting.
 * @param {Map} options.objectHandlers - Handlers for objects in the scene.
 * @param {THREE.Object3D|null} options.dragging - Currently dragged object, if any.
 * @param {PointerEvent} options.event - Pointer move event.
 */
function handlePointerMove({ pointer, raycaster, camera, objectHandlers, dragging, event }) {
	pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
	pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;

	raycaster.setFromCamera(pointer, camera);

	if (dragging) {
		const handlers = objectHandlers.get(dragging);
		if (handlers?.onDrag) {
			handlers.onDrag(event);
		}
		return;
	}

	const intersects = raycaster.intersectObjects([...objectHandlers.keys()]);
	for (const intersect of intersects) {
		const handlers = objectHandlers.get(intersect.object);
		if (handlers?.onHover) {
			handlers.onHover(intersect.object);
		}
	}
}

/**
 * Handles pointer down events.
 * @param {Object} options - Options for pointer down.
 * @param {THREE.Vector2} options.pointer - Pointer vector.
 * @param {THREE.Raycaster} options.raycaster - Raycaster instance.
 * @param {THREE.Camera} options.camera - Camera used for raycasting.
 * @param {Map} options.objectHandlers - Handlers for objects in the scene.
 * @param {PointerEvent} options.event - Pointer down event.
 * @returns {THREE.Object3D|null} - Dragged object or null.
 */
function handlePointerDown({ pointer, raycaster, camera, objectHandlers, event }) {
	pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
	pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;

	raycaster.setFromCamera(pointer, camera);
	const intersects = raycaster.intersectObjects([...objectHandlers.keys()]);

	if (intersects.length > 0) {
		const object = intersects[0].object;
		const handlers = objectHandlers.get(object);

		if (handlers?.onDragStart) {
			handlers.onDragStart(object);
			return object; // Start dragging this object
		}

		if (handlers?.onClick) {
			handlers.onClick(object);
		}
	}

	return null;
}

/**
 * Handles pointer up events.
 * @param {Object} options - Options for pointer up.
 * @param {THREE.Object3D|null} options.dragging - Currently dragged object, if any.
 * @param {Map} options.objectHandlers - Handlers for objects in the scene.
 */
function handlePointerUp({ dragging, objectHandlers }) {
	if (dragging) {
		const handlers = objectHandlers.get(dragging);
		if (handlers?.onDragEnd) {
			handlers.onDragEnd(dragging);
		}
	}
}
