import { useRef, useCallback, useEffect } from 'react';
import { CameraView } from 'expo-camera';
import { useAppDispatch, useAppSelector } from './redux';
import { webSocketService, VideoFrame } from '../services/WebSocketService';
import {
  setRecording,
  setOriginalFrame,
  setError,
  updateFPS,
} from '../store/slices/videoSlice';

export const useVideoProcessing = () => {
  const dispatch = useAppDispatch();
  
  const frameIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const fpsCounterRef = useRef({ frames: 0, lastTime: Date.now() });
  const cameraRef = useRef<CameraView>(null);

  // Get state using selectors
  const isRecording = useAppSelector((state: any) => state.video.isRecording);
  const isProcessing = useAppSelector((state: any) => state.video.isProcessing);
  const processedFrame = useAppSelector((state: any) => state.video.processedFrame);
  const originalFrame = useAppSelector((state: any) => state.video.originalFrame);
  const frameCount = useAppSelector((state: any) => state.video.frameCount);
  const fps = useAppSelector((state: any) => state.video.fps);
  const quality = useAppSelector((state: any) => state.video.quality);
  const cameraFacing = useAppSelector((state: any) => state.video.cameraFacing);
  const error = useAppSelector((state: any) => state.video.error);
  
  const connectionStatus = useAppSelector((state: any) => state.connection.status);
  const latency = useAppSelector((state: any) => state.connection.latency);
  const lastError = useAppSelector((state: any) => state.connection.lastError);

  const startVideoProcessing = useCallback(async () => {
    try {
      // Connect to WebSocket
      await webSocketService.connect();
      dispatch(setRecording(true));
      
      // Start capturing frames after a longer delay to ensure camera is fully ready
      setTimeout(() => {
        if (cameraRef.current) {
          console.log('Starting frame capture - camera ref available');
          startFrameCapture();
        } else {
          console.warn('Camera ref not available when starting frame capture');
          // Try again after another delay
          setTimeout(() => {
            if (cameraRef.current) {
              console.log('Starting frame capture - camera ref available (retry)');
              startFrameCapture();
            } else {
              console.error('Camera ref still not available after retry');
              dispatch(setError('Camera not ready - please try again'));
            }
          }, 2000);
        }
      }, 2000); // Increased delay to 2 seconds
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to start processing';
      dispatch(setError(errorMessage));
    }
  }, [dispatch]);

  const stopVideoProcessing = useCallback(() => {
    if (frameIntervalRef.current) {
      clearInterval(frameIntervalRef.current);
      frameIntervalRef.current = null;
    }
    
    webSocketService.disconnect();
    dispatch(setRecording(false));
    fpsCounterRef.current = { frames: 0, lastTime: Date.now() };
  }, [dispatch]);

  const startFrameCapture = useCallback(() => {
    if (frameIntervalRef.current) {
      clearInterval(frameIntervalRef.current);
    }

    // Capture frames at maximum rate for real-time processing
    frameIntervalRef.current = setInterval(async () => {
      if (cameraRef.current && isRecording) {
        try {
          await captureAndSendFrame();
          updateFPSCounter();
        } catch (error) {
          console.error('Frame capture error:', error);
          // Don't stop recording on single frame errors
        }
      }
    }, 16); // ~60 FPS (1000ms / 60)
  }, [isRecording]);

  const captureAndSendFrame = useCallback(async () => {
    if (!cameraRef.current) {
      console.warn('Camera ref not available');
      return;
    }

    try {
      // Take picture from camera
      const photo = await cameraRef.current.takePictureAsync({
        base64: true,
        quality: quality,
        skipProcessing: true, // Skip processing for speed
        exif: false, // Skip EXIF data for speed
      });

      if (photo && photo.base64) {
        // Dispatch original frame to store
        dispatch(setOriginalFrame(photo.base64));

        // Prepare frame for WebSocket
        const frame: VideoFrame = {
          frameData: photo.base64,
          format: 'jpeg',
          timestamp: Date.now(),
          width: photo.width,
          height: photo.height,
          cameraFacing: cameraFacing,
          quality: quality,
        };

        // Send frame for processing
        webSocketService.sendFrame(frame);
      } else {
        console.warn('No base64 data in captured photo');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown camera error';
      console.error('Failed to capture frame:', error);
      dispatch(setError(`Failed to capture camera frame: ${errorMessage}`));
    }
  }, [dispatch, quality, cameraFacing]);

  const updateFPSCounter = useCallback(() => {
    fpsCounterRef.current.frames++;
    const now = Date.now();
    const elapsed = now - fpsCounterRef.current.lastTime;
    
    // Update FPS every second
    if (elapsed >= 1000) {
      const fps = (fpsCounterRef.current.frames * 1000) / elapsed;
      dispatch(updateFPS(Math.round(fps * 10) / 10)); // Round to 1 decimal
      
      fpsCounterRef.current.frames = 0;
      fpsCounterRef.current.lastTime = now;
    }
  }, [dispatch]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopVideoProcessing();
    };
  }, [stopVideoProcessing]);

  // Handle connection state changes
  useEffect(() => {
    if (connectionStatus === 'error' && isRecording) {
      stopVideoProcessing();
    }
  }, [connectionStatus, isRecording, stopVideoProcessing]);

  return {
    cameraRef,
    isRecording,
    isProcessing,
    connectionStatus,
    fps,
    frameCount,
    latency,
    processedFrame,
    originalFrame,
    error: error || lastError,
    startVideoProcessing,
    stopVideoProcessing,
  };
};
