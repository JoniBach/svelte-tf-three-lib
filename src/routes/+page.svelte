<script>
	import { onMount } from 'svelte';
	import { createEntityRegistry, registerEntity, spawnEntity, create3DScene } from '$lib';
	import * as THREE from 'three';

	let canvas; // Canvas element
	let sceneManager; // Scene manager instance
	let registry; // Entity registry
	let balls = []; // Reactive array to track all balls
	let draggingBall = null; // Tracks the ball currently being dragged

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
	});

	function isOverlapping(newPosition, newRadius) {
		for (const ball of balls) {
			const distance = new THREE.Vector3().subVectors(ball.position, newPosition).length();
			const combinedRadius = ball.userData.radius + newRadius;
			if (distance < combinedRadius) {
				return true; // Overlapping detected
			}
		}
		return false; // No overlap
	}

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
		} while (isOverlapping(new THREE.Vector3(position.x, position.y, position.z), radius));

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
					console.log('Drag started!');
					draggingBall = ball; // Track the ball being dragged
				},
				onDrag: () => console.log('Dragging...'),
				onDragEnd: () => {
					console.log('Drag ended!');
					draggingBall = null; // Clear the dragging reference
				},
				onClick: () => console.log('Ball clicked!')
			},
			collisionOptions: {
				onCollide: (other) => {
					// Ignore collision if this ball is being dragged
					if (draggingBall === ball) return;

					console.log('Collision detected! Removing collided object.');

					// Ensure the other object is removed from the scene
					if (sceneManager?.scene) {
						sceneManager.scene.remove(other);
					}

					// Remove the other object from the event manager
					sceneManager?.eventManager?.removeObject(other);

					// Dispose of geometry and material to free memory
					if (other.geometry) other.geometry.dispose();
					if (other.material) other.material.dispose();

					// Remove the other object from the balls array
					balls = balls.filter((b) => b !== other);

					// Log for debugging
					console.log('Collided object removed:', other);
				}
			},
			constraintCallback: (newPosition) => {
				newPosition.y = 0; // Restrict movement to horizontal plane
			}
		});

		// Reassign the array with a new reference to trigger reactivity
		balls = [...balls, ball];
	}

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
</script>

<canvas bind:this={canvas}></canvas>

<!-- Controls for interacting with the scene -->
<div class="controls">
	<button on:click={addBall}>Add Ball</button>
	<button on:click={removeBall} disabled={balls.length === 0}>Remove Ball</button>
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
