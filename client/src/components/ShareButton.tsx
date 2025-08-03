import React, { useState } from 'react';
import { Share2, Twitter, MessageCircle, Link, Copy, Check } from 'lucide-react';
import { useAuth } from '../AuthContext';
import { supabase } from '../supabaseClient';

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
  };
  resultId?: string;
}

const ShareButton: React.FC<ShareButtonProps> = ({ result, resultId }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isPublic, setIsPublic] = useState(false);
  const [updatingPublic, setUpdatingPublic] = useState(false);
  const { user } = useAuth();

  // Construct share text
  const foodItemsText = result.foodItems.join(', ');
  const shareText = `🍽️ Just analyzed my food with AI! Found ${foodItemsText} - ${result.totalCalories} calories total. Check out this amazing food calorie estimator!`;
  
  // Create shareable link (for public result viewing)
  const shareableLink = resultId && isPublic
    ? `${window.location.origin}/result/${resultId}`
    : window.location.origin;

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

  // Handle Web Share API (mobile native sharing)
  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Food Calorie Analysis',
          text: shareText,
          url: shareableLink,
        });
        logShareEvent('native');
      } catch (error) {
        console.error('Native share failed:', error);
      }
    } else {
      // Fallback to copy link
      handleCopyLink();
    }
  };

  // Handle Twitter sharing
  const handleTwitterShare = () => {
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareableLink)}`;
    window.open(twitterUrl, '_blank');
    logShareEvent('twitter');
    setIsOpen(false);
  };

  // Handle Reddit sharing
  const handleRedditShare = () => {
    const title = `Food Calorie Analysis: ${result.foodItems.slice(0, 2).join(', ')} - ${result.totalCalories} calories`;
    const redditUrl = `https://www.reddit.com/submit?title=${encodeURIComponent(title)}&text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareableLink)}`;
    window.open(redditUrl, '_blank');
    logShareEvent('reddit');
    setIsOpen(false);
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

  // Handle making result public
  const handleMakePublic = async () => {
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
        body: JSON.stringify({ isPublic: true }),
      });
      
      if (response.ok) {
        setIsPublic(true);
        console.log('✅ Result made public successfully');
      } else {
        console.error('❌ Failed to make result public');
      }
    } catch (error) {
      console.error('❌ Error making result public:', error);
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
              className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-3 text-sm"
            >
              <Share2 className="w-4 h-4 text-blue-600" />
              {typeof navigator.share === 'function' ? 'Share...' : 'Copy Link'}
            </button>

            {/* Twitter */}
            <button
              onClick={handleTwitterShare}
              className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-3 text-sm"
            >
              <Twitter className="w-4 h-4 text-blue-400" />
              Share on Twitter
            </button>

            {/* Reddit */}
            <button
              onClick={handleRedditShare}
              className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-3 text-sm"
            >
              <div className="w-4 h-4 bg-orange-500 rounded-sm flex items-center justify-center">
                <span className="text-white text-xs font-bold">R</span>
              </div>
              Share on Reddit
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
                  onClick={handleMakePublic}
                  disabled={updatingPublic || isPublic}
                  className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-3 text-sm disabled:opacity-50"
                >
                  <div className="w-4 h-4 bg-green-500 rounded-sm flex items-center justify-center">
                    <span className="text-white text-xs font-bold">P</span>
                  </div>
                  {updatingPublic ? (
                    'Making Public...'
                  ) : isPublic ? (
                    <>
                      <Check className="w-4 h-4 text-green-600" />
                      Public Link Ready
                    </>
                  ) : (
                    'Make Public Link'
                  )}
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default ShareButton; 