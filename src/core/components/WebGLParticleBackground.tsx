import { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

const ParticleSystem = ({ color = ['#e8b34b', '#d4af37', '#fcd34d'], intensity = 1, size = 1 }: { color: string | string[], intensity: number, size: number }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  
  // Memoize isMobile check specifically for rendering constraints
  const isMobile = useMemo(() => typeof window !== 'undefined' ? window.innerWidth < 768 : false, []);
  
  // Cut count drastically for mobile
  const count = Math.floor((isMobile ? 20 : 80) * intensity);
  
  // Normalize color to array
  const colorsArray = useMemo(() => Array.isArray(color) ? color : [color], [color]);
  
  // Memoize initial positions, phases, and speeds
  const particles = useMemo(() => {
    const temp = [];
    for (let i = 0; i < count; i++) {
      temp.push({
        xOffset: (Math.random() - 0.5) * 20,
        yStart: (Math.random() - 0.5) * 20,
        zOffset: (Math.random() - 0.5) * 10,
        speed: (Math.random() * 0.3 + 0.1) * intensity,
        phase: Math.random() * Math.PI * 2,
        scale: (Math.random() * 0.08 + 0.03) * size, // reduced bubble size slightly
        wobbleSpeed: Math.random() * 0.5 + 0.5,
        colorIndex: Math.floor(Math.random() * colorsArray.length),
      });
    }
    return temp;
  }, [count, intensity, size, colorsArray]);

  const dummy = useMemo(() => new THREE.Object3D(), []);
  
  // Set initial colors
  useEffect(() => {
    if (!meshRef.current) return;
    const tempColor = new THREE.Color();
    for (let i = 0; i < count; i++) {
      tempColor.set(colorsArray[particles[i].colorIndex]);
      meshRef.current.setColorAt(i, tempColor);
    }
    meshRef.current.instanceColor!.needsUpdate = true;
  }, [particles, colorsArray, count]);

  useFrame((state) => {
    if (!meshRef.current) return;
    
    // Animate each particle instance
    particles.forEach((p, i) => {
      // Floating upwards gently
      const time = state.clock.getElapsedTime();
      
      // Calculate continuous upward motion wrapping around
      let y = p.yStart + (time * p.speed);
      // Wrap from top to bottom (-10 to 10 range approximately)
      y = ((y + 10) % 20) - 10;
      
      // Gentle side-to-side wobble
      const wobble = Math.sin(time * p.wobbleSpeed + p.phase) * 0.5;
      
      dummy.position.set(
        p.xOffset + wobble,
        y,
        p.zOffset
      );
      
      // Pulsing scale for a slight bubble pop/breathe effect
      const currentScale = p.scale * (1 + Math.sin(time * 2 + p.phase) * 0.1);
      dummy.scale.set(currentScale, currentScale, currentScale);
      
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });
    
    meshRef.current!.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <circleGeometry args={[1, isMobile ? 12 : 32]} />
      <meshBasicMaterial 
        color="#ffffff"
        transparent 
        opacity={isMobile ? 0.2 : 0.3} 
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </instancedMesh>
  );
};

const CameraSetup = () => {
  const { camera } = useThree();
  camera.position.z = 10;
  return null;
};

// Main WebGL Background component wrapped nicely
export default function WebGLParticleBackground({ 
  color = ['#e8b34b', '#d4af37'], // Default to purely golden theme
  intensity = 1,
  size = 0.8  // Reduced size from 1.0 to 0.8
}: { 
  color?: string | string[]; 
  intensity?: number;
  size?: number;
}) {
  const isMobile = typeof window !== 'undefined' ? window.innerWidth < 768 : false;
  
  // Do not render anything on super low-end or if explicitly wanting absolutely zero lag.
  // We'll keep a very lightweight version running instead of completely off, for aesthetics.
  
  return (
    <div className="absolute inset-0 pointer-events-none z-0">
      <Canvas 
        gl={{ alpha: true, antialias: false, powerPreference: 'high-performance' }} 
        dpr={isMobile ? [0.5, 1] : [1, 1.5]} // Optimize for mobile (cut pixel ratio down)
        camera={{ position: [0, 0, 10], fov: 50 }}
      >
        <CameraSetup />
        <ParticleSystem color={color} intensity={intensity} size={size} />
      </Canvas>
    </div>
  );
}
