
// FIX: Replaced placeholder content with a full implementation of the VideoPreview component.
// This component handles video preview playback with images and captions, and video downloading.
import React, { useRef, useEffect, useState, forwardRef, useImperativeHandle, useLayoutEffect } from 'react';
import type { Word } from '../types';
import { Spinner } from './Spinner';

export interface VideoPreviewRef {
  startDownload: () => Promise<void>;
}

interface VideoPreviewProps {
  audioUrl: string;
  imageUrls: string[];
  captions: Word[];
  audioDuration: number;
  watermarkUrl: string;
}

const FONT_FAMILY = "'Anton', sans-serif";
const BASE_FONT_SIZE = 32; // pt
const CAPTION_COLOR = '#FFFF00'; // Yellow
const CAPTION_OUTLINE_COLOR = '#000000';
const CANVAS_WIDTH = 1080; 
const CANVAS_HEIGHT = 1920; // 9:16 aspect ratio, 1080p

// Margins
const MARGIN_X = 20;
const MARGIN_Y_TOP = 40;
const MARGIN_Y_BOTTOM = 20;

export const VideoPreview = forwardRef<VideoPreviewRef, VideoPreviewProps>(
  ({ audioUrl, imageUrls, captions, audioDuration, watermarkUrl }, ref) => {
    const audioRef = useRef<HTMLAudioElement>(null);
    const animationFrameId = useRef<number>(0);
    const loadedImages = useRef<HTMLImageElement[]>([]);
    const watermarkImage = useRef<HTMLImageElement | null>(null);
    
    const captionContainerRef = useRef<HTMLDivElement>(null);
    const captionTextRef = useRef<HTMLSpanElement>(null);

    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [imagesLoaded, setImagesLoaded] = useState(false);
    const [currentWord, setCurrentWord] = useState('');
    const [captionScale, setCaptionScale] = useState(1);
    
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
        if (audioDuration === 0 || loadedImages.current.length === 0) return 0;
        const durationPerImage = audioDuration / loadedImages.current.length;
        return Math.min(loadedImages.current.length - 1, Math.floor(time / durationPerImage));
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
          const topOffset = 120;
          const maxHeight = 100;
          const scale = maxHeight / wm.height;
          const wmHeight = maxHeight;
          const wmWidth = wm.width * scale;
          ctx.globalAlpha = 0.8;
          ctx.drawImage(wm, canvas.width - wmWidth - padding, topOffset, wmWidth, wmHeight);
          ctx.globalAlpha = 1.0;
      }
      
      const activeWord = captions.find(c => time >= c.start && time < c.end);
      if(activeWord){
        const maxWidth = canvas.width - (MARGIN_X * 2);
  
        // Set initial font to measure text
        ctx.font = `bold ${BASE_FONT_SIZE}pt ${FONT_FAMILY}`;
        const textWidth = ctx.measureText(activeWord.word).width;

        // Calculate the final font size, scaling down if the word is too long
        let finalFontSize = BASE_FONT_SIZE;
        if (textWidth > maxWidth) {
            finalFontSize = BASE_FONT_SIZE * (maxWidth / textWidth);
        }

        // Apply final font settings and draw
        ctx.font = `bold ${finalFontSize}pt ${FONT_FAMILY}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = CAPTION_COLOR;
        ctx.strokeStyle = CAPTION_OUTLINE_COLOR;
        ctx.lineWidth = 4;
        ctx.lineJoin = 'round';
        
        const textX = canvas.width / 2;
        const textY = canvas.height / 2;
        
        ctx.strokeText(activeWord.word, textX, textY);
        ctx.fillText(activeWord.word, textX, textY);
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
        
        const activeWord = captions.find(c => currentTime >= c.start && currentTime < c.end);
        setCurrentWord(activeWord ? activeWord.word : '');
        
        setProgress((currentTime / audioDuration) * 100);
        animationFrameId.current = requestAnimationFrame(animate);
      };

      animate();

      return () => {
        cancelAnimationFrame(animationFrameId.current);
      };
    }, [isPlaying, audioDuration, captions, imagesLoaded]);
    
    useLayoutEffect(() => {
        if(captionContainerRef.current && captionTextRef.current) {
            const containerWidth = captionContainerRef.current.offsetWidth - (MARGIN_X * 2);
            const containerHeight = captionContainerRef.current.offsetHeight - MARGIN_Y_TOP - MARGIN_Y_BOTTOM;
            const textWidth = captionTextRef.current.offsetWidth;
            const textHeight = captionTextRef.current.offsetHeight;
            
            const scaleX = textWidth > containerWidth ? containerWidth / textWidth : 1;
            const scaleY = textHeight > containerHeight ? containerHeight / textHeight : 1;
            
            setCaptionScale(Math.min(scaleX, scaleY));
        }
    }, [currentWord]);


    const togglePlay = () => {
      const audio = audioRef.current;
      if (!audio) return;

      if (isPlaying) {
        audio.pause();
      } else {
        if(audio.currentTime >= audioDuration - 0.1) {
            audio.currentTime = 0;
            setProgress(0);
            setCurrentWord('');
        }
        audio.play();
      }
      setIsPlaying(!isPlaying);
    };

    const handleAudioEnded = () => {
        setIsPlaying(false);
        setProgress(100);
        setCurrentWord('');
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
        const activeWord = captions.find(c => newTime >= c.start && newTime < c.end);
        setCurrentWord(activeWord ? activeWord.word : '');
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
        // The line that played audio to the main output has been removed to ensure silent export.
        
        const combinedStream = new MediaStream([
            ...videoStream.getVideoTracks(),
            ...audioDestinationNode.stream.getAudioTracks(),
        ]);

        const recorder = new MediaRecorder(combinedStream, { mimeType: 'video/webm; codecs=vp8,opus' }); // Switched to vp8 for speed
        const chunks: Blob[] = [];
        recorder.ondataavailable = e => chunks.push(e.data);
        
        const downloadPromise = new Promise<void>((resolve, reject) => {
            recorder.onstop = () => {
                const blob = new Blob(chunks, { type: 'video/webm' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'video-slideshow.webm';
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
        
        offlineAudio.muted = true; // Mute the element to be safe
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
                 <div className="absolute top-16 right-5 opacity-80 h-[50px]">
                    <img src={watermarkUrl} alt="Watermark" className="h-full w-auto" />
                 </div>
                 {/* Captions */}
                <div 
                    ref={captionContainerRef}
                    className="absolute inset-0 flex items-center justify-center pointer-events-none p-5"
                >
                    <div 
                        className={`transition-all duration-100 ${currentWord ? 'opacity-100 scale-100' : 'opacity-0 scale-125'}`}
                        style={{ transform: `scale(${captionScale})`}}
                    >
                         <span 
                            ref={captionTextRef}
                            className="font-anton text-yellow-400 text-center leading-none"
                            style={{
                                fontSize: `${BASE_FONT_SIZE}pt`,
                                WebkitTextStroke: '2px black',
                                paintOrder: 'stroke fill',
                            }}
                         >
                            {currentWord}
                         </span>
                    </div>
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