import { FilesetResolver, PoseLandmarker, FaceLandmarker } from "@mediapipe/tasks-vision";

export type Landmarkers = {
  pose: PoseLandmarker;
  face: FaceLandmarker;
};

export async function initLandmarkers(): Promise<Landmarkers> {
  const vision = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
  );

  const [pose, face] = await Promise.all([
    PoseLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath:
          "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
        delegate: "GPU",
      },
      runningMode: "VIDEO",
      numPoses: 1,
    }),
    FaceLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath:
          "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
        delegate: "GPU",
      },
      runningMode: "VIDEO",
      outputFaceBlendshapes: false,
      // refineLandmarks is required for iris landmarks (478 vs 468 count).
      // Not in SDK typings for 0.10.x but honoured at runtime.
      ...({ refineLandmarks: true } as object),
      numFaces: 1,
    }),
  ]);

  return { pose, face };
}
