import React, { useState, useRef, useEffect } from 'react';
import { Upload, Camera, Loader2, AlertCircle, CheckCircle, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import html2canvas from 'html2canvas';
import { useAuth } from '../AuthContext';
import { supabase } from '../supabaseClient';
import AuthForm from './AuthForm';
import History from './History';

interface AnalysisResult {
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
}

interface ApiResponse {
  success: boolean;
  result: AnalysisResult;
  resultId?: string; // Add this to store the database ID of the result
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  dailyUsage?: {
    current: number;
    max: number;
    remaining: number;
  };
  error?: string;
  type?: string;
}

interface CalorieResult {
  id: string;
  created_at: string;
  food_items: string[];
  total_calories: number;
  explanation: string;
  nutrition_table?: {
    protein_g?: number;
    fat_g?: number;
    carbohydrates_g?: number;
    [key: string]: number | undefined;
  };
  image_url?: string;
}

interface ImageHistoryProps {
  images: string[];
  onSelect: (img: string) => void;
}

const ImageHistory: React.FC<ImageHistoryProps> = ({ images, onSelect }) => (
  <div className="mt-4">
    <h3 className="text-sm font-medium text-gray-700 mb-2">Recent Images</h3>
    <div className="flex gap-2 overflow-x-auto pb-2">
      {images.map((img, index) => (
        <button
          key={index}
          onClick={() => onSelect(img)}
          className="flex-shrink-0 w-16 h-16 rounded-lg border-2 border-gray-200 hover:border-emerald-400 transition-colors overflow-hidden"
        >
          <img src={img} alt={`History ${index + 1}`} className="w-full h-full object-cover" />
        </button>
      ))}
    </div>
  </div>
);

interface FeedbackProps {
  imageId: string;
  result: AnalysisResult;
  calorieResultId?: string; // Add this to store the actual result ID
}

const Feedback: React.FC<FeedbackProps> = ({ imageId, result, calorieResultId }) => {
  const { user } = useAuth(); // Add this to get user context
  const [feedback, setFeedback] = useState<'yes' | 'no' | null>(() => {
    // Check if feedback already exists for this imageId
    const existingFeedback = JSON.parse(localStorage.getItem('feedback') || '[]');
    const existing = existingFeedback.find((fb: any) => fb.imageId === imageId);
    return existing ? existing.feedback : null;
  });
  const [showThankYou, setShowThankYou] = useState(false);

  const sendFeedback = async (feedbackObj: any) => {
    try {
      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      
      // Get access token for authenticated requests
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      // Add Authorization header if user is authenticated
      if (user && accessToken) {
        headers.Authorization = `Bearer ${accessToken}`;
      }
      
      const response = await fetch(`${apiBase}/feedback`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          calorieResultId: calorieResultId || null, // Use actual result ID if available
          imageId: feedbackObj.imageId,
          feedback: feedbackObj.feedback,
          rating: feedbackObj.feedback === 'yes' ? 5 : 1
        }),
      });
      
      if (response.ok) {
        console.log('✅ Feedback sent successfully to backend');
        const responseData = await response.json();
        console.log('📊 Backend response:', responseData);
      } else {
        const errorData = await response.json();
        console.error('❌ Failed to send feedback:', errorData);
      }
    } catch (error) {
      console.error('❌ Error sending feedback:', error);
    }
  };

  console.log('Feedback component - imageId:', imageId, 'calorieResultId:', calorieResultId, 'current feedback:', feedback);

  const handleFeedback = (feedbackValue: 'yes' | 'no') => {
    if (feedback !== null) return; // Prevent multiple votes
    
    setFeedback(feedbackValue);
    setShowThankYou(true);
    
    const feedbackObj = {
      imageId,
      timestamp: new Date().toISOString(),
      response: result,
      feedback: feedbackValue
    };
    
    console.log('🔄 Submitting feedback:', {
      imageId,
      calorieResultId,
      feedback: feedbackValue,
      user: user?.id || 'anonymous',
      hasCalorieResultId: !!calorieResultId,
      calorieResultIdType: typeof calorieResultId
    });
    
    // Save to localStorage (for backward compatibility)
    const existingFeedback = JSON.parse(localStorage.getItem('feedback') || '[]');
    existingFeedback.push(feedbackObj);
    localStorage.setItem('feedback', JSON.stringify(existingFeedback));
    
    // Send to backend
    sendFeedback(feedbackObj);
    
    setTimeout(() => setShowThankYou(false), 3000);
  };

  if (showThankYou) {
    return (
      <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-800 text-center">
        Thank you for your feedback!
      </div>
    );
  }

  if (feedback !== null) {
    return (
      <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-600 text-center">
        Feedback submitted
      </div>
    );
  }

  return (
    <div className="mt-4">
      <p className="text-sm text-gray-600 mb-2">Was this accurate?</p>
      <div className="flex gap-2">
        <button
          onClick={() => handleFeedback('yes')}
          className="flex-1 bg-green-100 text-green-700 py-2 px-4 rounded-lg font-medium hover:bg-green-200 transition-colors"
        >
          👍 Yes
        </button>
        <button
          onClick={() => handleFeedback('no')}
          className="flex-1 bg-red-100 text-red-700 py-2 px-4 rounded-lg font-medium hover:bg-red-200 transition-colors"
        >
          👎 No
        </button>
      </div>
    </div>
  );
};

function dataURLtoFile(dataUrl: string, filename: string): File {
  const arr = dataUrl.split(',');
  const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/png';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], filename, { type: mime });
}

function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  // Convert to positive string and add prefix to ensure it's always a string
  return `img_${Math.abs(hash)}`;
}

const UnifiedScreen: React.FC = () => {
  const { user, loading: authLoading, loginWithGoogle, logout } = useAuth();
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState<string | null>(null);
  const [imageHistory, setImageHistory] = useState<string[]>([]);
  const [isFallback, setIsFallback] = useState(false);
  const [dailyUsage, setDailyUsage] = useState<{ current: number; max: number; remaining: number } | null>(null);
  const [historyRefreshTrigger, setHistoryRefreshTrigger] = useState(0);
  const [currentResultId, setCurrentResultId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Add session state for access token
  const [accessToken, setAccessToken] = useState<string | null>(null);
  useEffect(() => {
    const getToken = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setAccessToken(session?.access_token || null);
    };
    getToken();
  }, [user]);

  // Fetch daily usage when user logs in
  useEffect(() => {
    const fetchDailyUsage = async () => {
      if (!user || !accessToken) return;
      
      try {
        const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3000';
        const response = await fetch(`${apiBase}/user-usage`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });
        
        const data = await response.json();
        if (data.success && data.usage) {
          setDailyUsage(data.usage);
        }
      } catch (error) {
        console.error('Failed to fetch daily usage:', error);
      }
    };

    fetchDailyUsage();
  }, [user, accessToken]);

  // Helper to update localStorage and state
  const updateImageHistory = (newImg: string) => {
    console.log('🖼️ Updating image history with new image');
    const existing = JSON.parse(localStorage.getItem('imageHistory') || '[]');
    console.log('📋 Existing history:', existing.length, 'images');
    const updated = [newImg, ...existing.filter((img: string) => img !== newImg)].slice(0, 3);
    console.log('📋 Updated history:', updated.length, 'images');
    localStorage.setItem('imageHistory', JSON.stringify(updated));
    setImageHistory(updated);
  };

  const handleImageSelect = (file: File) => {
    console.log('📁 Image selected:', file.name, file.size, 'bytes');
    
    setSelectedImage(file);
    setResult(null);
    setError(null);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const imgUrl = e.target?.result as string;
      console.log('🖼️ Image loaded, URL length:', imgUrl.length);
      setImagePreview(imgUrl);
      // Only update history if user is logged in
      if (user) {
        updateImageHistory(imgUrl);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleImageSelect(files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImageSelect(file);
    }
  };

  // Helper function to resize image
  const resizeImage = (file: File, maxDimension: number = 512): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        // Calculate new dimensions maintaining aspect ratio
        let { width, height } = img;
        if (width > height) {
          if (width > maxDimension) {
            height = (height * maxDimension) / width;
            width = maxDimension;
          }
        } else {
          if (height > maxDimension) {
            width = (width * maxDimension) / height;
            height = maxDimension;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // Draw resized image
        ctx?.drawImage(img, 0, 0, width, height);
        
        // Convert to blob
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to resize image'));
          }
        }, 'image/jpeg', 0.8);
      };
      
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  };

  const analyzeImage = async () => {
    if (!selectedImage) return;
    setLoading(true);
    setError(null);
    setIsFallback(false);
    
    try {
      let imageUrl = null;
      
      // Step 1: Upload resized image to storage
      try {
        const resizedImage = await resizeImage(selectedImage, 512);
        const uploadFormData = new FormData();
        uploadFormData.append('image', resizedImage, 'resized.jpg');
        
        const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3000';
        const uploadHeaders: Record<string, string> = {};
        
        if (user && accessToken) {
          uploadHeaders.Authorization = `Bearer ${accessToken}`;
        }
        
        const uploadResponse = await fetch(`${apiBase}/upload-image`, {
          method: 'POST',
          body: uploadFormData,
          headers: uploadHeaders,
        });
        
        const uploadData = await uploadResponse.json();
        
        if (uploadResponse.ok && uploadData.success) {
          imageUrl = uploadData.imageUrl;
          console.log('✅ Image uploaded to storage:', imageUrl);
        } else {
          console.warn('⚠️ Failed to upload image to storage, continuing with analysis...');
        }
      } catch (uploadError) {
        console.warn('⚠️ Image upload failed, continuing with analysis:', uploadError);
      }
      
      // Step 2: Analyze original image with optional imageUrl
      const formData = new FormData();
      formData.append('image', selectedImage); // Use original image for analysis
      if (user?.id) {
        formData.append('user_id', user.id);
      }
      if (imageUrl) {
        formData.append('imageUrl', imageUrl);
      }

      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const headers: Record<string, string> = {};
      
      // Only add Authorization header if user is authenticated
      if (user && accessToken) {
        headers.Authorization = `Bearer ${accessToken}`;
      }
      
      const response = await fetch(`${apiBase}/analyze`, {
        method: 'POST',
        body: formData,
        headers,
      });

      const data: ApiResponse & { fallback?: boolean } = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to analyze image');
      }

      if (data.success && data.result) {
        setResult(data.result);
        setIsFallback(Boolean(data.fallback) || Boolean((data.result as any).fallback));
        // Update daily usage if provided
        if (data.dailyUsage) {
          setDailyUsage(data.dailyUsage);
        }
        // Store the result ID if provided
        if (data.resultId) {
          console.log('✅ Received resultId from backend:', data.resultId);
          setCurrentResultId(data.resultId);
        } else {
          console.log('⚠️ No resultId received from backend');
        }
        // Trigger history refresh for authenticated users
        if (user) {
          setHistoryRefreshTrigger(prev => prev + 1);
        }
      } else {
        throw new Error('Invalid response format');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze image');
    } finally {
      setLoading(false);
    }
  };

  const resetApp = () => {
    setSelectedImage(null);
    setImagePreview(null);
    setResult(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handler for Download Result as PNG
  const handleDownloadResult = async () => {
    const resultElement = document.getElementById('result');
    if (!resultElement) return;
    try {
      const canvas = await html2canvas(resultElement, { backgroundColor: '#fff', scale: 2 });
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = 'food-calorie-estimate.png';
      link.click();
    } catch (err) {
      alert('Failed to download image. Please try again or screenshot manually.');
    }
  };

  // Handler for Copy Result JSON
  const handleCopyResult = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(JSON.stringify(result, null, 2));
      setCopySuccess('Copied!');
      setTimeout(() => setCopySuccess(null), 1500);
    } catch (err) {
      setCopySuccess('Failed to copy');
      setTimeout(() => setCopySuccess(null), 1500);
    }
  };

  // Handler for clicking a history thumbnail
  const handleHistorySelect = (img: string) => {
    console.log('🖼️ History image selected');
    setImagePreview(img);
    // Convert base64 to File so Analyze button works
    const file = dataURLtoFile(img, 'history-image.png');
    setSelectedImage(file);
    setResult(null);
    setError(null);
    // Move this image to the top of history
    updateImageHistory(img);
  };

  // Load image history from localStorage
  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem('imageHistory') || '[]');
    console.log('📋 Loading image history from localStorage:', saved.length, 'images');
    setImageHistory(saved);
  }, []);

  // Check if user email is verified
  const isEmailVerified = user?.email_confirmed_at !== null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">🍽️ Food Calorie Estimator</h1>
          <p className="text-gray-600">Upload a food image to get instant calorie and nutrition analysis</p>
          
          {/* Auth Section */}
          {user && (
            <div className="flex items-center justify-center gap-4 mt-4">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span>Welcome,</span>
                <span className="font-medium">{user.email}</span>
              </div>
              {/* Daily Usage Display */}
              {dailyUsage && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-600">Daily Usage:</span>
                  <span className={`font-medium ${dailyUsage.remaining <= 1 ? 'text-red-600' : dailyUsage.remaining <= 2 ? 'text-yellow-600' : 'text-green-600'}`}>
                    {dailyUsage.current}/{dailyUsage.max}
                  </span>
                  <span className="text-gray-500">
                    ({dailyUsage.remaining} remaining)
                  </span>
                </div>
              )}
              <button
                onClick={logout}
                className="text-sm text-red-600 hover:text-red-700 font-medium"
              >
                Logout
              </button>
            </div>
          )}
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Upload Section */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-lg p-6 relative">
              {/* Daily Usage Indicator */}
              {user && dailyUsage && (
                <div className="absolute top-4 right-4 z-10">
                  <div className="bg-gray-100 rounded-full px-3 py-1 text-xs font-medium">
                    <span className={dailyUsage.remaining <= 1 ? 'text-red-600' : dailyUsage.remaining <= 2 ? 'text-yellow-600' : 'text-green-600'}>
                      {dailyUsage.remaining} left today
                    </span>
                  </div>
                </div>
              )}
              
              {/* Anonymous user indicator */}
              {!user && (
                <div className="absolute top-4 right-4 z-10">
                  <div className="bg-orange-100 rounded-full px-3 py-1 text-xs font-medium">
                    <span className="text-orange-600">
                      1 free today
                    </span>
                  </div>
                </div>
              )}

              {/* Upload Area */}
              <div
                className={`border-2 border-dashed border-gray-300 rounded-lg p-8 text-center transition-colors ${
                  user ? 'hover:border-emerald-400 hover:bg-emerald-50' : ''
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                {imagePreview ? (
                  <div className="space-y-4">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="max-w-full max-h-64 mx-auto rounded-lg shadow-md"
                    />
                    <button
                      onClick={resetApp}
                      className="text-sm text-gray-500 hover:text-gray-700"
                    >
                      Choose different image
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <Upload className="w-12 h-12 text-gray-400 mx-auto" />
                    <div>
                      <p className="text-lg font-medium text-gray-700">
                        Drop your food image here
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        or click to browse files
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* File Input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileInputChange}
                className="hidden"
              />
              
              {/* Action Buttons */}
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 bg-emerald-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-emerald-700 transition-colors duration-200 flex items-center justify-center gap-2"
                >
                  <Upload className="w-5 h-5" />
                  Choose Image
                </button>
                {selectedImage && (
                  <button
                    onClick={analyzeImage}
                    disabled={loading}
                    className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 transition-colors duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Camera className="w-5 h-5" />
                        Analyze Food
                      </>
                    )}
                  </button>
                )}
              </div>

              {/* Error Message */}
              {error && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-800">
                  <AlertCircle className="w-5 h-5" />
                  {error}
                </div>
              )}

              {/* Image History */}
              {user && (
                <div>
                  {imageHistory.length > 0 ? (
                    <ImageHistory images={imageHistory} onSelect={handleHistorySelect} />
                  ) : (
                    <div className="text-sm text-gray-500 mt-4">
                      No recent images. Upload an image to see it here.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Results Section */}
          <div className="space-y-6">
            {result && (
              <div id="result" className="bg-white rounded-xl shadow-lg p-6 space-y-6">
                {/* Food Items */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">🍽️</span>
                    <h3 className="text-lg font-semibold text-gray-800">Food Items</h3>
                  </div>
                  <ul className="list-disc list-inside space-y-1 text-gray-700">
                    {result.foodItems.map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                </div>

                {/* Nutrition Table */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">🥗</span>
                    <h3 className="text-lg font-semibold text-gray-800">Nutrition Facts</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-2 font-medium text-gray-700">Nutrient</th>
                          <th className="text-right py-2 font-medium text-gray-700">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b border-gray-100">
                          <td className="py-2 text-gray-600">Calories</td>
                          <td className="py-2 text-right font-medium">{result.totalCalories}</td>
                        </tr>
                        {result.nutritionFacts?.protein_g && (
                          <tr className="border-b border-gray-100">
                            <td className="py-2 text-gray-600">Protein</td>
                            <td className="py-2 text-right font-medium">{result.nutritionFacts.protein_g}g</td>
                          </tr>
                        )}
                        {result.nutritionFacts?.carbohydrates_g && (
                          <tr className="border-b border-gray-100">
                            <td className="py-2 text-gray-600">Carbohydrates</td>
                            <td className="py-2 text-right font-medium">{result.nutritionFacts.carbohydrates_g}g</td>
                          </tr>
                        )}
                        {result.nutritionFacts?.fat_g && (
                          <tr className="border-b border-gray-100">
                            <td className="py-2 text-gray-600">Fat</td>
                            <td className="py-2 text-right font-medium">{result.nutritionFacts.fat_g}g</td>
                          </tr>
                        )}
                        {result.nutritionFacts?.fiber_g && (
                          <tr className="border-b border-gray-100">
                            <td className="py-2 text-gray-600">Fiber</td>
                            <td className="py-2 text-right font-medium">{result.nutritionFacts.fiber_g}g</td>
                          </tr>
                        )}
                        {result.nutritionFacts?.sugar_g && (
                          <tr className="border-b border-gray-100">
                            <td className="py-2 text-gray-600">Sugar</td>
                            <td className="py-2 text-right font-medium">{result.nutritionFacts.sugar_g}g</td>
                          </tr>
                        )}
                        {/* Add any other nutrition facts that might be present */}
                        {Object.entries(result.nutritionFacts || {}).map(([key, value]) => {
                          // Skip already displayed nutrients
                          if (['protein_g', 'carbohydrates_g', 'fat_g', 'fiber_g', 'sugar_g'].includes(key)) {
                            return null;
                          }
                          // Display other nutrients (e.g., sodium_mg, cholesterol_mg, etc.)
                          if (typeof value === 'number') {
                            const displayName = key.replace(/_g$|_mg$/, '').replace(/([A-Z])/g, ' $1').toLowerCase();
                            const unit = key.includes('_mg') ? 'mg' : 'g';
                            return (
                              <tr key={key} className="border-b border-gray-100">
                                <td className="py-2 text-gray-600 capitalize">{displayName}</td>
                                <td className="py-2 text-right font-medium">{value}{unit}</td>
                              </tr>
                            );
                          }
                          return null;
                        })}
                      </tbody>
                    </table>
                  </div>
                  {/* Serving Size and Confidence Score */}
                  <div className="mt-4 space-y-2 text-sm text-gray-600">
                    {result.servingSize && (
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Serving Size:</span>
                        <span>{result.servingSize}</span>
                      </div>
                    )}
                    {typeof result.confidenceScore === 'number' && (
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Confidence:</span>
                        <span className="text-blue-600 font-medium">{(result.confidenceScore * 100).toFixed(0)}%</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Explanation */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">💬</span>
                    <h3 className="text-lg font-semibold text-gray-800">Analysis</h3>
                  </div>
                  <p className="text-gray-700 leading-relaxed">{result.explanation}</p>
                </div>

                {/* Download / Copy Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 mt-2 mb-4">
                  <button
                    onClick={handleDownloadResult}
                    className="flex-1 bg-emerald-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-emerald-700 transition-colors duration-200 flex items-center justify-center gap-2"
                  >
                    📥 Download Result
                  </button>
                  <button
                    onClick={handleCopyResult}
                    className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors duration-200 flex items-center justify-center gap-2"
                  >
                    📋 {copySuccess ? copySuccess : 'Copy Result'}
                  </button>
                </div>

                {/* Feedback Section */}
                                      <Feedback 
                        imageId={simpleHash(imagePreview || JSON.stringify(result))} 
                        result={result}
                        calorieResultId={currentResultId || undefined}
                      />
              </div>
            )}

            {/* Login Section - Show when user is not logged in */}
            {!user && !authLoading && (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="text-center mb-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-2">Sign In to Continue</h2>
                  <p className="text-gray-600">Create an account or sign in to analyze your food images</p>
                </div>
                <AuthForm />
              </div>
            )}

            {/* Email Verification Notice */}
            {user && !isEmailVerified && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-yellow-800">Email Verification Required</h3>
                </div>
                <p className="text-yellow-700 mb-4">
                  Please verify your email address before using the analysis features.
                </p>
                <button
                  onClick={() => window.location.reload()}
                  className="w-full bg-yellow-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-yellow-700 transition-colors duration-200"
                >
                  I've Verified My Email
                </button>
              </div>
            )}

            {/* History Section - Show when user is logged in and verified */}
            {user && isEmailVerified && <History refreshTrigger={historyRefreshTrigger} />}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UnifiedScreen; 