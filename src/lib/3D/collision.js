import * as THREE from 'three';

export class CollisionManager {
	constructor() {
		this.objects = new Set(); // Objects to check for collisions
		this.collisionHandlers = new Map(); // Custom handlers for specific objects
	}

	/**
	 * Add an object to the collision system.
	 * @param {THREE.Object3D} object - The object to track.
	 * @param {Object} options - Collision options.
	 * @param {Function} [options.onCollide] - Custom collision handler for the object.
	 */
	addObject(object, options = {}) {
		this.objects.add(object);

		if (options.onCollide) {
			this.collisionHandlers.set(object, options.onCollide);
		}
	}

	/**
	 * Remove an object from the collision system.
	 * @param {THREE.Object3D} object - The object to remove.
	 */
	removeObject(object) {
		this.objects.delete(object);
		this.collisionHandlers.delete(object);
	}

	/**
	 * Detect collisions and handle responses.
	 */
	checkCollisions() {
		const objectsArray = Array.from(this.objects);

		for (let i = 0; i < objectsArray.length; i++) {
			for (let j = i + 1; j < objectsArray.length; j++) {
				const objA = objectsArray[i];
				const objB = objectsArray[j];

				if (this.isColliding(objA, objB)) {
					this.handleCollision(objA, objB);
				}
			}
		}
	}

	/**
	 * Check if two objects are colliding using bounding boxes.
	 * @param {THREE.Object3D} objA - The first object.
	 * @param {THREE.Object3D} objB - The second object.
	 * @returns {boolean} - True if the objects are colliding.
	 */
	isColliding(objA, objB) {
		const boxA = new THREE.Box3().setFromObject(objA);
		const boxB = new THREE.Box3().setFromObject(objB);

		return boxA.intersectsBox(boxB);
	}

	/**
	 * Check if a new object would overlap with existing objects in the system.
	 * @param {THREE.Object3D} newObject - The object to check for overlap.
	 * @returns {boolean} - True if the new object overlaps with any existing objects.
	 */
	isOverlapping(newObject) {
		const newBox = new THREE.Box3().setFromObject(newObject);

		for (const existingObject of this.objects) {
			const existingBox = new THREE.Box3().setFromObject(existingObject);
			if (newBox.intersectsBox(existingBox)) {
				return true;
			}
		}
		return false;
	}

	/**
	 * Handle collision between two objects.
	 * @param {THREE.Object3D} objA - The first object.
	 * @param {THREE.Object3D} objB - The second object.
	 */
	handleCollision(objA, objB) {
		const handlerA = this.collisionHandlers.get(objA);
		const handlerB = this.collisionHandlers.get(objB);

		// If custom handlers are defined, invoke them
		if (handlerA) handlerA(objA, objB);
		if (handlerB) handlerB(objB, objA);
	}
}

/**
 * Built-in collision handlers for common responses.
 */
export const CollisionHandlers = {
	/**
	 * Pass-through: Do nothing on collision.
	 */
	passThrough: () => {},

	/**
	 * Disappear: Remove both objects on collision.
	 * @param {THREE.Object3D} objA - The first object.
	 * @param {THREE.Object3D} objB - The second object.
	 */
	disappear: (objA, objB) => {
		objA.parent?.remove(objA);
		objB.parent?.remove(objB);
	},

	/**
	 * Solid: Prevent overlapping by pushing the objects apart.
	 * @param {THREE.Object3D} objA - The first object.
	 * @param {THREE.Object3D} objB - The second object.
	 */
	solid: (objA, objB) => {
		const boxA = new THREE.Box3().setFromObject(objA);
		const boxB = new THREE.Box3().setFromObject(objB);

		const direction = new THREE.Vector3().subVectors(
			boxB.getCenter(new THREE.Vector3()),
			boxA.getCenter(new THREE.Vector3())
		);
		direction.normalize();

		// Push objB slightly away from objA
		objB.position.addScaledVector(direction, 0.1);
	},

	/**
	 * Bounce: Simulate a simple bounce by reversing positions slightly.
	 * @param {THREE.Object3D} objA - The first object.
	 * @param {THREE.Object3D} objB - The second object.
	 */
	bounce: (objA, objB) => {
		const direction = new THREE.Vector3().subVectors(objB.position, objA.position);
		direction.normalize();

		// Reverse positions slightly
		objA.position.addScaledVector(direction, -0.1);
		objB.position.addScaledVector(direction, 0.1);
	}
};
