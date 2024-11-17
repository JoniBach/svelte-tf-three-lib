import * as THREE from 'three';

/**
 * Creates a new entity registry.
 * @returns {Map<string, Function|Object>} - A new registry for managing entities.
 */
export function createEntityRegistry() {
	return new Map();
}

/**
 * Registers a new entity type in the registry.
 * @param {Object} options - Registration options.
 * @param {Map} options.registry - The registry to add the entity to.
 * @param {string} options.type - The unique identifier for the entity type.
 * @param {Function|Object} options.config - Configuration object or factory function for the entity.
 */
export function registerEntity({ registry, type, config }) {
	if (registry.has(type)) {
		throw new Error(`Entity type "${type}" is already registered.`);
	}
	registry.set(type, config);
}

/**
 * Gets an entity configuration by type from the registry.
 * @param {Object} options - Configuration retrieval options.
 * @param {Map} options.registry - The registry containing entity configurations.
 * @param {string} options.type - The entity type.
 * @returns {Function|Object} - The configuration or factory function for the entity.
 */
export function getEntityConfig({ registry, type }) {
	if (!registry.has(type)) {
		throw new Error(`Entity type "${type}" is not registered.`);
	}
	return registry.get(type);
}

/**
 * Lists all registered entity types.
 * @param {Object} options - List options.
 * @param {Map} options.registry - The registry to list entities from.
 * @returns {string[]} - Array of registered entity types.
 */
export function listRegisteredEntities({ registry }) {
	return Array.from(registry.keys());
}

/**
 * Creates an entity from the registry.
 * @param {Object} options - Entity creation options.
 * @param {Map} options.registry - The registry containing entity configurations.
 * @param {string} options.type - The entity type to create.
 * @param {Object} [options.params={}] - Optional parameters to override the default configuration.
 * @returns {THREE.Object3D} - The created entity.
 */
export function createEntity({ registry, type, params = {} }) {
	const config = getEntityConfig({ registry, type });

	if (typeof config === 'function') {
		return config(params);
	}

	// Use default configuration if config is an object
	return createFromConfig({ config, params });
}

/**
 * Creates an entity based on a configuration object.
 * @param {Object} options - Configuration creation options.
 * @param {Object} options.config - The configuration object.
 * @param {Object} options.params - Optional parameters to override the configuration.
 * @returns {THREE.Object3D} - The created entity.
 */
function createFromConfig({ config, params }) {
	const mergedConfig = { ...config, ...params };

	const { type, geometry, material, position = { x: 0, y: 0, z: 0 }, scale = 1 } = mergedConfig;

	let mesh;

	switch (type) {
		case 'sphere':
			mesh = new THREE.Mesh(
				new THREE.SphereGeometry(geometry.radius, geometry.widthSegments, geometry.heightSegments),
				new THREE.MeshStandardMaterial(material)
			);
			break;

		case 'box':
			mesh = new THREE.Mesh(
				new THREE.BoxGeometry(geometry.width, geometry.height, geometry.depth),
				new THREE.MeshStandardMaterial(material)
			);
			break;

		// Add more default types as needed
		default:
			throw new Error(`Unknown geometry type "${type}"`);
	}

	mesh.position.set(position.x, position.y, position.z);
	mesh.scale.set(scale, scale, scale);

	return mesh;
}

/**
 * Spawns an entity and adds it to the scene.
 * @param {Object} options - Spawn options.
 * @param {THREE.Scene} options.scene - The Three.js scene to add the entity to.
 * @param {Map} options.registry - The registry containing entity configurations.
 * @param {string} options.type - The entity type to spawn.
 * @param {Object} [options.params={}] - Optional parameters to override the default configuration.
 * @returns {THREE.Object3D} - The created entity.
 */
export function spawnEntity({ scene, registry, type, params = {} }) {
	const entity = createEntity({ registry, type, params });
	scene.add(entity);
	return entity;
}

/**
 * Spawns a group of entities and adds them to the scene.
 * @param {Object} options - Group spawn options.
 * @param {THREE.Scene} options.scene - The Three.js scene to add the entities to.
 * @param {Map} options.registry - The registry containing entity configurations.
 * @param {Object[]} options.entities - Array of entity definitions to spawn.
 */
export function spawnGroup({ scene, registry, entities }) {
	entities.forEach(({ type, params }) => {
		spawnEntity({ scene, registry, type, params });
	});
}
