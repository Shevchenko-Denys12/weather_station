import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { Environment, Grid, Lightformer } from '@react-three/drei'
import { useBoardStore } from '../store/useBoardStore'
import { GROUND_Y } from '../data/layout'
import NucleoBoard from './board/NucleoBoard'
import CameraRig from './camera/CameraRig'
import WeatherStation from './circuit/WeatherStation'

/**
 * 3D viewport: lights, shadows, environment, the board and camera controls.
 * (Named ArduinoScene because the Nucleo-64 exposes Arduino Uno V3 headers.)
 */
export default function ArduinoScene() {
  const clearSelection = useBoardStore((s) => s.clearSelection)

  return (
    <Canvas
      shadows="percentage"
      dpr={[1, 2]}
      camera={{ position: [9.5, 15.5, 14.5], fov: 35, near: 0.1, far: 100 }}
      onPointerMissed={clearSelection}
    >
      <color attach="background" args={['#070b14']} />
      <fog attach="fog" args={['#070b14', 22, 45]} />

      <ambientLight intensity={0.35} />
      <directionalLight
        position={[6, 12, 5]}
        intensity={2.2}
        castShadow
        shadow-mapSize={[4096, 4096]}
        shadow-bias={-0.0004}
        shadow-camera-left={-12}
        shadow-camera-right={14}
        shadow-camera-top={12}
        shadow-camera-bottom={-12}
      />
      <directionalLight position={[-6, 4, -4]} intensity={0.4} color="#8ab4ff" />

      {/* Offline studio environment (no HDR download) for metallic reflections */}
      <Environment resolution={256}>
        <Lightformer intensity={2} position={[0, 6, 0]} rotation-x={Math.PI / 2} scale={[10, 10, 1]} />
        <Lightformer intensity={1} position={[-6, 2, 2]} rotation-y={Math.PI / 2} scale={[8, 3, 1]} color="#9cc3ff" />
        <Lightformer intensity={1} position={[6, 2, -2]} rotation-y={-Math.PI / 2} scale={[8, 3, 1]} />
      </Environment>

      <Suspense fallback={null}>
        <NucleoBoard />
        <WeatherStation />
      </Suspense>

      {/* shadow catcher + technical grid */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, GROUND_Y, 0]} receiveShadow>
        <planeGeometry args={[60, 60]} />
        <shadowMaterial opacity={0.45} />
      </mesh>
      <Grid
        position={[0, GROUND_Y + 0.001, 0]}
        infiniteGrid
        cellSize={0.254}
        sectionSize={2.54}
        cellColor="#121b2e"
        sectionColor="#1f2c4a"
        fadeDistance={30}
        fadeStrength={1.5}
      />

      <CameraRig />
    </Canvas>
  )
}
