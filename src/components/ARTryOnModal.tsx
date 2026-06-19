import React, { useEffect, useRef, useState, useMemo } from 'react';
import { HandLandmarker, FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import { X, Camera } from 'lucide-react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, Text3D, Center } from '@react-three/drei';
import { METALS, STONES, FONTS } from '../constants';
import { CustomGLBRingModel } from './RingModels';

interface ARTryOnModalProps {
  isOpen: boolean;
  onClose: () => void;
  metal: 'silver' | 'gold' | 'rose';
  metalName: string;
  stone?: 'aquamarine' | 'diamond' | 'ruby' | 'emerald' | 'sapphire';
  modelType: 'ring' | 'pendant';
  ringStyle?: string;
  fileUrl?: string;
  customText?: string;
  fontStyle?: keyof typeof FONTS;
}

function ARRing({ transformRef, ringStyle, metal, stone, text, fontStyle, fileUrl }: { transformRef: any, ringStyle?: string, metal: string, stone?: string, text?: string, fontStyle?: string, fileUrl?: string }) {
  const meshRef = useRef<THREE.Group>(null);
  const { viewport } = useThree();

  const metalMaterial = METALS[metal as keyof typeof METALS] || METALS.silver;
  const stoneMaterial = stone ? STONES[stone as keyof typeof STONES] : STONES.diamond;
  const fontUrl = FONTS[fontStyle as keyof typeof FONTS]?.url || FONTS.helvetiker.url;

  const targetScale = useRef(0);
  const currentScale = useRef(0);
  const targetPos = useRef(new THREE.Vector3());
  const targetDir = useRef(new THREE.Vector3(0, 1, 0));

  useFrame((state, delta) => {
    if (!meshRef.current) return;
    const { nx, ny, nw, dirX, dirY, dirZ, visible } = transformRef.current;
    
    if (!visible || !nw) {
      meshRef.current.visible = false;
      return;
    }
    
    meshRef.current.visible = true;

    // Compute target position and scale
    targetPos.current.set(
      (nx - 0.5) * viewport.width,
      -(ny - 0.5) * viewport.height,
      0
    );

    // Adjust ring scale to better fit finger width (nw is roughly base to knuckle distance)
    targetScale.current = (nw * viewport.width) * 0.18;

    // Direction vector of the finger on screen
    // Note: Mediapipe Y is down. R3F Y is up. So we invert Y.
    // Mediapipe Z is down (negative is closer). R3F Z is up. So we use -dirZ.
    // Multiplied dirZ by 2 to emphasize depth since mediapipe z is sometimes subtle
    targetDir.current.set(dirX, -dirY, -dirZ * 2).normalize();

    // Smooth interpolation to prevent jitter and 'overwhelmed' feeling
    const smoothFactor = Math.min(15 * delta, 1); 

    // Handle initial snapping 
    if (!meshRef.current.userData.initialized) {
      meshRef.current.userData.initialized = true;
      meshRef.current.userData.currentDir = new THREE.Vector3().copy(targetDir.current);
      meshRef.current.position.copy(targetPos.current);
      currentScale.current = targetScale.current;
      meshRef.current.scale.setScalar(currentScale.current);
    }

    // Lerp position
    meshRef.current.position.lerp(targetPos.current, smoothFactor);
    
    // Lerp scale
    currentScale.current = THREE.MathUtils.lerp(currentScale.current, targetScale.current, smoothFactor);
    meshRef.current.scale.setScalar(currentScale.current);

    // Lerp direction for rotation
    const currentDir = meshRef.current.userData.currentDir as THREE.Vector3;
    currentDir.lerp(targetDir.current, smoothFactor).normalize();

    // We want the ring's hole (-Z axis) to point along the finger (currentDir), 
    // and the top of the ring (+Y axis, where the stone is) to point towards the camera (+Z).
    meshRef.current.up.set(0, 0, 1);
    const lookTarget = meshRef.current.position.clone().add(currentDir);
    meshRef.current.lookAt(lookTarget);
  });

  return (
    <group ref={meshRef}>
      {/* Invisible Finger Occluder */}
      <mesh rotation={[Math.PI / 2, 0, 0]} renderOrder={-1}>
        {/* Slightly smaller than inner torus radius (1 - 0.12 = 0.88) */}
        <cylinderGeometry args={[0.85, 0.85, 5, 32]} />
        <meshBasicMaterial colorWrite={false} depthWrite={true} />
      </mesh>

      <CustomGLBRingModel 
        noSpin={true}
        text={text}
        metalMaterial={metalMaterial}
        stoneMaterial={stoneMaterial}
        fontStyle={fontStyle}
        fileUrl={fileUrl}
      />
    </group>
  );
}

function ARPendant({ transformRef, metal, customText, fontStyle }: { transformRef: any, metal: string, customText?: string, fontStyle?: string }) {
  const meshRef = useRef<THREE.Group>(null);
  const textGroupRef = useRef<THREE.Group>(null);
  const { viewport } = useThree();

  const text = customText || 'PD';
  const metalMaterial = METALS[metal as keyof typeof METALS] || METALS.silver;
  const fontUrl = FONTS[fontStyle as keyof typeof FONTS]?.url || FONTS.helvetiker.url;

  const [cachedWidth, setCachedWidth] = useState(text.length * 0.26);

  useFrame(() => {
    if (!meshRef.current) return;
    const { nx, ny, nw, rotation, visible } = transformRef.current;
    
    meshRef.current.visible = visible;
    if (!visible) return;

    meshRef.current.position.x = (nx - 0.5) * viewport.width;
    // Offset slightly down from the chin to sit on the chest.
    // Origin of this group will be where the pendant hangs.
    meshRef.current.position.y = -(ny - 0.5) * viewport.height - (nw * viewport.width * 0.8);

    // Group scale: 1 unit = face width
    meshRef.current.scale.setScalar(nw * viewport.width);

    meshRef.current.rotation.z = rotation;
  });

  return (
    <group ref={meshRef}>
      {/* Chain */}
      {/* Torus center is higher, so the 'U' shape bottoms out at y=0 */}
      <mesh position={[0, 0.8, -0.05]} rotation={[0, 0, Math.PI]}>
        <torusGeometry args={[0.8, 0.006, 16, 64, Math.PI]} />
        <meshPhysicalMaterial {...metalMaterial} envMapIntensity={2} />
      </mesh>
      
      {/* Text Pendant Base */}
      <group position={[0, -0.05, 0]} scale={0.25}>
        <Center 
          position={[0, 0, 0]}
          onCentered={({ width }) => {
            if (Math.abs(width - cachedWidth) > 0.05 && width > 0) {
              setCachedWidth(width);
            }
          }}
        >
          <Text3D
            font={fontUrl}
            size={0.4}
            height={0.08}
            curveSegments={12}
            bevelEnabled
            bevelThickness={0.02}
            bevelSize={0.01}
            bevelOffset={0}
            bevelSegments={3}
          >
            {text}
            <meshPhysicalMaterial {...metalMaterial} envMapIntensity={4} />
          </Text3D>
        </Center>

        {/* Left jump ring */}
        <mesh position={[-cachedWidth / 2, 0.22, 0.0]} rotation={[0, Math.PI / 2, 0]} castShadow>
          <torusGeometry args={[0.04, 0.015, 16, 32]} />
          <meshPhysicalMaterial {...metalMaterial} envMapIntensity={4} />
        </mesh>

        {/* Right jump ring */}
        <mesh position={[cachedWidth / 2, 0.22, 0.0]} rotation={[0, Math.PI / 2, 0]} castShadow>
          <torusGeometry args={[0.04, 0.015, 16, 32]} />
          <meshPhysicalMaterial {...metalMaterial} envMapIntensity={4} />
        </mesh>
      </group>
    </group>
  );
}

export default function ARTryOnModal({ isOpen, onClose, metal, metalName, stone, modelType, customText, fontStyle, ringStyle, fileUrl }: ARTryOnModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState<string>('Initializing AR...');
  const [handDetected, setHandDetected] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);
  const landmarkerRef = useRef<HandLandmarker | FaceLandmarker | null>(null);
  const requestRef = useRef<number>(0);
  const lastVideoTimeRef = useRef<number>(-1);
  const [videoSize, setVideoSize] = useState({ w: 1, h: 1 });

  // Store transformation out of React state to avoid frame drops
  const transformRef = useRef({ nx: 0, ny: 0, nw: 0, rotation: 0, dirX: 0, dirY: 1, dirZ: 0, visible: false });

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;

    const initAR = async () => {
      try {
        setStatus('Loading AI models...');
        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
        );
        
        let landmarker;
        if (modelType === 'ring') {
          landmarker = await HandLandmarker.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
              delegate: 'CPU'
            },
            runningMode: 'VIDEO',
            numHands: 1
          });
        } else {
          landmarker = await FaceLandmarker.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
              delegate: 'CPU'
            },
            outputFaceBlendshapes: false,
            runningMode: 'VIDEO',
            numFaces: 1
          });
        }

        if (!isMounted) return;
        landmarkerRef.current = landmarker;

        setStatus('Starting camera...');
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } } 
        });
        
        if (!isMounted) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
      } catch (error) {
        console.error('AR init error:', error);
        if (isMounted) setStatus('Error starting AR. Please check camera permissions.');
      }
    };

    initAR();

    return () => {
      isMounted = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
      if (landmarkerRef.current) {
        landmarkerRef.current.close();
      }
    };
  }, [isOpen, modelType]);

  useEffect(() => {
    if (!isOpen || !videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    const renderLoop = () => {
      if (!video || !canvas || !ctx || !landmarkerRef.current) return;

      if (video.videoWidth > 0 && video.videoHeight > 0) {
        if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          setVideoSize({ w: video.videoWidth, h: video.videoHeight });
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        let detected = false;
        if (video.currentTime !== lastVideoTimeRef.current) {
          lastVideoTimeRef.current = video.currentTime;
          
          if (modelType === 'ring' && landmarkerRef.current instanceof HandLandmarker) {
            const results = landmarkerRef.current.detectForVideo(video, performance.now());
            if (results.landmarks && results.landmarks.length > 0) {
              detected = true;
              const landmarks = results.landmarks[0];
              
              const pt14 = landmarks[14]; // RING PIP
              const pt13 = landmarks[13]; // RING MCP
              const pt15 = landmarks[15]; // RING DIP

              if (pt14 && pt13 && pt15) {
                const dx13_14 = pt14.x - pt13.x;
                const dy13_14 = pt14.y - pt13.y;
                const dz13_14 = pt14.z - pt13.z;
                
                // Use full 3D distance to avoid shrinking when finger points at camera
                const fingerLengthNorm = Math.sqrt(dx13_14 * dx13_14 + dy13_14 * dy13_14 + dz13_14 * dz13_14);

                transformRef.current = {
                  // Position the ring about 30% up from the base knuckle
                  nx: pt13.x + dx13_14 * 0.3,
                  ny: pt13.y + dy13_14 * 0.3,
                  nw: fingerLengthNorm,
                  dirX: dx13_14,
                  dirY: dy13_14,
                  dirZ: dz13_14,
                  rotation: 0,
                  visible: true
                };
              } else {
                transformRef.current.visible = false;
              }
            } else {
              transformRef.current.visible = false;
            }
          } else if (modelType === 'pendant' && landmarkerRef.current instanceof FaceLandmarker) {
            const results = landmarkerRef.current.detectForVideo(video, performance.now());
            // FaceLandmarker returns faceLandmarks
            if (results.faceLandmarks && results.faceLandmarks.length > 0) {
              detected = true;
              const landmarks = results.faceLandmarks[0];
              
              // 152 is Chin, 10 is Top of head, 234 is Left edge, 454 is Right edge
              const chin = landmarks[152];
              const leftEdge = landmarks[234];
              const rightEdge = landmarks[454];

              if (chin && leftEdge && rightEdge) {
                const faceWidthNorm = Math.abs(leftEdge.x - rightEdge.x);
                
                // Rotation based on face tilt (eyes level)
                const leftEye = landmarks[33];
                const rightEye = landmarks[263];
                const angle = Math.atan2(rightEye.y - leftEye.y, rightEye.x - leftEye.x);

                transformRef.current = {
                  nx: chin.x,
                  ny: chin.y,
                  nw: faceWidthNorm,
                  rotation: angle,
                  dirX: 0,
                  dirY: 1,
                  dirZ: 0,
                  visible: true
                };
              } else {
                transformRef.current.visible = false;
              }
            } else {
              transformRef.current.visible = false;
            }
          }
        }

        if (detected !== handDetected) {
          setHandDetected(detected);
          setStatus(detected ? (modelType === 'ring' ? '✋ Hand Detected' : '👤 Face Detected') : (modelType === 'ring' ? '🔍 Looking for hand...' : '🔍 Looking for face...'));
        }
      }

      requestRef.current = requestAnimationFrame(renderLoop);
    };

    video.addEventListener('loadeddata', () => {
      setStatus(modelType === 'ring' ? '🔍 Looking for hand...' : '🔍 Looking for face...');
      renderLoop();
    });

  }, [isOpen, modelType]); // Render loop...

  const handleCapture = () => {
    if (!canvasRef.current) return;
    const r3fCanvas = document.querySelector('.pointer-events-none canvas') as HTMLCanvasElement;
    if (!r3fCanvas) return;

    const resultCanvas = document.createElement('canvas');
    resultCanvas.width = canvasRef.current.width;
    resultCanvas.height = canvasRef.current.height;
    const ctx = resultCanvas.getContext('2d');
    if (!ctx) return;

    // Flip horizontally because the wrapper has scaleX(-1)
    ctx.translate(resultCanvas.width, 0);
    ctx.scale(-1, 1);

    ctx.drawImage(canvasRef.current, 0, 0);
    ctx.drawImage(r3fCanvas, 0, 0, resultCanvas.width, resultCanvas.height);

    const dataUrl = resultCanvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `try-on-${modelType}-${Date.now()}.png`;
    link.href = dataUrl;
    link.click();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex flex-col items-center justify-center p-4">
      <video ref={videoRef} className="hidden" playsInline muted />
      
      {/* Aspect Ratio Preserving Container */}
      <div 
        className="relative bg-gray-900 rounded-xl overflow-hidden shadow-2xl flex-shrink-0"
        style={{
          transform: 'scaleX(-1)', // Mirror interactions natively
          width: '100%',
          height: '100%',
          maxWidth: `calc((100vh - 4rem) * ${videoSize.w / videoSize.h})`,
          maxHeight: `calc((100vw - 2rem) * ${videoSize.h / videoSize.w})`,
          aspectRatio: `${videoSize.w} / ${videoSize.h}`,
        }}
      >
        {/* Underlay: Video feed */}
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
        
        {/* Overlay: R3F Canvas */}
        <div className="absolute inset-0 pointer-events-none">
          <Canvas orthographic camera={{ position: [0, 0, 100], zoom: 1 }} gl={{ preserveDrawingBuffer: true }}>
            <ambientLight intensity={0.8} />
            <directionalLight position={[0, 10, 5]} intensity={2.5} />
            <directionalLight position={[-5, -5, -5]} intensity={1} />
            <Environment preset="city" />
            {modelType === 'ring' ? (
              <ARRing transformRef={transformRef} metal={metal} stone={stone} text={customText} fontStyle={fontStyle} ringStyle={ringStyle} fileUrl={fileUrl} />
            ) : (
              <ARPendant transformRef={transformRef} metal={metal} customText={customText} fontStyle={fontStyle} />
            )}
          </Canvas>
        </div>
      </div>

      <button 
        onClick={handleCapture}
        title="Capture Screenshot"
        className="absolute top-6 right-20 p-3 bg-white/10 text-white rounded-full hover:bg-white/20 transition-colors z-10"
      >
        <Camera className="w-6 h-6" />
      </button>

      <button 
        onClick={onClose}
        className="absolute top-6 right-6 p-3 bg-white/10 text-white rounded-full hover:bg-white/20 transition-colors z-10"
      >
        <X className="w-6 h-6" />
      </button>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-4 items-center bg-black/50 backdrop-blur-md text-white px-8 py-4 rounded-full text-sm tracking-wider uppercase z-10 border border-white/10 shadow-xl">
        <span className="font-bold whitespace-nowrap">{status}</span>
        <span className="w-px h-4 bg-white/20 mx-2"></span>
        <span className="opacity-80 text-gold-gradient font-semibold whitespace-nowrap">Trying: {metalName}</span>
      </div>
    </div>
  );
}
