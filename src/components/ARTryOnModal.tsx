import React, { useEffect, useRef, useState, Suspense } from 'react';
import { HandLandmarker, FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import { X, Camera } from 'lucide-react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment } from '@react-three/drei';
import { METALS, STONES, FONTS } from '../constants';
import { CustomGLBRingModel } from './RingModels';
import { PendantModel } from './PendantModel';
import { Scene3DErrorBoundary } from './Scene3DErrorBoundary';

// Front camera so the user can see themselves while trying on jewellery.
// The container already applies scaleX(-1) mirroring, which is correct for front-facing.
const CAMERA_FACING = 'user' as const;

const WASM_CDN = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm';

// Module-level singleton. Calling warmARRuntime() from the parent page on
// mount pre-fetches the WASM bundle before the user opens the AR modal,
// so the heavy first download is already in-flight or done when they click AR.
let visionRuntimeCache: Promise<Awaited<ReturnType<typeof FilesetResolver.forVisionTasks>>> | null = null;

export function warmARRuntime() {
  if (!visionRuntimeCache) {
    visionRuntimeCache = FilesetResolver.forVisionTasks(WASM_CDN);
  }
  return visionRuntimeCache;
}

interface ARTryOnModalProps {
  isOpen: boolean;
  onClose: () => void;
  metal: keyof typeof METALS;
  metalName: string;
  stone?: keyof typeof STONES;
  modelType: 'ring' | 'pendant';
  fileUrl?: string;
  customText?: string;
  fontStyle?: keyof typeof FONTS;
  // Pendant-specific — mirrors the configurator's tracked state
  pendantShape?: 'standard' | 'heart' | 'tag';
  fontBold?: boolean;
  fontItalic?: boolean;
  textDirection?: 'horizontal' | 'vertical';
}

function ARRing({ transformRef, metal, stone, text, fontStyle, fileUrl }: {
  transformRef: any; metal: string; stone?: string; text?: string;
  fontStyle?: string; fileUrl?: string;
}) {
  const meshRef = useRef<THREE.Group>(null);
  const { viewport } = useThree();

  const metalMaterial = METALS[metal as keyof typeof METALS] || METALS.silver;
  const stoneMaterial = stone ? STONES[stone as keyof typeof STONES] : STONES.diamond;

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

    targetPos.current.set(
      (nx - 0.5) * viewport.width,
      -(ny - 0.5) * viewport.height,
      0
    );

    // Adjust ring scale to fit finger width (nw is MCP-to-PIP length in normalised coords).
    targetScale.current = (nw * viewport.width) * 0.5;

    // Note: Mediapipe Y is down. R3F Y is up. So we invert Y.
    // Mediapipe Z is down (negative is closer). R3F Z is up. So we use -dirZ.
    // Multiplied dirZ by 2 to emphasize depth since mediapipe z is sometimes subtle
    targetDir.current.set(dirX, -dirY, -dirZ * 2).normalize();

    const smoothFactor = Math.min(15 * delta, 1);

    if (!meshRef.current.userData.initialized) {
      meshRef.current.userData.initialized = true;
      meshRef.current.userData.currentDir = new THREE.Vector3().copy(targetDir.current);
      meshRef.current.position.copy(targetPos.current);
      currentScale.current = targetScale.current;
      meshRef.current.scale.setScalar(currentScale.current);
    }

    meshRef.current.position.lerp(targetPos.current, smoothFactor);

    currentScale.current = THREE.MathUtils.lerp(currentScale.current, targetScale.current, smoothFactor);
    meshRef.current.scale.setScalar(currentScale.current);

    const currentDir = meshRef.current.userData.currentDir as THREE.Vector3;
    currentDir.lerp(targetDir.current, smoothFactor).normalize();

    // Ring hole (-Z) points along the finger; stone top (+Y) faces camera (+Z)
    meshRef.current.up.set(0, 0, 1);
    const lookTarget = meshRef.current.position.clone().add(currentDir);
    meshRef.current.lookAt(lookTarget);
  });

  return (
    <group ref={meshRef}>
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

// Wraps the real PendantModel with face-tracking transform logic.
// The outer group's position/scale/rotation are driven by MediaPipe face landmarks;
// PendantModel provides the actual visual, chain physics, and text rendering.
function ARPendant({ transformRef, metal, customText, fontStyle, fontBold, fontItalic, pendantShape, textDirection }: {
  transformRef: any;
  metal: string;
  customText?: string;
  fontStyle?: string;
  fontBold?: boolean;
  fontItalic?: boolean;
  pendantShape?: 'standard' | 'heart' | 'tag';
  textDirection?: 'horizontal' | 'vertical';
}) {
  const meshRef = useRef<THREE.Group>(null);
  const { viewport } = useThree();
  const metalMaterial = METALS[metal as keyof typeof METALS] || METALS.silver;

  useFrame(() => {
    if (!meshRef.current) return;
    const { nx, ny, nw, rotation, visible } = transformRef.current;

    if (!visible || !nw) {
      meshRef.current.visible = false;
      return;
    }
    meshRef.current.visible = true;

    meshRef.current.position.x = (nx - 0.5) * viewport.width;
    // Offset below the chin so the pendant sits on the chest
    meshRef.current.position.y = -(ny - 0.5) * viewport.height - (nw * viewport.width * 0.8);

    // PendantModel's chain spans roughly 3.2 local units top-to-bottom.
    // PENDANT_AR_SCALE = 0.25 makes chain height ≈ 0.8 × face_width in screen pixels.
    // Tune this constant if pendant appears too large or small on screen.
    const PENDANT_AR_SCALE = 0.25;
    meshRef.current.scale.setScalar(nw * viewport.width * PENDANT_AR_SCALE);

    // Real chains hang vertically under gravity — apply only a small fraction of
    // face tilt so the chain doesn't swing unrealistically with head rotation.
    meshRef.current.rotation.z = rotation * 0.1;
  });

  return (
    <group ref={meshRef}>
      <Suspense fallback={null}>
        <PendantModel
          text={customText || 'PD'}
          metalMaterial={metalMaterial}
          fontStyle={fontStyle || 'cinzel'}
          fontBold={fontBold}
          fontItalic={fontItalic}
          shape={pendantShape || 'standard'}
          textDirection={textDirection || 'horizontal'}
        />
      </Suspense>
    </group>
  );
}

export default function ARTryOnModal({
  isOpen, onClose, metal, metalName, stone, modelType,
  customText, fontStyle, fileUrl,
  pendantShape, fontBold, fontItalic, textDirection,
}: ARTryOnModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState<string>('Initializing AR...');
  const [handDetected, setHandDetected] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
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
    setTimedOut(false);
    setStatus('Initializing AR...');

    const initAR = async () => {
      try {
        // Single 15-second budget for both the WASM runtime + model download.
        // If warmARRuntime() was already called on page mount, the runtime
        // promise resolves instantly here (cached) and the full 15s goes to
        // the model download.
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('AR_TIMEOUT')), 15000)
        );

        const loadModels = async () => {
          setStatus('Loading AI runtime...');
          const vision = await warmARRuntime();

          setStatus('Loading detection model...');
          if (modelType === 'ring') {
            return HandLandmarker.createFromOptions(vision, {
              baseOptions: {
                modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
                delegate: 'GPU',
              },
              runningMode: 'VIDEO',
              numHands: 1,
            });
          } else {
            return FaceLandmarker.createFromOptions(vision, {
              baseOptions: {
                modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
                delegate: 'GPU',
              },
              outputFaceBlendshapes: false,
              runningMode: 'VIDEO',
              numFaces: 1,
            });
          }
        };

        const landmarker = await Promise.race([loadModels(), timeoutPromise]);

        if (!isMounted) return;
        landmarkerRef.current = landmarker;

        setStatus('Starting camera...');
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: CAMERA_FACING, width: { ideal: 1280 }, height: { ideal: 720 } }
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
      } catch (error: any) {
        if (!isMounted) return;
        if (error?.message === 'AR_TIMEOUT') {
          setTimedOut(true);
          setStatus('Taking too long — check your connection');
        } else {
          console.error('AR init error:', error);
          setStatus('Error starting AR. Please check camera permissions.');
        }
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
  }, [isOpen, modelType, retryKey]);

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
                  // Position just above the base knuckle (MCP joint)
                  nx: pt13.x + dx13_14 * 0.1,
                  ny: pt13.y + dy13_14 * 0.1,
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
            if (results.faceLandmarks && results.faceLandmarks.length > 0) {
              detected = true;
              const landmarks = results.faceLandmarks[0];

              // 152 = Chin, 234 = Left edge, 454 = Right edge
              const chin = landmarks[152];
              const leftEdge = landmarks[234];
              const rightEdge = landmarks[454];

              if (chin && leftEdge && rightEdge) {
                const faceWidthNorm = Math.abs(leftEdge.x - rightEdge.x);

                const leftEye = landmarks[33];
                const rightEye = landmarks[263];
                const angle = Math.atan2(rightEye.y - leftEye.y, rightEye.x - leftEye.x);

                transformRef.current = {
                  nx: (leftEdge.x + rightEdge.x) / 2,
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
          setStatus(detected
            ? (modelType === 'ring' ? '✋ Hand Detected' : '👤 Face Detected')
            : (modelType === 'ring' ? '🔍 Looking for hand...' : '🔍 Looking for face...')
          );
        }
      }

      requestRef.current = requestAnimationFrame(renderLoop);
    };

    video.addEventListener('loadeddata', () => {
      setStatus(modelType === 'ring' ? '🔍 Looking for hand...' : '🔍 Looking for face...');
      renderLoop();
    });

  }, [isOpen, modelType]);

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
          transform: 'scaleX(-1)',
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
          <Scene3DErrorBoundary onClose={onClose}>
            <Canvas orthographic camera={{ position: [0, 0, 100], zoom: 1 }} gl={{ preserveDrawingBuffer: true }}>
              <ambientLight intensity={0.8} />
              <directionalLight position={[0, 10, 5]} intensity={2.5} />
              <directionalLight position={[-5, -5, -5]} intensity={1} />
              <Environment preset="city" />
              {modelType === 'ring' ? (
                <ARRing
                  transformRef={transformRef}
                  metal={metal}
                  stone={stone}
                  text={customText}
                  fontStyle={fontStyle}
                  fileUrl={fileUrl}
                />
              ) : (
                <ARPendant
                  transformRef={transformRef}
                  metal={metal}
                  customText={customText}
                  fontStyle={fontStyle}
                  fontBold={fontBold}
                  fontItalic={fontItalic}
                  pendantShape={pendantShape}
                  textDirection={textDirection}
                />
              )}
            </Canvas>
          </Scene3DErrorBoundary>
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
        {timedOut && (
          <button
            onClick={() => setRetryKey(k => k + 1)}
            className="text-xs px-3 py-1 bg-white/20 rounded-full hover:bg-white/30 transition-colors ml-1 normal-case"
          >
            Retry
          </button>
        )}
        <span className="w-px h-4 bg-white/20 mx-2"></span>
        <span className="opacity-80 text-gold-gradient font-semibold whitespace-nowrap">Trying: {metalName}</span>
      </div>
    </div>
  );
}
