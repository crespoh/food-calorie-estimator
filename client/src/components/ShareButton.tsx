import React, { useState, useEffect } from 'react';
import { Share2, Twitter, MessageCircle, Link, Copy, Check, Download, Eye } from 'lucide-react';
import { useAuth } from '../AuthContext';
import { supabase } from '../supabaseClient';
import ShareImagePreview from './ShareImagePreview';

interface ShareButtonProps {
  result: {
    foodItems: string[];
    totalCalories: number;
    nutritionFacts?: {
      protein_g?: number;
      fat_g?: number;
      carbohydrates_g?: number;
      [key: string]: number | undefined;
    };
    servingSize?: string;
    confidenceScore?: number;
    explanation: string;
    is_public?: boolean;
  };
  resultId?: string;
  onPublicStatusChange?: (isPublic: boolean) => void;
}

const ShareButton: React.FC<ShareButtonProps> = ({ result, resultId, onPublicStatusChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isPublic, setIsPublic] = useState(false);
  const [updatingPublic, setUpdatingPublic] = useState(false);
  const [showPublicStatus, setShowPublicStatus] = useState(false);
  const [shareImageUrl, setShareImageUrl] = useState<string | null>(null);
  const [generatingImage, setGeneratingImage] = useState(false);
  const [showImagePreview, setShowImagePreview] = useState(false);
  const { user } = useAuth();

  // Sync isPublic state with result.is_public
  useEffect(() => {
    if (result && typeof result.is_public === 'boolean') {
      console.log('🔄 ShareButton: Syncing isPublic state with result.is_public:', result.is_public);
      setIsPublic(result.is_public);
    }
  }, [result?.is_public]);

  // Construct share text
  const foodItemsText = result.foodItems.join(', ');
  const shareText = `🍽️ Just analyzed my food with AI! Found ${foodItemsText} - ${result.totalCalories} calories total. Check out this amazing CaloriTrack app!`;
  
  // Create shareable link (for public result viewing)
  const shareableLink = resultId && isPublic
    ? `${window.location.origin}/result/${resultId}`
    : window.location.origin;

  // Generate share image
  const generateShareImage = async (platform: string = 'default') => {
    if (!resultId) return null;
    
    setGeneratingImage(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      
      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const response = await fetch(`${apiBase}/generate-share-image`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
        },
        body: JSON.stringify({
          resultId,
          platform,
        }),
      });
      
      const data = await response.json();
      if (data.success) {
        setShareImageUrl(data.imageUrl);
        return data.imageUrl;
      }
    } catch (error) {
      console.error('Failed to generate share image:', error);
    } finally {
      setGeneratingImage(false);
    }
    return null;
  };

  // Enhanced share handlers with image generation
  const handleTwitterShare = async () => {
    console.log('🐦 Twitter share clicked, isPublic:', isPublic, 'result.is_public:', result.is_public);
    if (!isPublic) {
      alert('Please make this result public before sharing');
      return;
    }
    
    const imageUrl = await generateShareImage('twitter');
    const ogUrl = `${import.meta.env.VITE_API_URL?.replace('/api', '')}/og/${resultId}`;
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(ogUrl)}`;
    window.open(twitterUrl, '_blank');
    logShareEvent('twitter');
    setIsOpen(false);
  };

  const handleRedditShare = async () => {
    console.log('🔴 Reddit share clicked, isPublic:', isPublic, 'result.is_public:', result.is_public);
    if (!isPublic) {
      alert('Please make this result public before sharing');
      return;
    }
    
    const imageUrl = await generateShareImage('reddit');
    const ogUrl = `${import.meta.env.VITE_API_URL?.replace('/api', '')}/og/${resultId}`;
    const redditUrl = `https://reddit.com/submit?url=${encodeURIComponent(ogUrl)}&title=${encodeURIComponent(shareText)}`;
    window.open(redditUrl, '_blank');
    logShareEvent('reddit');
    setIsOpen(false);
  };

  const handleDownloadImage = async () => {
    const imageUrl = await generateShareImage('download');
    if (imageUrl) {
      const link = document.createElement('a');
      link.href = imageUrl;
      link.download = `caloritrack-analysis-${resultId}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        const imageUrl = await generateShareImage('native');
        const shareData: any = {
          title: 'CaloriTrack Analysis',
          text: shareText,
          url: `${import.meta.env.VITE_API_URL?.replace('/api', '')}/og/${resultId}`,
        };
        
        // Add image file if supported and available
        if (imageUrl && navigator.canShare && navigator.canShare({ files: [] })) {
          try {
            const imageResponse = await fetch(imageUrl);
            const imageBlob = await imageResponse.blob();
            const imageFile = new File([imageBlob], 'caloritrack-analysis.png', { type: 'image/png' });
            shareData.files = [imageFile];
          } catch (error) {
            console.log('Failed to add image to native share:', error);
          }
        }
        
        await navigator.share(shareData);
        logShareEvent('native');
      } catch (error) {
        console.error('Native share failed:', error);
      }
    } else {
      // Fallback to copy link
      handleCopyLink();
    }
  };

  // Log share event to Supabase
  const logShareEvent = async (platform: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      
      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      await fetch(`${apiBase}/share-event`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
        },
        body: JSON.stringify({
          platform,
          resultId: resultId || null,
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString()
        }),
      });
    } catch (error) {
      console.error('Failed to log share event:', error);
    }
  };



  // Handle Threads sharing (copy link for now)
  const handleThreadsShare = () => {
    const threadsText = `${shareText}\n\nCheck it out: ${shareableLink}`;
    navigator.clipboard.writeText(threadsText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    logShareEvent('threads');
    setIsOpen(false);
  };

  // Handle copy link
  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareableLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    logShareEvent('copy_link');
    setIsOpen(false);
  };

  // Handle making result public/private
  const handleTogglePublic = async () => {
    if (!resultId || !user) return;
    
    setUpdatingPublic(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      
      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const response = await fetch(`${apiBase}/result/${resultId}/public`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
        },
        body: JSON.stringify({ isPublic: !isPublic }),
      });
      
      if (response.ok) {
        const newPublicStatus = !isPublic;
        setIsPublic(newPublicStatus);
        setShowPublicStatus(true);
        setTimeout(() => setShowPublicStatus(false), 3000);
        console.log(`✅ Result ${newPublicStatus ? 'made public' : 'made private'} successfully`);
        
        // Notify parent component of the change
        if (onPublicStatusChange) {
          onPublicStatusChange(newPublicStatus);
        }
      } else {
        console.error('❌ Failed to update result visibility');
      }
    } catch (error) {
      console.error('❌ Error updating result visibility:', error);
    } finally {
      setUpdatingPublic(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex-1 bg-purple-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-purple-700 transition-colors duration-200 flex items-center justify-center gap-2"
      >
        <Share2 className="w-4 h-4" />
        Share
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown Menu */}
          <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-20 py-2">
            {/* Native Share (Mobile) */}
            <button
              onClick={handleNativeShare}
              disabled={generatingImage}
              className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-3 text-sm disabled:opacity-50"
            >
              <Share2 className="w-4 h-4 text-blue-600" />
              {generatingImage ? 'Generating...' : (typeof navigator.share === 'function' ? 'Share...' : 'Copy Link')}
            </button>

            {/* Twitter */}
            <button
              onClick={handleTwitterShare}
              disabled={generatingImage}
              className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-3 text-sm disabled:opacity-50"
            >
              <Twitter className="w-4 h-4 text-blue-400" />
              {generatingImage ? 'Generating...' : 'Share on Twitter'}
            </button>

            {/* Reddit */}
            <button
              onClick={handleRedditShare}
              disabled={generatingImage}
              className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-3 text-sm disabled:opacity-50"
            >
              <div className="w-4 h-4 bg-orange-500 rounded-sm flex items-center justify-center">
                <span className="text-white text-xs font-bold">R</span>
              </div>
              {generatingImage ? 'Generating...' : 'Share on Reddit'}
            </button>

            {/* Download Share Image */}
            <button
              onClick={handleDownloadImage}
              disabled={generatingImage}
              className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-3 text-sm disabled:opacity-50"
            >
              <Download className="w-4 h-4 text-green-600" />
              {generatingImage ? 'Generating...' : 'Download Share Image'}
            </button>

            {/* Preview Share Image */}
            <button
              onClick={() => {
                generateShareImage('preview');
                setShowImagePreview(true);
              }}
              disabled={generatingImage}
              className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-3 text-sm disabled:opacity-50"
            >
              <Eye className="w-4 h-4 text-purple-600" />
              {generatingImage ? 'Generating...' : 'Preview Share Image'}
            </button>

            {/* Threads */}
            <button
              onClick={handleThreadsShare}
              className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-3 text-sm"
            >
              <MessageCircle className="w-4 h-4 text-black" />
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-green-600" />
                  Copied!
                </>
              ) : (
                'Copy for Threads'
              )}
            </button>

            {/* Copy Link */}
            <button
              onClick={handleCopyLink}
              className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-3 text-sm"
            >
              <Link className="w-4 h-4 text-gray-600" />
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-green-600" />
                  Copied!
                </>
              ) : (
                'Copy Link'
              )}
            </button>

            {/* Make Public Toggle */}
            {resultId && user && (
              <div className="border-t border-gray-100 pt-2 mt-2">
                <button
                  onClick={handleTogglePublic}
                  disabled={updatingPublic}
                  className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-3 text-sm disabled:opacity-50"
                >
                  <div className={`w-4 h-4 rounded-sm flex items-center justify-center ${isPublic ? 'bg-red-500' : 'bg-green-500'}`}>
                    <span className="text-white text-xs font-bold">{isPublic ? 'P' : 'P'}</span>
                  </div>
                  {updatingPublic ? (
                    `${isPublic ? 'Making Private...' : 'Making Public...'}`
                  ) : isPublic ? (
                    <>
                      <Check className="w-4 h-4 text-green-600" />
                      Make Private
                    </>
                  ) : (
                    'Make Public Link'
                  )}
                </button>
                {showPublicStatus && (
                  <div className="px-4 py-2 mt-2 text-xs bg-green-50 border border-green-200 rounded text-green-700">
                    {isPublic ? '✅ Result is now public and shareable!' : '🔒 Result is now private'}
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}

      {/* Image Preview Modal */}
      {showImagePreview && shareImageUrl && (
        <ShareImagePreview 
          imageUrl={shareImageUrl} 
          onClose={() => setShowImagePreview(false)} 
        />
      )}
    </div>
  );
};

export default ShareButton; 