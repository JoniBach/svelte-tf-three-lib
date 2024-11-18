<script>
	import { onMount } from 'svelte';
	import { createEntityRegistry, registerEntity, spawnEntity, create3DScene } from '$lib';
	import * as THREE from 'three';

	let canvas; // Canvas element
	let sceneManager; // Scene manager instance
	let registry; // Entity registry
	let balls = []; // Reactive array to track all balls
	let cubes = []; // Reactive array to track all cubes
	let draggingBall = null; // Tracks the ball currently being dragged
	let draggingCube = null; // Tracks the cube currently being dragged

	onMount(() => {
		// Initialize the 3D scene
		sceneManager = create3DScene({
			canvas,
			dimensions: { width: window.innerWidth, height: window.innerHeight },
			options: {
				backgroundColor: 0x1e1e1e,
				cameraPosition: { x: 0, y: 5, z: 15 },
				enableOrbitControls: true,
				enableWorldGuides: true,

				orbitControlsConfig: {
					enableDamping: true,
					dampingFactor: 0.05,
					maxPolarAngle: Math.PI / 2, // Limit vertical rotation
					minDistance: 5, // Min zoom distance
					maxDistance: 50 // Max zoom distance
				}
			}
		});

		// Create the entity registry and register the sphere entity
		registry = createEntityRegistry();

		// Register the ball entity as a sphere
		registerEntity({
			registry,
			type: 'ball',
			config: (params) => {
				const { radius = 0.5, color = 0xffffff, position = { x: 0, y: 0, z: 0 } } = params;

				// Create the ball
				const geometry = new THREE.SphereGeometry(radius, 32, 32);
				const material = new THREE.MeshStandardMaterial({ color });
				const ball = new THREE.Mesh(geometry, material);

				// Set its position
				ball.position.set(position.x, position.y, position.z);
				ball.userData.radius = radius; // Store radius for collision logic

				return ball;
			}
		});

		// Register the cube entity
		registerEntity({
			registry,
			type: 'cube',
			config: (params) => {
				const { size = 1, color = 0xffffff, position = { x: 0, y: 0, z: 0 } } = params;

				// Create the cube
				const geometry = new THREE.BoxGeometry(size, size, size);
				const material = new THREE.MeshStandardMaterial({ color });
				const cube = new THREE.Mesh(geometry, material);

				// Set its position
				cube.position.set(position.x, position.y, position.z);
				cube.userData.size = size; // Store size for collision logic
				cube.userData.canDrag = true; // Add flag to check if cube can be dragged

				return cube;
			}
		});
	});

	// Collision detection
	function isOverlapping(newPosition, newSize, type) {
		const objects = type === 'ball' ? balls : cubes;

		for (const object of objects) {
			let distance;
			let combinedSize;

			if (type === 'ball' && object.userData.radius) {
				distance = new THREE.Vector3().subVectors(object.position, newPosition).length();
				combinedSize = object.userData.radius + newSize;
			} else if (type === 'cube' && object.userData.size) {
				distance = new THREE.Vector3().subVectors(object.position, newPosition).length();
				combinedSize = object.userData.size + newSize;
			}

			if (distance < combinedSize) {
				return true; // Overlapping detected
			}
		}
		return false; // No overlap
	}

	// Function to add a new ball
	function addBall() {
		const radius = Math.random() * 0.5 + 0.2; // Random radius
		let position;

		// Retry until a non-overlapping position is found
		do {
			position = {
				x: (Math.random() - 0.5) * 10,
				y: 0,
				z: (Math.random() - 0.5) * 10
			};
		} while (isOverlapping(new THREE.Vector3(position.x, position.y, position.z), radius, 'ball'));

		const color = Math.random() * 0xffffff; // Random color

		const ball = spawnEntity({
			scene: sceneManager.scene,
			registry,
			type: 'ball',
			params: { radius, color, position }
		});

		sceneManager.eventManager.addObject(ball, {
			handlers: {
				onDragStart: () => {
					console.log('Ball drag started!');
					draggingBall = ball; // Track the ball being dragged
				},
				onDrag: () => console.log('Ball dragging...'),
				onDragEnd: () => {
					console.log('Ball drag ended!');
					draggingBall = null; // Clear the dragging reference
				},
				onClick: () => console.log('Ball clicked!')
			},
			collisionOptions: {
				onCollide: (other) => {
					if (draggingBall === ball) {
						// If this ball is being dragged, it should NOT grow upon collision
						console.log('Dragging ball collided, removing the ball.');

						// Remove the ball from the scene
						if (sceneManager?.scene) {
							sceneManager.scene.remove(ball);
						}

						// Remove the ball from the event manager
						sceneManager?.eventManager?.removeObject(ball);

						// Dispose of geometry and material to free memory
						if (ball.geometry) ball.geometry.dispose();
						if (ball.material) ball.material.dispose();

						// Remove the ball from the balls array
						balls = balls.filter((b) => b !== ball);

						// Log for debugging
						console.log('Ball removed successfully due to collision with cube');
						return; // Prevent other collision logic from executing
					}

					// Handle non-dragging ball collision
					console.log('Ball collision detected with cube! Removing the ball.');

					// Remove the ball from the scene
					if (sceneManager?.scene) {
						sceneManager.scene.remove(ball);
					}

					// Remove the ball from the event manager
					sceneManager?.eventManager?.removeObject(ball);

					// Dispose of geometry and material to free memory
					if (ball.geometry) ball.geometry.dispose();
					if (ball.material) ball.material.dispose();

					// Remove the ball from the balls array
					balls = balls.filter((b) => b !== ball);

					// Log for debugging
					console.log('Ball removed successfully due to collision with cube');
				}
			}
		});

		// Reassign the array with a new reference to trigger reactivity
		balls = [...balls, ball];
	}

	// Function to add a new cube
	function addCube() {
		const size = Math.random() * 2 + 0.5; // Random size for the cube
		let position;

		// Retry until a non-overlapping position is found
		do {
			position = {
				x: (Math.random() - 0.5) * 10,
				y: 0,
				z: (Math.random() - 0.5) * 10
			};
		} while (isOverlapping(new THREE.Vector3(position.x, position.y, position.z), size, 'cube'));

		const color = Math.random() * 0xffffff; // Random color

		const cube = spawnEntity({
			scene: sceneManager.scene,
			registry,
			type: 'cube',
			params: { size, color, position }
		});

		sceneManager.eventManager.addObject(cube, {
			handlers: {
				onDragStart: () => {
					if (!cube.userData.canDrag) {
						console.log('Cube is immovable! Cannot drag.');
						return; // Prevent dragging if the cube is immovable
					}

					console.log('Cube drag started!');
					draggingCube = cube; // Track the cube being dragged
				},
				onDrag: () => console.log('Cube dragging...'),
				onDragEnd: () => {
					console.log('Cube drag ended!');
					draggingCube = null; // Clear the dragging reference
				},
				onClick: () => console.log('Cube clicked!')
			},
			collisionOptions: {
				onCollide: (other) => {
					if (other.userData.radius) {
						// Ball collided with cube, delete the ball and prevent dragging the cube
						console.log('Cube collision detected with ball! Making cube immovable.');

						// Prevent the cube from being dragged after the collision
						cube.userData.canDrag = false;

						// Log for debugging
						console.log('Cube is now immovable.');
					}
				}
			}
		});

		// Reassign the array with a new reference to trigger reactivity
		cubes = [...cubes, cube];
	}

	// Function to remove a ball
	function removeBall() {
		if (balls.length > 0) {
			// Remove the last ball from the array
			const ball = balls.pop();

			// Ensure the ball is removed from the scene
			if (sceneManager?.scene) {
				sceneManager.scene.remove(ball);
			}

			// Remove the ball from the event manager, if applicable
			sceneManager?.eventManager?.removeObject(ball);

			// Dispose of geometry and material to free memory
			if (ball.geometry) ball.geometry.dispose();
			if (ball.material) ball.material.dispose();

			// Optional: Log removal for debugging
			console.log('Ball removed successfully:', ball);
		} else {
			console.warn('No balls left to remove.');
		}
	}

	// Function to remove a cube
	function removeCube() {
		if (cubes.length > 0) {
			// Remove the last cube from the array
			const cube = cubes.pop();

			// Ensure the cube is removed from the scene
			if (sceneManager?.scene) {
				sceneManager.scene.remove(cube);
			}

			// Remove the cube from the event manager, if applicable
			sceneManager?.eventManager?.removeObject(cube);

			// Dispose of geometry and material to free memory
			if (cube.geometry) cube.geometry.dispose();
			if (cube.material) cube.material.dispose();

			// Optional: Log removal for debugging
			console.log('Cube removed successfully:', cube);
		} else {
			console.warn('No cubes left to remove.');
		}
	}
</script>

<canvas bind:this={canvas}></canvas>

<!-- Controls for interacting with the scene -->
<div class="controls">
	<button on:click={addBall}>Add Ball</button>
	<button on:click={removeBall} disabled={balls.length === 0}>Remove Ball</button>
	<button on:click={addCube}>Add Cube</button>
	<button on:click={removeCube} disabled={cubes.length === 0}>Remove Cube</button>
</div>

<style>
	:global(body) {
		margin: 0;
		overflow: hidden;
		box-sizing: border-box;
	}

	canvas {
		width: 100vw;
		height: 100vh;
		display: block;
	}

	.controls {
		position: absolute;
		top: 10px;
		left: 10px;
		z-index: 10; /* Ensure the controls are above the canvas */
		display: flex;
		gap: 10px;
	}

	button {
		background-color: #333;
		color: white;
		border: none;
		padding: 10px 20px;
		font-size: 1rem;
		cursor: pointer;
		border-radius: 5px;
		transition: background-color 0.2s ease;
	}

	button:hover {
		background-color: #555;
	}

	button:disabled {
		background-color: #aaa;
		cursor: not-allowed;
	}
</style>
