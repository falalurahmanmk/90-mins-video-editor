
import React, { useState, useRef, useEffect } from 'react';
import { FileUploader } from './components/FileUploader';
import { VideoPreview, VideoPreviewRef } from './components/VideoPreview';
import { Spinner } from './components/Spinner';
import { Logo } from './components/Logo';
import { defaultWatermarkUrl } from './assets/defaultWatermark';

const App: React.FC = () => {
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [watermarkFile, setWatermarkFile] = useState<File | null>(null);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [watermarkUrl, setWatermarkUrl] = useState<string>(defaultWatermarkUrl);
  const [audioDuration, setAudioDuration] = useState<number>(0);
  const [videoReady, setVideoReady] = useState(false);

  const videoPreviewRef = useRef<VideoPreviewRef>(null);

  useEffect(() => {
    if (audioFile) {
      const url = URL.createObjectURL(audioFile);
      setAudioUrl(url);
      const audio = new Audio(url);
      audio.onloadedmetadata = () => {
        setAudioDuration(audio.duration);
      };
      return () => URL.revokeObjectURL(url);
    }
  }, [audioFile]);

  useEffect(() => {
    if (imageFiles.length > 0) {
      const urls = imageFiles.map(file => URL.createObjectURL(file));
      setImageUrls(urls);
      return () => urls.forEach(url => URL.revokeObjectURL(url));
    }
  }, [imageFiles]);
  
  useEffect(() => {
    if (watermarkFile) {
        const url = URL.createObjectURL(watermarkFile);
        setWatermarkUrl(url);
        return () => URL.revokeObjectURL(url);
    } else {
        setWatermarkUrl(defaultWatermarkUrl);
    }
  }, [watermarkFile]);

  const handleCreateSlideshowClick = () => {
    if (!audioFile || imageFiles.length === 0) {
      setError("Please upload an audio file and at least one image.");
      return;
    }
    setError(null);
    setVideoReady(true);
  };

  const handleDownload = async () => {
    if (videoPreviewRef.current) {
        setIsDownloading(true);
        setError(null);
        try {
            await videoPreviewRef.current.startDownload();
        } catch (err) {
            console.error("Download failed", err);
            const message = err instanceof Error ? err.message : "An unknown error occurred.";
            setError(`Video download failed: ${message}`);
        } finally {
            setIsDownloading(false);
        }
    }
  };

  const handleReset = () => {
    setAudioFile(null);
    setImageFiles([]);
    setWatermarkFile(null);
    setAudioUrl(null);
    setImageUrls([]);
    setWatermarkUrl(defaultWatermarkUrl);
    setAudioDuration(0);
    setVideoReady(false);
    setError(null);
    setIsDownloading(false);
  }

  return (
    <div className="bg-gray-900 min-h-screen text-white flex flex-col items-center p-4 sm:p-6 md:p-8">
      <header className="w-full max-w-6xl mb-6 flex flex-col sm:flex-row justify-between items-center">
        <div className="flex items-center space-x-4">
          <div className="w-10 h-10">
            <Logo simple={true} />
          </div>
          <h1 className="font-anton text-3xl sm:text-4xl text-yellow-400 tracking-wider">
            VIDEO SLIDESHOW CREATOR
          </h1>
        </div>
        {videoReady && (
            <div className="flex items-center space-x-4 mt-4 sm:mt-0">
                <button 
                    onClick={handleDownload} 
                    disabled={isDownloading}
                    className="font-anton text-lg bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-all duration-300 transform hover:scale-105 disabled:bg-gray-600 disabled:cursor-not-allowed disabled:scale-100"
                >
                    {isDownloading ? <Spinner text="DOWNLOADING..." /> : 'DOWNLOAD VIDEO'}
                </button>
                <button onClick={handleReset} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-300">Start Over</button>
            </div>
        )}
      </header>

      <main className="w-full max-w-6xl flex-grow">
        <div className={`transition-opacity duration-500 ${videoReady ? 'opacity-0 h-0 overflow-hidden' : 'opacity-100'}`}>
            <div className="bg-gray-800 p-6 rounded-2xl shadow-lg border border-gray-700">
            <FileUploader
                onAudioUpload={setAudioFile}
                onImagesUpload={setImageFiles}
                onWatermarkUpload={setWatermarkFile}
                audioFile={audioFile}
                imageFiles={imageFiles}
                watermarkFile={watermarkFile}
                watermarkPreviewUrl={watermarkUrl}
            />
            <div className="mt-6 text-center">
                <button
                onClick={handleCreateSlideshowClick}
                disabled={!audioFile || imageFiles.length === 0}
                className="font-anton text-2xl bg-yellow-400 text-black px-12 py-3 rounded-lg hover:bg-yellow-500 transition-all duration-300 transform hover:scale-105 disabled:bg-gray-600 disabled:cursor-not-allowed disabled:scale-100"
                >
                CREATE SLIDESHOW
                </button>
                
            </div>
            </div>
        </div>

        <div className={`w-full flex flex-col items-center justify-center transition-opacity duration-500 ${videoReady ? 'opacity-100' : 'opacity-0 h-0 overflow-hidden'}`}>
            <div className="w-full max-w-sm">
                {videoReady && audioUrl && imageUrls.length > 0 && (
                <VideoPreview
                    ref={videoPreviewRef}
                    audioUrl={audioUrl}
                    imageUrls={imageUrls}
                    audioDuration={audioDuration}
                    watermarkUrl={watermarkUrl}
                />
                )}
            </div>
            {error && <p className="text-red-500 mt-4 text-center">{error}</p>}
        </div>
      </main>
    </div>
  );
};

export default App;
