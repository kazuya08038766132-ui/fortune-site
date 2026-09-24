import {createPalmHandLandmarker} from './palm-hand-landmarker-build40.js';

export async function initializePalmBrowserRuntime({
  importModule=(p)=>import(p),
  ortModulePath='./vendor/onnxruntime-web/ort.min.mjs',
  visionModulePath='./vendor/mediapipe/tasks-vision/vision_bundle.mjs',
  ortWasmRoot='./vendor/onnxruntime-web/',
  visionWasmRoot='./vendor/mediapipe/tasks-vision/wasm',
  handModelPath='./models/hand_landmarker.task',
  modelUrl='./models/palm-principal-lines.onnx'
}={}){
  const [ortMod,visionMod]=await Promise.all([importModule(ortModulePath),importModule(visionModulePath)]);
  const ort=ortMod?.default?.InferenceSession?ortMod.default:ortMod;
  if(!ort?.InferenceSession?.create||!ort?.Tensor)throw Error('ORT_RUNTIME_LOAD_FAILED');
  if(ort.env?.wasm)ort.env.wasm.wasmPaths=ortWasmRoot;
  const FilesetResolver=visionMod?.FilesetResolver||visionMod?.default?.FilesetResolver;
  const HandLandmarker=visionMod?.HandLandmarker||visionMod?.default?.HandLandmarker;
  const handLandmarker=await createPalmHandLandmarker({FilesetResolver,HandLandmarker,wasmRoot:visionWasmRoot,modelAssetPath:handModelPath});
  return {ort,handLandmarker,modelUrl,source:'SELF_HOSTED_VENDOR'};
}
