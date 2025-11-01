
import React, { useRef } from 'react';
import { LogoOption } from '../assets/defaultWatermark';

interface FileUploaderProps {
  onAudioUpload: (file: File) => void;
  onImagesUpload: (files: File[]) => void;
  audioFile: File | null;
  imageFiles: File[];
  logos: LogoOption[];
  selectedWatermarkUrl: string;
  onWatermarkSelect: (url: string) => void;
}

const UploadIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
    </svg>
);


export const FileUploader: React.FC<FileUploaderProps> = ({ onAudioUpload, onImagesUpload, audioFile, imageFiles, logos, selectedWatermarkUrl, onWatermarkSelect }) => {
  const audioInputRef = useRef<HTMLInputElement>(null);
  const imagesInputRef = useRef<HTMLInputElement>(null);

  const handleAudioChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      onAudioUpload(event.target.files[0]);
    }
  };

  const handleImagesChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      onImagesUpload(Array.from(event.target.files));
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Audio Uploader */}
      <div>
        <h3 className="font-anton text-2xl text-yellow-400 mb-2">1. UPLOAD AUDIO</h3>
        <div 
          className="bg-gray-900 border-2 border-dashed border-gray-600 rounded-lg p-6 text-center cursor-pointer hover:border-yellow-400 transition-colors h-full flex flex-col justify-center"
          onClick={() => audioInputRef.current?.click()}
        >
          <input type="file" accept="audio/*" ref={audioInputRef} onChange={handleAudioChange} className="hidden" />
          <div className="flex flex-col items-center">
            <UploadIcon />
            {audioFile ? (
               <p className="mt-2 text-green-400 truncate">{audioFile.name}</p>
            ) : (
                <p className="mt-2 text-gray-400">Click to select an audio file</p>
            )}
          </div>
        </div>
      </div>

      {/* Image Uploader */}
      <div>
        <h3 className="font-anton text-2xl text-yellow-400 mb-2">2. UPLOAD IMAGES</h3>
        <div 
          className="bg-gray-900 border-2 border-dashed border-gray-600 rounded-lg p-6 text-center cursor-pointer hover:border-yellow-400 transition-colors h-full flex flex-col justify-center"
          onClick={() => imagesInputRef.current?.click()}
        >
          <input type="file" accept="image/*" multiple ref={imagesInputRef} onChange={handleImagesChange} className="hidden" />
          <div className="flex flex-col items-center">
             <UploadIcon />
             {imageFiles.length > 0 ? (
                <p className="mt-2 text-green-400">{imageFiles.length} image{imageFiles.length > 1 ? 's' : ''} selected</p>
            ) : (
                <p className="mt-2 text-gray-400">Click to select images</p>
            )}
          </div>
        </div>
      </div>
      
       {/* Watermark Section */}
      <div className="md:col-span-2 mt-4">
        <h3 className="font-anton text-2xl text-yellow-400 mb-2">3. CHOOSE YOUR WATERMARK</h3>
        <div className="flex justify-center items-center gap-6 flex-wrap">
           {logos.map((logo) => (
             <div
                key={logo.id}
                className={`text-center w-full max-w-xs cursor-pointer rounded-lg p-2 transition-all ${
                  selectedWatermarkUrl === logo.url ? 'ring-4 ring-yellow-400' : 'ring-2 ring-gray-700 hover:ring-yellow-500'
                }`}
                onClick={() => onWatermarkSelect(logo.url)}
              >
                <div className="aspect-video bg-gray-700 rounded-lg flex items-center justify-center p-2 pointer-events-none">
                  <img src={logo.url} alt={`${logo.name} preview`} className="max-w-full max-h-full object-contain"/>
                </div>
                <p className="text-sm text-gray-400 mt-2">{logo.name}</p>
              </div>
           ))}
        </div>
      </div>


       {/* Image Previews */}
        {imageFiles.length > 0 && (
            <div className="md:col-span-2 mt-4">
                 <h4 className="font-semibold text-lg text-gray-300 mb-2">Image Preview:</h4>
                 <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4 bg-gray-900 p-4 rounded-lg">
                    {imageFiles.map((file, index) => (
                        <div key={index} className="aspect-square rounded-lg overflow-hidden ring-2 ring-gray-700">
                             <img src={URL.createObjectURL(file)} alt={`preview ${index}`} className="w-full h-full object-cover" />
                        </div>
                    ))}
                 </div>
            </div>
        )}
    </div>
  );
};
