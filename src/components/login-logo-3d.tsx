"use client";

import { useEffect, useRef } from "react";

import type { JSX } from "react";

const MODEL_URL = "/models/appboard-logo-3d.glb";
const MAX_PIXEL_RATIO = 1.5;
const ROTATION_SPEED = 0.3;

export function LoginLogo3d(): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let disposed = false;
    let cleanup: (() => void) | undefined;

    async function init(): Promise<void> {
      const [{ GLTFLoader }, THREE] = await Promise.all([
        import("three/examples/jsm/loaders/GLTFLoader.js"),
        import("three"),
      ]);
      if (disposed || !container) return;

      const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO));
      renderer.setClearColor(0x000000, 0);
      container.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 1000);
      camera.position.set(0, 0, 260);

      const rim = new THREE.DirectionalLight(0x8f91ff, 6);
      rim.position.set(-160, 180, 90);
      scene.add(rim);
      const key = new THREE.DirectionalLight(0x22d3ee, 1.4);
      key.position.set(80, 20, 280);
      scene.add(key);
      scene.add(new THREE.AmbientLight(0x1c2030, 2));

      const material = new THREE.MeshStandardMaterial({
        color: 0x171a28,
        metalness: 0.7,
        roughness: 0.32,
      });

      const group = new THREE.Group();
      scene.add(group);

      new GLTFLoader().load(MODEL_URL, (gltf) => {
        gltf.scene.traverse((obj) => {
          if (obj instanceof THREE.Mesh) obj.material = material;
        });
        group.add(gltf.scene);
      });

      const resize = (): void => {
        const { clientHeight, clientWidth } = container;
        renderer.setSize(clientWidth, clientHeight);
        camera.aspect = clientWidth / clientHeight;
        camera.updateProjectionMatrix();
      };
      resize();
      window.addEventListener("resize", resize);

      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const clock = new THREE.Clock();
      group.rotation.y = -0.9;

      let frame = 0;
      const renderLoop = (): void => {
        const delta = clock.getDelta();
        if (!reducedMotion) group.rotation.y += delta * ROTATION_SPEED;
        renderer.render(scene, camera);
        if (!reducedMotion) frame = requestAnimationFrame(renderLoop);
      };
      if (reducedMotion) {
        group.rotation.y = 0.35;
        setTimeout(renderLoop, 300);
      } else {
        frame = requestAnimationFrame(renderLoop);
      }

      cleanup = () => {
        cancelAnimationFrame(frame);
        window.removeEventListener("resize", resize);
        renderer.dispose();
        renderer.domElement.remove();
      };
    }

    void init();

    return () => {
      disposed = true;
      cleanup?.();
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 opacity-60"
      ref={containerRef}
    />
  );
}
