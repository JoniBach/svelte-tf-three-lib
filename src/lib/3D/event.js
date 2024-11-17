import * as THREE from 'three';

/**
 * Handles pointer movement and calls the appropriate hover or drag handlers.
 * @param {THREE.Vector2} pointer - Normalized pointer position.
 * @param {THREE.Raycaster} raycaster - Raycaster instance.
 * @param {THREE.Camera} camera - Camera used for raycasting.
 * @param {Map<THREE.Object3D, Object>} objectHandlers - Map of objects to their handlers.
 * @param {THREE.Object3D|null} dragging - The currently dragged object.
 * @param {PointerEvent} event - The pointer event.
 */
export function handlePointerMove(pointer, raycaster, camera, objectHandlers, dragging, event) {
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
 * Handles pointer down events (clicks) and starts dragging if applicable.
 * @param {THREE.Vector2} pointer - Normalized pointer position.
 * @param {THREE.Raycaster} raycaster - Raycaster instance.
 * @param {THREE.Camera} camera - Camera used for raycasting.
 * @param {Map<THREE.Object3D, Object>} objectHandlers - Map of objects to their handlers.
 * @param {PointerEvent} event - The pointer event.
 * @returns {THREE.Object3D|null} - The object being dragged, or null if none.
 */
export function handlePointerDown(pointer, raycaster, camera, objectHandlers, event) {
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
 * Handles pointer up events and ends dragging.
 * @param {THREE.Object3D|null} dragging - The currently dragged object.
 * @param {Map<THREE.Object3D, Object>} objectHandlers - Map of objects to their handlers.
 * @param {Object} globalHandlers - Global drag event handlers.
 */
export function handlePointerUp(dragging, objectHandlers, globalHandlers) {
	if (dragging) {
		const handlers = objectHandlers.get(dragging);
		if (handlers?.onDragEnd) {
			handlers.onDragEnd(dragging);
		}

		// Call global onDragEnd handler if defined
		if (globalHandlers?.onDragEnd) {
			globalHandlers.onDragEnd();
		}
	}
}

/**
 * EventManager class to handle object interaction and global drag events.
 */
export class EventManager {
	constructor(scene, camera, renderer) {
		this.scene = scene;
		this.camera = camera;
		this.renderer = renderer;
		this.raycaster = new THREE.Raycaster();
		this.pointer = new THREE.Vector2();
		this.objectHandlers = new Map();
		this.dragging = null;

		// Drag state
		this.dragPlane = new THREE.Plane();
		this.intersectPoint = new THREE.Vector3();

		// Global drag handlers
		this.globalHandlers = {
			onDragStart: null,
			onDragEnd: null
		};

		// Bind global event listeners
		this.renderer.domElement.addEventListener('pointermove', this.onPointerMove.bind(this));
		this.renderer.domElement.addEventListener('pointerdown', this.onPointerDown.bind(this));
		this.renderer.domElement.addEventListener('pointerup', this.onPointerUp.bind(this));
	}

	addObject(object, handlers = {}) {
		this.objectHandlers.set(object, handlers);
	}

	removeObject(object) {
		this.objectHandlers.delete(object);
	}

	/**
	 * Enable dragging for an object with optional constraints.
	 * @param {THREE.Object3D} object - The object to enable dragging for.
	 * @param {Function} [constraintCallback] - Optional function to constrain the object's position.
	 */
	enableDragging(object, constraintCallback) {
		this.addObject(object, {
			onDragStart: () => {
				// Setup drag plane based on the object's current position
				const dragPlaneNormal = new THREE.Vector3(0, 1, 0); // Horizontal plane normal
				this.dragPlane.setFromNormalAndCoplanarPoint(dragPlaneNormal, object.position);

				// Store initial offset between the ray and the object
				this.raycaster.setFromCamera(this.pointer, this.camera);
				this.raycaster.ray.intersectPlane(this.dragPlane, this.intersectPoint);
				this.dragOffset = new THREE.Vector3().subVectors(object.position, this.intersectPoint);
			},
			onDrag: () => {
				// Update the raycaster and calculate intersection with the drag plane
				this.raycaster.setFromCamera(this.pointer, this.camera);
				this.raycaster.ray.intersectPlane(this.dragPlane, this.intersectPoint);

				// Adjust the object's position by the stored offset
				this.intersectPoint.add(this.dragOffset);

				// Apply constraints if a callback is provided
				if (constraintCallback) {
					constraintCallback(this.intersectPoint);
				}

				// Update the object's position
				object.position.copy(this.intersectPoint);
			},
			onDragEnd: () => console.log(`Stopped dragging ${object.name || 'object'}`)
		});
	}

	/**
	 * Add global handlers for drag start and end events.
	 * @param {Object} handlers - Global drag handlers.
	 * @param {Function} [handlers.onDragStart] - Called when dragging starts.
	 * @param {Function} [handlers.onDragEnd] - Called when dragging ends.
	 */
	addGlobalDragHandlers(handlers) {
		if (handlers.onDragStart) this.globalHandlers.onDragStart = handlers.onDragStart;
		if (handlers.onDragEnd) this.globalHandlers.onDragEnd = handlers.onDragEnd;
	}
	onPointerMove(event) {
		this.pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
		this.pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;

		if (this.dragging) {
			const handlers = this.objectHandlers.get(this.dragging);
			if (handlers?.onDrag) {
				handlers.onDrag(event);
			}
			return;
		}

		const intersects = this.raycaster.intersectObjects([...this.objectHandlers.keys()]);
		for (const intersect of intersects) {
			const handlers = this.objectHandlers.get(intersect.object);
			if (handlers?.onHover) {
				handlers.onHover(intersect.object);
			}
		}
	}

	onPointerDown(event) {
		this.pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
		this.pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;

		this.raycaster.setFromCamera(this.pointer, this.camera);
		const intersects = this.raycaster.intersectObjects([...this.objectHandlers.keys()]);

		if (intersects.length > 0) {
			const object = intersects[0].object;
			const handlers = this.objectHandlers.get(object);

			if (handlers?.onDragStart) {
				handlers.onDragStart(object);
				this.dragging = object;

				// Call global onDragStart handler if defined
				if (this.globalHandlers?.onDragStart) {
					this.globalHandlers.onDragStart();
				}
			}
		}
	}

	onPointerUp(event) {
		if (this.dragging) {
			const handlers = this.objectHandlers.get(this.dragging);
			if (handlers?.onDragEnd) {
				handlers.onDragEnd(this.dragging);
			}

			// Call global onDragEnd handler if defined
			if (this.globalHandlers?.onDragEnd) {
				this.globalHandlers.onDragEnd();
			}
		}
		this.dragging = null; // Clear dragging state
	}
}
