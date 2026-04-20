import { useEffect, useRef } from "react";
import * as THREE from "three";

export default function ThreeCanvas() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mountRef.current) return;

    // SCENE SETTINGS
    const scene = new THREE.Scene();
    scene.background = null; // Transparent background to show CSS gradient

    // CAMERA
    const camera = new THREE.PerspectiveCamera(60, mountRef.current.clientWidth / mountRef.current.clientHeight, 0.1, 1000);
    camera.position.z = 15;

    // RENDERER
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    mountRef.current.appendChild(renderer.domElement);

    // LIGHTING
    const ambientLight = new THREE.AmbientLight(0xFF8C42, 0.6);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0xFFFFFF, 1.2, 50);
    pointLight.position.set(5, 5, 5);
    scene.add(pointLight);

    const directionalLight = new THREE.DirectionalLight(0xFFFFFF, 0.5);
    directionalLight.position.set(-5, 10, 5);
    scene.add(directionalLight);

    // GEOMETRIES & MATERIALS
    const nodesGroup = new THREE.Group();
    scene.add(nodesGroup);

    const nodeGeo = new THREE.IcosahedronGeometry(0.5, 0);
    const nodeMat = new THREE.MeshStandardMaterial({
      color: 0xFF8C42,
      emissive: 0xF26522,
      emissiveIntensity: 0.5,
      roughness: 0.2,
      metalness: 0.8
    });

    const positions: THREE.Vector3[] = [];
    const numNodes = 12;

    for (let i = 0; i < numNodes; i++) {
      const mesh = new THREE.Mesh(nodeGeo, nodeMat);
      // Random coordinates spreading over a wider area
      mesh.position.set(
        (Math.random() - 0.5) * 20,
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 5
      );
      mesh.userData = { 
        baseEmissive: 0.5, 
        hoverEmissive: 1.5,
        rotationSpeedX: (Math.random() - 0.5) * 0.02,
        rotationSpeedY: (Math.random() - 0.5) * 0.02
      };
      positions.push(mesh.position);
      nodesGroup.add(mesh);
    }

    // LINES (Network)
    const lineMat = new THREE.LineBasicMaterial({ color: 0xFDE9D0, transparent: true, opacity: 0.4 });
    const lineGeo = new THREE.BufferGeometry();
    const linePositions: number[] = [];
    
    // Connect logic: simple proximity connection
    for (let i = 0; i < positions.length; i++) {
      for (let j = i + 1; j < positions.length; j++) {
        if (positions[i].distanceTo(positions[j]) < 10) {
          linePositions.push(
            positions[i].x, positions[i].y, positions[i].z,
            positions[j].x, positions[j].y, positions[j].z
          );
        }
      }
    }
    lineGeo.setAttribute("position", new THREE.Float32BufferAttribute(linePositions, 3));
    const lines = new THREE.LineSegments(lineGeo, lineMat);
    nodesGroup.add(lines);

    // PARTICLES (Drifting)
    const particleGeo = new THREE.BufferGeometry();
    const particleCount = 300;
    const posArray = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount * 3; i++) {
        posArray[i] = (Math.random() - 0.5) * 40;
    }
    particleGeo.setAttribute("position", new THREE.BufferAttribute(posArray, 3));
    const particleMat = new THREE.PointsMaterial({
        size: 0.1,
        color: 0xFEF3E2,
        transparent: true,
        opacity: 0.8
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);

    // INTERACTION / PARALLAX
    let mouseX = 0;
    let mouseY = 0;
    
    const onMouseMove = (event: MouseEvent) => {
      // Normalize mouse to -1 to +1 range
      const windowHalfX = window.innerWidth / 2;
      const windowHalfY = window.innerHeight / 2;
      mouseX = (event.clientX - windowHalfX) * 0.001;
      mouseY = (event.clientY - windowHalfY) * 0.001;
    };
    window.addEventListener('mousemove', onMouseMove);

    // RAYCASTER FOR HOVER
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let hoveredNode: THREE.Mesh | null = null;

    const onPointerMove = (event: MouseEvent) => {
        if (!mountRef.current) return;
        const rect = mountRef.current.getBoundingClientRect();
        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    };
    window.addEventListener('pointermove', onPointerMove);

    // ANIMATION LOOP
    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      // Rotate nodes individually
      nodesGroup.children.forEach(child => {
          if (child instanceof THREE.Mesh) {
              child.rotation.x += child.userData.rotationSpeedX;
              child.rotation.y += child.userData.rotationSpeedY;
          }
      });

      // Parallax effect
      camera.position.x += (mouseX * 5 - camera.position.x) * 0.05;
      camera.position.y += (-mouseY * 5 - camera.position.y) * 0.05;
      camera.lookAt(scene.position);

      // Particles drifting upwards
      particles.rotation.y += 0.001;
      particles.rotation.x += 0.0005;

      // Raycaster logic for pulsing emissive brightness
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(nodesGroup.children.filter(c => c instanceof THREE.Mesh));
      
      if (intersects.length > 0) {
          const hovered = intersects[0].object as THREE.Mesh;
          if (hoveredNode !== hovered) {
              if (hoveredNode) (hoveredNode.material as THREE.MeshStandardMaterial).emissiveIntensity = hoveredNode.userData.baseEmissive;
              hoveredNode = hovered;
              (hoveredNode.material as THREE.MeshStandardMaterial).emissiveIntensity = hoveredNode.userData.hoverEmissive;
          }
      } else {
          if (hoveredNode) {
              (hoveredNode.material as THREE.MeshStandardMaterial).emissiveIntensity = hoveredNode.userData.baseEmissive;
              hoveredNode = null;
          }
      }

      renderer.render(scene, camera);
    };
    animate();

    // RESIZE LISTENER
    const onWindowResize = () => {
      if (!mountRef.current) return;
      camera.aspect = mountRef.current.clientWidth / mountRef.current.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    };
    window.addEventListener('resize', onWindowResize);

    // CLEANUP
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('resize', onWindowResize);
      window.removeEventListener('pointermove', onPointerMove);
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
      scene.clear();
    };
  }, []);

  return (
    <div style={{ position: "relative", width: "100%", height: 360, background: "linear-gradient(135deg, #1A1A2E 0%, #F26522 100%)", borderRadius: "0 0 24px 24px", overflow: "hidden" }}>
      <div ref={mountRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", pointerEvents: "none", zIndex: 10 }}>
        <h1 style={{ color: "#FFFFFF", fontSize: "36px", fontWeight: 800, marginBottom: "8px", textShadow: "0 4px 12px rgba(0,0,0,0.3)" }}>Your Professional Network</h1>
        <p style={{ color: "#FF8C42", fontSize: "16px", fontWeight: 500 }}>34 connections · 12 profile views this week</p>
      </div>
    </div>
  );
}
