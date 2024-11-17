<script>
	import { onMount } from 'svelte';
	import { create3DScene } from '$lib';
	import * as THREE from 'three';

	let canvas;
	let sceneManager;
	let cube; // Reference to the cube
	let cubeUpdateFunction; // Reference to the cube's update function

	onMount(() => {
		sceneManager = create3DScene({
			canvas,
			dimensions: { width: window.innerWidth, height: window.innerHeight },
			options: { backgroundColor: 0x1e1e1e, cameraPosition: { x: 0, y: 5, z: 15 } }
		});

		// Create a rotating cube
		const geometry = new THREE.BoxGeometry();
		const material = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
		cube = new THREE.Mesh(geometry, material);
		sceneManager.addObject(cube);

		// Define and register the cube's update function
		cubeUpdateFunction = () => {
			cube.rotation.x += 0.01;
			cube.rotation.y += 0.01;
		};
		sceneManager.addUpdate(cubeUpdateFunction);
	});

	/**
	 * Adds a ball (sphere) to the scene with random properties.
	 */
	function addBall() {
		const radius = Math.random() * 0.5 + 0.2; // Random radius between 0.2 and 0.7
		const color = Math.random() * 0xffffff; // Random color
		const geometry = new THREE.SphereGeometry(radius, 32, 32);
		const material = new THREE.MeshStandardMaterial({ color });
		const ball = new THREE.Mesh(geometry, material);

		// Random position within a range
		ball.position.set(
			(Math.random() - 0.5) * 10, // X position
			Math.random() * 5, // Y position
			(Math.random() - 0.5) * 10 // Z position
		);

		sceneManager.addObject(ball);
	}

	/**
	 * Removes the cube and its associated update function.
	 */
	function removeCube() {
		if (cube) {
			sceneManager.removeObject(cube); // Remove cube from the scene
			sceneManager.removeUpdate(cubeUpdateFunction); // Remove the cube's update function
			cube = null; // Dereference the cube
			cubeUpdateFunction = null; // Dereference the update function
		}
	}
</script>

<canvas bind:this={canvas}></canvas>

<div class="controls">
	<button on:click={addBall}>Add Ball</button>
	<button on:click={removeCube} disabled={!cube}>Remove Cube</button>
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
		z-index: 100;
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
