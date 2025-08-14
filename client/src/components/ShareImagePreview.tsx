import React from 'react';
import { X, Download, Share } from 'lucide-react';

interface ShareImagePreviewProps {
  imageUrl: string;
  onClose: () => void;
}

const ShareImagePreview: React.FC<ShareImagePreviewProps> = ({ imageUrl, onClose }) => {
  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `caloritrack-share-image-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        const imageResponse = await fetch(imageUrl);
        const imageBlob = await imageResponse.blob();
        const imageFile = new File([imageBlob], 'caloritrack-analysis.png', { type: 'image/png' });
        
        await navigator.share({
          title: 'CaloriTrack Analysis',
          text: 'Check out my food analysis results!',
          files: [imageFile]
        });
      } catch (error) {
        console.error('Share failed:', error);
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex justify-between items-center p-4 border-b">
          <h3 className="text-lg font-semibold">Share Image Preview</h3>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-4 overflow-auto max-h-[calc(90vh-120px)]">
          <img 
            src={imageUrl} 
            alt="Share preview" 
            className="w-full rounded-lg shadow-lg"
            onError={(e) => {
              console.error('Failed to load preview image:', e);
              e.currentTarget.style.display = 'none';
            }}
          />
        </div>
        
        <div className="flex gap-2 p-4 border-t bg-gray-50">
          <button 
            onClick={handleDownload}
            className="flex items-center gap-2 bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 transition-colors"
          >
            <Download className="w-4 h-4" />
            Download Image
          </button>
          
          {navigator.share && (
            <button 
              onClick={handleShare}
              className="flex items-center gap-2 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
            >
              <Share className="w-4 h-4" />
              Share Image
            </button>
          )}
          
          <button 
            onClick={onClose}
            className="flex items-center gap-2 bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShareImagePreview;
