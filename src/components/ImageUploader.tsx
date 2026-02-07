import { ChangeEvent, useRef, useState } from 'react';
import { processUploadedImage } from '../utils/imageProcessing';
import { useVisualizer } from '../contexts/VisualizerContext';

function ImageUploader() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { setUploadedImage, setImageUrl, setWallPoints } = useVisualizer();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    setIsProcessing(true);
    setError(null);
    try {
      const { image, dataUrl } = await processUploadedImage(file);
      setUploadedImage(image);
      setImageUrl(dataUrl);
      setWallPoints(null);
    } catch (err) {
      setError('Unable to process image. Please try a different file.');
      console.error(err);
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="image-uploader">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="image-uploader__input"
        onChange={handleFileChange}
      />
      <button
        type="button"
        className="image-uploader__button"
        onClick={() => fileInputRef.current?.click()}
        disabled={isProcessing}
      >
        {isProcessing ? 'Processing…' : 'Upload wall photo'}
      </button>
      {error && <p className="image-uploader__error">{error}</p>}
    </div>
  );
}

export default ImageUploader;
