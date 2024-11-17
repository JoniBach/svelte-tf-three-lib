<script>
	import { onMount } from 'svelte';
	import { create3DScene } from '$lib';
	import * as THREE from 'three';

	let canvas = null;
	let sceneManager = null;
	let dimensions = null;
	const options = {
		backgroundColor: 0x1e1e1e,
		cameraPosition: { x: 0, y: 5, z: 15 }
	};

	onMount(async () => {
		dimensions = {
			width: canvas.clientWidth,
			height: canvas.clientHeight
		};
		sceneManager = await create3DScene({
			canvas,
			dimensions,
			options
		});

		// Example: Add a rotating cube
		const geometry = new THREE.BoxGeometry();
		const material = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
		const cube = new THREE.Mesh(geometry, material);

		sceneManager.addObject(cube);

		// Animation loop
		function animate() {
			cube.rotation.x += 0.01;
			cube.rotation.y += 0.01;
			sceneManager.render(); // Render the scene
			requestAnimationFrame(animate);
		}

		animate();
	});
</script>

<canvas bind:this={canvas}></canvas>

<style>
	:global(body) {
		margin: 0;
		overflow: hidden;
		box-sizing: border-box;
	}
	canvas {
		width: 100vw;
		height: 100vh;
	}
</style>
