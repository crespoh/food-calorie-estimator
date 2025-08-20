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
  const [generatingDownloadImage, setGeneratingDownloadImage] = useState(false);
  const [generatingPreviewImage, setGeneratingPreviewImage] = useState(false);
  const [showImagePreview, setShowImagePreview] = useState(false);
  const [imageGenerationError, setImageGenerationError] = useState<string | null>(null);
  const [imageGenerationProgress, setImageGenerationProgress] = useState<string>('');
  const { user } = useAuth();

  // Mobile detection utility
  const isMobileDevice = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  };

  // Mobile-specific social sharing
  const openSocialApp = (platform: 'twitter' | 'reddit', url: string, text: string) => {
    const isMobile = isMobileDevice();
    console.log('📱 Device type:', isMobile ? 'Mobile' : 'Desktop');
    
    if (isMobile) {
      try {
        let appUrl: string;
        if (platform === 'twitter') {
          appUrl = `twitter://post?message=${encodeURIComponent(text + ' ' + url)}`;
        } else {
          appUrl = `reddit://submit?url=${encodeURIComponent(url)}&title=${encodeURIComponent(text)}`;
        }
        
        window.location.href = appUrl;
        
        // Fallback to web if app doesn't open
        setTimeout(() => {
          window.location.href = url;
        }, 1000);
      } catch (error) {
        console.log(`📱 ${platform} app not available, using web fallback`);
        window.location.href = url;
      }
    } else {
      // Desktop: use window.open
      window.open(url, '_blank');
    }
  };

  // Debug logging for props (only log when props change)
  useEffect(() => {
    console.log('🔍 ShareButton props updated:', { resultId, hasResult: !!result, user: !!user });
  }, [resultId, result, user]);

  // Sync isPublic state with result.is_public
  useEffect(() => {
    console.log('🔄 ShareButton useEffect triggered, result.is_public:', result?.is_public);
    if (result && typeof result.is_public === 'boolean') {
      console.log('🔄 ShareButton: Syncing isPublic state with result.is_public:', result.is_public);
      setIsPublic(result.is_public);
    } else {
      console.log('⚠️ ShareButton: Cannot sync isPublic, result:', result, 'result.is_public:', result?.is_public);
    }
  }, [result?.is_public]);

  // Construct share text
  const foodItemsText = result.foodItems.join(', ');
  const shareText = `🍽️ Just analyzed my food with AI! Found ${foodItemsText} - ${result.totalCalories} calories total. Check out this amazing CaloriTrack app!`;
  
  // Create shareable link (for public result viewing)
  // Use custom domain for user-facing links
  const customDomain = 'https://calorie.codedcheese.com';
  const shareableLink = resultId && isPublic
    ? `${customDomain}/result/${resultId}`
    : customDomain;
    
  // Use Railway URL for OG endpoints (social media crawlers)
  const ogBaseUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || 'https://caloritrack-production.up.railway.app';

  // Generate share image (legacy function for backward compatibility)
  const generateShareImage = async (platform: string = 'default', setLoadingState?: (loading: boolean) => void) => {
    return generateShareImageWithTimeout(platform, setLoadingState);
  };

  // Generate share image with timeout and better error handling
  const generateShareImageWithTimeout = async (platform: string = 'default', setLoadingState?: (loading: boolean) => void) => {
    if (!resultId) {
      console.log('❌ No resultId provided for image generation');
      return null;
    }
    
    const timeoutMs = 30000; // 30 second timeout (increased from 15s)
    setImageGenerationError(null);
    setImageGenerationProgress('Starting image generation...');
    console.log('🖼️ Starting image generation for platform:', platform, 'resultId:', resultId);
    
    if (setLoadingState) {
      setLoadingState(true);
    } else {
      setGeneratingImage(true);
    }
    
    try {
      console.log('🔑 Getting Supabase session...');
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      console.log('🔑 Session obtained, accessToken exists:', !!accessToken);
      
      setImageGenerationProgress('Creating image...');
      console.log('🌐 Preparing API request...');
      
      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      console.log('🌐 API Base URL:', apiBase);
      
      // Create a timeout promise with progress updates
      const timeoutPromise = new Promise((_, reject) => {
        const startTime = Date.now();
        const progressInterval = setInterval(() => {
          const elapsed = Date.now() - startTime;
          const remaining = timeoutMs - elapsed;
          if (remaining > 0) {
            setImageGenerationProgress(`Creating image... (${Math.ceil(remaining / 1000)}s remaining)`);
          }
        }, 1000);
        
        setTimeout(() => {
          clearInterval(progressInterval);
          console.log('⏰ Image generation timed out after', timeoutMs, 'ms');
          reject(new Error(`Image generation timed out after ${timeoutMs / 1000} seconds`));
        }, timeoutMs);
      });
      
      // Use new v2 endpoint
      const variant = platform === 'twitter' ? 'photo' : 'light';
      const imageUrl = `${apiBase.replace('/api', '')}/og/food/${resultId}.png?variant=${variant}`;
      
      console.log('🚀 Using v2 endpoint:', imageUrl);
      
      // Simple fetch to trigger image generation
      const fetchPromise = fetch(imageUrl, {
        method: 'GET',
        headers: {
          ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
        },
      });
      
      console.log('🚀 Starting fetch request...');
      // Race between fetch and timeout
      const response = await Promise.race([fetchPromise, timeoutPromise]) as Response;
      console.log('📥 Response received, status:', response.status, 'ok:', response.ok);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Server error response:', errorText);
        throw new Error(`Server error: ${response.status} - ${errorText}`);
      }
      
      setImageGenerationProgress('Image ready!');
      console.log('✅ Image generation successful, URL:', imageUrl);
      setShareImageUrl(imageUrl);
      return imageUrl;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('❌ Failed to generate share image:', error);
      console.error('❌ Error details:', {
        message: errorMessage,
        stack: error instanceof Error ? error.stack : 'No stack trace',
        error: error
      });
      setImageGenerationError(errorMessage);
      throw error;
    } finally {
      console.log('🧹 Cleaning up image generation state...');
      if (setLoadingState) {
        setLoadingState(false);
      } else {
        setGeneratingImage(false);
      }
      setImageGenerationProgress('');
    }
  };

  // Enhanced share handlers with image generation
  const handleTwitterShare = async () => {
    console.log('🐦 Twitter share clicked, isPublic:', isPublic, 'result.is_public:', result.is_public);
    console.log('🔍 Twitter share - resultId:', resultId, 'type:', typeof resultId);
    
    if (!resultId) {
      console.error('❌ No resultId provided for Twitter share');
      setImageGenerationError('No result ID available for sharing');
      return;
    }
    
    // Check if user is anonymous (not logged in)
    if (!user) {
      alert('Anonymous results cannot be shared publicly. Please sign in to share your analysis.');
      return;
    }
    
    if (!isPublic) {
      alert('Please make this result public before sharing');
      return;
    }
    
    // For Twitter sharing, we need to ensure the image is generated first
    // so Twitter can see it when crawling the URL
    setGeneratingImage(true);
    setImageGenerationError(null);
    console.log('🔄 Starting Twitter share process...');
    
    try {
      console.log('🖼️ Attempting to generate image for Twitter...');
      // Generate the image first to ensure it's available for Twitter
      const imageUrl = await generateShareImageWithTimeout('twitter');
      console.log('✅ Image generated successfully:', imageUrl);
      
      // Small delay to ensure the image is fully uploaded and accessible
      setImageGenerationProgress('Finalizing...');
      console.log('⏳ Waiting for image to be fully accessible...');
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Now open Twitter with the URL that has the image ready
      const ogUrl = `${ogBaseUrl}/og/${resultId}`;
      const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(ogUrl)}`;
      console.log('🌐 Opening Twitter with URL:', ogUrl);
      console.log('🐦 Twitter intent URL:', twitterUrl);
      
      // Use mobile-specific sharing utility
      openSocialApp('twitter', twitterUrl, shareText);
      
      logShareEvent('twitter');
      setIsOpen(false);
      console.log('✅ Twitter share completed successfully');
    } catch (error) {
      console.error('❌ Failed to generate Twitter share image:', error);
      console.error('❌ Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack trace',
        error: error
      });
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setImageGenerationError(`Image generation failed: ${errorMessage}`);
      
      // Show error message briefly, then open Twitter
      console.log('🔄 Falling back to Twitter without image...');
      setTimeout(() => {
        const ogUrl = `${ogBaseUrl}/og/${resultId}`;
        const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(ogUrl)}`;
        console.log('🌐 Fallback: Opening Twitter with URL:', ogUrl);
        
        // Use mobile-specific sharing utility
        openSocialApp('twitter', twitterUrl, shareText);
        
        logShareEvent('twitter');
        setIsOpen(false);
        setImageGenerationError(null);
        console.log('✅ Twitter share completed with fallback');
      }, 2000);
    } finally {
      console.log('🧹 Cleaning up Twitter share state...');
      setGeneratingImage(false);
      setImageGenerationProgress('');
    }
  };

  const handleRedditShare = async () => {
    console.log('🔴 Reddit share clicked, isPublic:', isPublic, 'result.is_public:', result.is_public);
    
    // Check if user is anonymous (not logged in)
    if (!user) {
      alert('Anonymous results cannot be shared publicly. Please sign in to share your analysis.');
      return;
    }
    
    if (!isPublic) {
      alert('Please make this result public before sharing');
      return;
    }
    
    // For Reddit sharing, we need to ensure the image is generated first
    // so Reddit can see it when crawling the URL
    setGeneratingImage(true);
    setImageGenerationError(null);
    
    try {
      // Generate the image first to ensure it's available for Reddit
      await generateShareImageWithTimeout('reddit');
      
      // Small delay to ensure the image is fully uploaded and accessible
      setImageGenerationProgress('Finalizing...');
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Now open Reddit with the URL that has the image ready
      const ogUrl = `${ogBaseUrl}/og/${resultId}`;
      const redditUrl = `https://reddit.com/submit?url=${encodeURIComponent(ogUrl)}&title=${encodeURIComponent(shareText)}`;
      
      // Use mobile-specific sharing utility
      openSocialApp('reddit', redditUrl, shareText);
      
      logShareEvent('reddit');
      setIsOpen(false);
    } catch (error) {
      console.error('Failed to generate Reddit share image:', error);
      setImageGenerationError('Image generation failed, but you can still share!');
      
              // Show error message briefly, then open Reddit
        setTimeout(() => {
          const ogUrl = `${ogBaseUrl}/og/${resultId}`;
          const redditUrl = `https://reddit.com/submit?url=${encodeURIComponent(ogUrl)}&title=${encodeURIComponent(shareText)}`;
        window.open(redditUrl, '_blank');
        logShareEvent('reddit');
        setIsOpen(false);
        setImageGenerationError(null);
      }, 2000);
    } finally {
      setGeneratingImage(false);
      setImageGenerationProgress('');
    }
  };

  const handleDownloadImage = async () => {
    const imageUrl = await generateShareImage('download', setGeneratingDownloadImage);
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
    // Check if user is anonymous (not logged in)
    if (!user) {
      alert('Anonymous results cannot be shared publicly. Please sign in to share your analysis.');
      return;
    }
    
    if (navigator.share) {
      try {
        const shareData: any = {
          title: 'CaloriTrack Analysis',
          text: shareText,
          url: `${ogBaseUrl}/og/${resultId}`,
        };
        
        // Try to add image file if supported and available
        // Generate image in background and add if successful
        generateShareImage('native').then(imageUrl => {
          if (imageUrl && navigator.canShare && navigator.canShare({ files: [] })) {
            try {
              fetch(imageUrl).then(imageResponse => {
                imageResponse.blob().then(imageBlob => {
                  const imageFile = new File([imageBlob], 'caloritrack-analysis.png', { type: 'image/png' });
                  shareData.files = [imageFile];
                  // Re-trigger share with image
                  navigator.share(shareData).catch(error => {
                    console.log('Failed to share with image:', error);
                  });
                });
              });
            } catch (error) {
              console.log('Failed to add image to native share:', error);
            }
          }
        }).catch(error => {
          console.log('Failed to generate image for native share:', error);
        });
        
        // Share immediately without waiting for image
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
        className="flex-1 bg-purple-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-purple-700 transition-colors duration-200 flex items-center justify-center gap-2 min-w-[100px]"
      >
        <Share2 className="w-4 h-4 flex-shrink-0" />
        <span className="whitespace-nowrap">Share</span>
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown Menu */}
          <div className="absolute top-full left-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-20 py-2 min-w-[280px] max-w-[320px] sm:min-w-[300px] sm:max-w-[350px]">
            {/* Native Share (Mobile) */}
            <button
              onClick={handleNativeShare}
              disabled={!user}
              className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center gap-3 text-sm whitespace-nowrap disabled:opacity-50"
            >
              <Share2 className="w-5 h-5 text-blue-600 flex-shrink-0" />
              <span className="truncate">
                {!user ? 'Sign in to share' : (typeof navigator.share === 'function' ? 'Share...' : 'Copy Link')}
              </span>
            </button>

            {/* Twitter */}
            <button
              onClick={handleTwitterShare}
              disabled={generatingImage || !user}
              className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center gap-3 text-sm disabled:opacity-50 whitespace-nowrap"
            >
              <Twitter className="w-5 h-5 text-blue-400 flex-shrink-0" />
              <span className="truncate">
                {!user ? 'Sign in to share' : (generatingImage ? (imageGenerationProgress || 'Generating...') : 'Share on Twitter')}
              </span>
            </button>

            {/* Reddit */}
            <button
              onClick={handleRedditShare}
              disabled={generatingImage || !user}
              className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center gap-3 text-sm disabled:opacity-50 whitespace-nowrap"
            >
              <div className="w-5 h-5 bg-orange-500 rounded-sm flex items-center justify-center flex-shrink-0">
                <span className="text-white text-xs font-bold">R</span>
              </div>
              <span className="truncate">
                {!user ? 'Sign in to share' : (generatingImage ? (imageGenerationProgress || 'Generating...') : 'Share on Reddit')}
              </span>
            </button>

            {/* Download Share Image */}
            <button
              onClick={handleDownloadImage}
              disabled={generatingDownloadImage}
              className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center gap-3 text-sm disabled:opacity-50 whitespace-nowrap"
            >
              <Download className="w-5 h-5 text-green-600 flex-shrink-0" />
              <span className="truncate">{generatingDownloadImage ? 'Generating...' : 'Download Share Image'}</span>
            </button>

            {/* Preview Share Image */}
            <button
              onClick={() => {
                generateShareImage('preview', setGeneratingPreviewImage).then(() => {
                  setShowImagePreview(true);
                });
              }}
              disabled={generatingPreviewImage}
              className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center gap-3 text-sm disabled:opacity-50 whitespace-nowrap"
            >
              <Eye className="w-5 h-5 text-purple-600 flex-shrink-0" />
              <span className="truncate">{generatingPreviewImage ? 'Generating...' : 'Preview Share Image'}</span>
            </button>

            {/* Threads */}
            <button
              onClick={handleThreadsShare}
              className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center gap-3 text-sm whitespace-nowrap"
            >
              <MessageCircle className="w-5 h-5 text-black flex-shrink-0" />
              <span className="truncate">
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-green-600 inline mr-1" />
                    Copied!
                  </>
                ) : (
                  'Copy for Threads'
                )}
              </span>
            </button>

            {/* Copy Link */}
            <button
              onClick={handleCopyLink}
              className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center gap-3 text-sm whitespace-nowrap"
            >
              <Link className="w-5 h-5 text-gray-600 flex-shrink-0" />
              <span className="truncate">
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-green-600 inline mr-1" />
                    Copied!
                  </>
                ) : (
                  'Copy Link'
                )}
              </span>
            </button>

            {/* Anonymous User Notice */}
            {!user && (
              <div className="px-4 py-3 mt-2 mx-2 text-xs bg-blue-50 border border-blue-200 rounded text-blue-700">
                <div className="flex items-start gap-2">
                  <span className="text-blue-600 mt-0.5">ℹ️</span>
                  <div className="flex-1">
                    <p className="text-blue-700">
                      <strong>Anonymous Analysis:</strong> To share your results publicly, please sign in to your account.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Error Display */}
            {imageGenerationError && (
              <div className="px-4 py-3 mt-2 mx-2 text-xs bg-yellow-50 border border-yellow-200 rounded text-yellow-700">
                <div className="flex items-start gap-2">
                  <span className="text-yellow-600 mt-0.5">⚠️</span>
                  <div className="flex-1">
                    <p className="text-yellow-700">{imageGenerationError}</p>
                    <button
                      onClick={() => {
                                              const ogUrl = `${ogBaseUrl}/og/${resultId}`;
                      const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(ogUrl)}`;
                        
                        // Use mobile-specific sharing utility
                        openSocialApp('twitter', twitterUrl, shareText);
                        
                        logShareEvent('twitter');
                        setIsOpen(false);
                        setImageGenerationError(null);
                      }}
                      className="text-blue-600 hover:text-blue-800 underline text-xs mt-1 inline-block"
                    >
                      Share Now (without image)
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Make Public Toggle */}
            {resultId && user && (
              <div className="border-t border-gray-100 pt-2 mt-2">
                <button
                  onClick={handleTogglePublic}
                  disabled={updatingPublic}
                  className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center gap-3 text-sm disabled:opacity-50 whitespace-nowrap"
                >
                  <div className={`w-5 h-5 rounded-sm flex items-center justify-center flex-shrink-0 ${isPublic ? 'bg-red-500' : 'bg-green-500'}`}>
                    <span className="text-white text-xs font-bold">{isPublic ? 'P' : 'P'}</span>
                  </div>
                  <span className="truncate">
                    {updatingPublic ? (
                      `${isPublic ? 'Making Private...' : 'Making Public...'}`
                    ) : isPublic ? (
                      <>
                        <Check className="w-4 h-4 text-green-600 inline mr-1" />
                        Make Private
                      </>
                    ) : (
                      'Make Public Link'
                    )}
                  </span>
                </button>
                {showPublicStatus && (
                  <div className="px-4 py-3 mt-2 mx-2 text-xs bg-green-50 border border-green-200 rounded text-green-700">
                    <div className="flex items-center gap-2">
                      <span className="text-green-600">✅</span>
                      <span className="text-green-700">
                        {isPublic ? 'Result is now public and shareable!' : 'Result is now private'}
                      </span>
                    </div>
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