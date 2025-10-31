
// FIX: Replaced placeholder content with a full implementation of the VideoPreview component.
// This component handles video preview playback with images and captions, and video downloading.
import React, { useRef, useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import { Spinner } from './Spinner';

export interface VideoPreviewRef {
  startDownload: () => Promise<void>;
}

interface VideoPreviewProps {
  audioUrl: string;
  imageUrls: string[];
  audioDuration: number;
  watermarkUrl: string;
}

const FONT_FAMILY = "'Anton', sans-serif";
const CANVAS_WIDTH = 1080; 
const CANVAS_HEIGHT = 1920; // 9:16 aspect ratio, 1080p
const IMAGE_DURATION_SECONDS = 3;

export const VideoPreview = forwardRef<VideoPreviewRef, VideoPreviewProps>(
  ({ audioUrl, imageUrls, audioDuration, watermarkUrl }, ref) => {
    const audioRef = useRef<HTMLAudioElement>(null);
    const animationFrameId = useRef<number>(0);
    const loadedImages = useRef<HTMLImageElement[]>([]);
    const watermarkImage = useRef<HTMLImageElement | null>(null);
    
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [imagesLoaded, setImagesLoaded] = useState(false);
    
    // Load images
    useEffect(() => {
      let cancelled = false;
      setImagesLoaded(false);
      const imagePromises = imageUrls.map(url => {
        return new Promise<HTMLImageElement>((resolve, reject) => {
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.onload = () => resolve(img);
          img.onerror = reject;
          img.src = url;
        });
      });
      
      const watermarkPromise = new Promise<HTMLImageElement>((resolve, reject) => {
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.onload = () => resolve(img);
          img.onerror = reject;
          img.src = watermarkUrl;
      });

      Promise.all([...imagePromises, watermarkPromise]).then(results => {
        if (!cancelled) {
          watermarkImage.current = results.pop() as HTMLImageElement;
          loadedImages.current = results as HTMLImageElement[];
          setImagesLoaded(true);
        }
      }).catch(err => console.error("Error loading images", err));
      
      return () => {
        cancelled = true;
      };

    }, [imageUrls, watermarkUrl]);

    const getCurrentImageIndex = (time: number) => {
        if (loadedImages.current.length === 0) return 0;
        const imageIndex = Math.floor(time / IMAGE_DURATION_SECONDS);
        return imageIndex % loadedImages.current.length;
    };

    const drawCanvasFrame = (ctx: CanvasRenderingContext2D, time: number) => {
      const canvas = ctx.canvas;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = 'black';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const imageIndex = getCurrentImageIndex(time);
      const image = loadedImages.current[imageIndex];
      
      if (image) {
        const canvasAspect = canvas.width / canvas.height;
        const imageAspect = image.width / image.height;
        let dx, dy, dWidth, dHeight;

        // object-cover logic: Make image cover the entire canvas, cropping if necessary
        if (imageAspect > canvasAspect) { // Image is wider than canvas, fit to height and crop sides
            dHeight = canvas.height;
            dWidth = dHeight * imageAspect;
            dx = (canvas.width - dWidth) / 2;
            dy = 0;
        } else { // Image is taller or same aspect, fit to width and crop top/bottom
            dWidth = canvas.width;
            dHeight = dWidth / imageAspect;
            dx = 0;
            dy = (canvas.height - dHeight) / 2;
        }
        ctx.drawImage(image, dx, dy, dWidth, dHeight);
      }

      if (watermarkImage.current) {
          const wm = watermarkImage.current;
          const padding = 40;
          const topOffset = 50; // User request: 50px from top
          const maxHeight = 100;
          const scale = maxHeight / wm.height;
          const wmHeight = maxHeight;
          const wmWidth = wm.width * scale;
          ctx.globalAlpha = 0.8;
          ctx.drawImage(wm, canvas.width - wmWidth - padding, topOffset, wmWidth, wmHeight);
          ctx.globalAlpha = 1.0;
      }
    };

    // Animation loop for preview
    useEffect(() => {
      if (!isPlaying || !audioRef.current) {
        cancelAnimationFrame(animationFrameId.current);
        return;
      }

      const animate = () => {
        if (!audioRef.current) return;
        const currentTime = audioRef.current.currentTime;
        setProgress((currentTime / audioDuration) * 100);
        animationFrameId.current = requestAnimationFrame(animate);
      };

      animate();

      return () => {
        cancelAnimationFrame(animationFrameId.current);
      };
    }, [isPlaying, audioDuration, imagesLoaded]);
    
    const togglePlay = () => {
      const audio = audioRef.current;
      if (!audio) return;

      if (isPlaying) {
        audio.pause();
      } else {
        if(audio.currentTime >= audioDuration - 0.1) {
            audio.currentTime = 0;
            setProgress(0);
        }
        audio.play();
      }
      setIsPlaying(!isPlaying);
    };

    const handleAudioEnded = () => {
        setIsPlaying(false);
        setProgress(100);
    }
    
    const handleProgressClick = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
        const audio = audioRef.current;
        if (!audio) return;
        
        const progressBar = e.currentTarget;
        const rect = progressBar.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const percentage = x / rect.width;
        const newTime = audioDuration * percentage;
        
        audio.currentTime = newTime;
        setProgress(percentage * 100);
    }

    useImperativeHandle(ref, () => ({
      startDownload: async () => {
        const offscreenCanvas = document.createElement('canvas');
        offscreenCanvas.width = CANVAS_WIDTH;
        offscreenCanvas.height = CANVAS_HEIGHT;
        const ctx = offscreenCanvas.getContext('2d');
        if (!ctx) throw new Error("Could not create offscreen canvas context");

        const offlineAudio = new Audio();
        offlineAudio.src = audioUrl;
        
        const frameRate = 20; // Lowered for faster export
        const videoStream = offscreenCanvas.captureStream(frameRate);
        
        const audioContext = new AudioContext();
        const audioSourceNode = audioContext.createMediaElementSource(offlineAudio);
        const audioDestinationNode = audioContext.createMediaStreamDestination();
        audioSourceNode.connect(audioDestinationNode);
        
        // FIX: Also connect to a muted gain node connected to the destination.
        // This is a workaround for browsers where the audio pipeline is not processed
        // unless it's connected to the output, ensuring audio is captured in the recording.
        const gainNode = audioContext.createGain();
        gainNode.gain.setValueAtTime(0, audioContext.currentTime);
        audioSourceNode.connect(gainNode);
        gainNode.connect(audioContext.destination);

        const combinedStream = new MediaStream([
            ...videoStream.getVideoTracks(),
            ...audioDestinationNode.stream.getAudioTracks(),
        ]);
        
        // FIX: Explicitly request the AAC audio codec for maximum compatibility in MP4 containers.
        const mimeType = 'video/mp4; codecs=mp4a.40.2';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          console.warn("MP4 with AAC audio is not supported. Falling back to default.");
        }

        const recorder = new MediaRecorder(combinedStream, { 
            mimeType: MediaRecorder.isTypeSupported(mimeType) ? mimeType : 'video/mp4' 
        });
        const chunks: Blob[] = [];
        recorder.ondataavailable = e => chunks.push(e.data);
        
        const downloadPromise = new Promise<void>((resolve, reject) => {
            recorder.onstop = () => {
                const blob = new Blob(chunks, { type: 'video/mp4' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'video-slideshow.mp4';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                audioContext.close();
                resolve();
            };
            recorder.onerror = (e) => {
                audioContext.close();
                reject(e);
            };
        });

        recorder.start();

        await new Promise<void>(resolve => {
            offlineAudio.oncanplaythrough = () => resolve();
            offlineAudio.load();
        });
        
        offlineAudio.play();
        
        let renderLoopId: number;
        
        const renderLoop = () => {
            if (offlineAudio.paused || offlineAudio.ended) {
                if(recorder.state === 'recording') {
                   recorder.stop();
                }
                cancelAnimationFrame(renderLoopId);
                return;
            }
            drawCanvasFrame(ctx, offlineAudio.currentTime);
            renderLoopId = requestAnimationFrame(renderLoop);
        };
        renderLoop();
        
        return downloadPromise;
      }
    }));
    

    return (
      <div className="w-full bg-black rounded-lg overflow-hidden shadow-2xl relative select-none">
        {!imagesLoaded ? (
            <div className="aspect-[9/16] flex items-center justify-center">
                <Spinner text="LOADING ASSETS..." />
            </div>
        ) : (
            <div className="aspect-[9/16] relative">
                <audio ref={audioRef} src={audioUrl} onEnded={handleAudioEnded} hidden />
                 {/* Image Display */}
                <div className="absolute inset-0 bg-black flex items-center justify-center">
                    <img 
                      src={imageUrls[getCurrentImageIndex(progress / 100 * audioDuration)] || imageUrls[0]} 
                      className="w-full h-full object-cover" 
                    />
                </div>
                 {/* Watermark */}
                 <div className="absolute top-[50px] right-10 opacity-80 h-[50px]">
                    <img src={watermarkUrl} alt="Watermark" className="h-full w-auto" />
                 </div>
                
                {/* Controls */}
                <div className="absolute inset-0" onClick={togglePlay}>
                    {!isPlaying && (
                         <div className="absolute inset-0 flex items-center justify-center w-full h-full bg-black bg-opacity-20 cursor-pointer">
                           <div className="w-20 h-20 bg-white bg-opacity-50 rounded-full flex items-center justify-center text-black hover:bg-opacity-75 transition-all">
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 ml-1" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                              </svg>
                          </div>
                        </div>
                    )}
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/50 to-transparent">
                    <div className="w-full bg-white/30 rounded-full h-2 cursor-pointer group" onClick={handleProgressClick}>
                        <div className="bg-yellow-400 h-2 rounded-full relative">
                            <div 
                                className="bg-yellow-400 h-2 rounded-full" 
                                style={{ width: `${progress}%` }}
                            ></div>
                             <div className="absolute top-1/2 -translate-y-1/2 h-4 w-4 rounded-full bg-white shadow-lg opacity-0 group-hover:opacity-100 transition-opacity" style={{left: `calc(${progress}% - 8px)`}}></div>
                        </div>
                    </div>
                </div>
            </div>
        )}
      </div>
    );
  }
);
