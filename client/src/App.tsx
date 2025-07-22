import React, { useState, useRef, useEffect } from 'react';
import { Upload, Camera, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import html2canvas from 'html2canvas';
import History from './components/History';
import { useAuth } from './AuthContext';
import { supabase } from './supabaseClient';
import AuthForm from './components/AuthForm';

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
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  error?: string;
  type?: string;
}

// ImageHistory component
interface ImageHistoryProps {
  images: string[];
  onSelect: (img: string) => void;
}

const ImageHistory: React.FC<ImageHistoryProps> = ({ images, onSelect }) => (
  <div className="mt-4 flex gap-2 overflow-x-auto">
    {images.map((img, idx) => (
      <button
        key={idx}
        className="focus:outline-none border-2 border-transparent focus:border-emerald-500 rounded-lg p-0.5 transition"
        onClick={() => onSelect(img)}
        aria-label={`Preview image ${idx + 1}`}
        type="button"
      >
        <img
          src={img}
          alt={`History ${idx + 1}`}
          className="w-16 h-16 object-cover rounded-lg shadow-sm hover:scale-105 transition-transform"
        />
      </button>
    ))}
  </div>
);

// Feedback component
interface FeedbackProps {
  imageId: string;
  result: AnalysisResult;
}

const Feedback: React.FC<FeedbackProps> = ({ imageId, result }) => {
  const [feedbackGiven, setFeedbackGiven] = useState<boolean>(() => {
    const stored = localStorage.getItem('feedbacks');
    if (!stored) return false;
    const feedbacks = JSON.parse(stored) as any[];
    return feedbacks.some(fb => fb.imageId === imageId);
  });
  const [thankYou, setThankYou] = useState(false);

  // Stub for sending feedback to API
  const sendFeedback = async (feedbackObj: any) => {
    // Replace with real API call in the future
    console.log('Feedback sent to API:', feedbackObj);
  };

  const handleFeedback = (feedback: 'yes' | 'no') => {
    if (feedbackGiven) return;
    const feedbackObj = {
      imageId,
      timestamp: Date.now(),
      response: result,
      feedback,
    };
    // Save to localStorage
    const stored = localStorage.getItem('feedbacks');
    const feedbacks = stored ? JSON.parse(stored) : [];
    feedbacks.push(feedbackObj);
    localStorage.setItem('feedbacks', JSON.stringify(feedbacks));
    setFeedbackGiven(true);
    setThankYou(true);
    sendFeedback(feedbackObj);
    setTimeout(() => setThankYou(false), 2000);
  };

  return (
    <div className="mt-4 flex flex-col items-center">
      {!feedbackGiven && !thankYou && (
        <div className="flex flex-col items-center gap-2">
          <span className="text-gray-700 font-medium mb-1">Was this accurate?</span>
          <div className="flex gap-4">
            <button
              onClick={() => handleFeedback('yes')}
              className="flex items-center gap-1 px-4 py-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-lg font-semibold transition"
            >
              <span className="text-xl">👍</span> Yes
            </button>
            <button
              onClick={() => handleFeedback('no')}
              className="flex items-center gap-1 px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg font-semibold transition"
            >
              <span className="text-xl">👎</span> No
            </button>
          </div>
        </div>
      )}
      {thankYou && (
        <div className="text-emerald-700 font-semibold py-2">Thank you for your feedback!</div>
      )}
      {feedbackGiven && !thankYou && (
        <div className="text-gray-500 text-sm py-2">Feedback already submitted for this result.</div>
      )}
    </div>
  );
};

// Helper: Convert base64 dataURL to File
function dataURLtoFile(dataUrl: string, filename: string): File {
  const arr = dataUrl.split(',');
  const mimeMatch = arr[0].match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : 'image/png';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], filename, { type: mime });
}

// Helper: Simple hash for imageId (base64 or result JSON)
function simpleHash(str: string): string {
  let hash = 0, i, chr;
  if (str.length === 0) return hash.toString();
  for (i = 0; i < str.length; i++) {
    chr = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + chr;
    hash |= 0; // Convert to 32bit integer
  }
  return hash.toString();
}

function App() {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isFallback, setIsFallback] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [copySuccess, setCopySuccess] = useState<string | null>(null);

  // Image history state
  const [imageHistory, setImageHistory] = useState<string[]>(() => {
    const stored = localStorage.getItem('imageHistory');
    return stored ? JSON.parse(stored) : [];
  });

  const { user, loading: authLoading, loginWithGoogle, logout } = useAuth();

  // Add session state for access token
  const [accessToken, setAccessToken] = useState<string | null>(null);
  useEffect(() => {
    const getToken = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setAccessToken(session?.access_token || null);
    };
    getToken();
  }, [user]);

  // Helper to update localStorage and state
  const updateImageHistory = (newImg: string) => {
    let updated = [newImg, ...imageHistory.filter((img) => img !== newImg)];
    if (updated.length > 3) updated = updated.slice(0, 3);
    setImageHistory(updated);
    localStorage.setItem('imageHistory', JSON.stringify(updated));
  };

  // When a new image is selected/uploaded, add to history
  const handleImageSelect = (file: File) => {
    if (file && file.type.startsWith('image/')) {
      setSelectedImage(file);
      setResult(null);
      setError(null);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        const imgUrl = e.target?.result as string;
        setImagePreview(imgUrl);
        updateImageHistory(imgUrl);
      };
      reader.readAsDataURL(file);
    } else {
      setError('Please select a valid image file (JPEG, PNG, or WebP)');
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleImageSelect(files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleImageSelect(files[0]);
    }
  };

  // In analyzeImage, pass user id to backend
  const analyzeImage = async () => {
    if (!selectedImage || !user || !accessToken) return;

    setLoading(true);
    setError(null);
    setIsFallback(false);

    try {
      // Use the original file directly
      const formData = new FormData();
      formData.append('image', selectedImage);
      if (user?.id) {
        formData.append('user_id', user.id);
      }

      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const response = await fetch(`${apiBase}/api/analyze`, {
        method: 'POST',
        body: formData,
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const data: ApiResponse & { fallback?: boolean } = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to analyze image');
      }

      if (data.success && data.result) {
        setResult(data.result);
        setIsFallback(Boolean(data.fallback) || Boolean((data.result as any).fallback));
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
    setImagePreview(img);
    // Convert base64 to File so Analyze button works
    const file = dataURLtoFile(img, 'history-image.png');
    setSelectedImage(file);
    setResult(null);
    setError(null);
  };

  // Show loading spinner while auth is loading
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }
  // Show auth form if user is not logged in
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50 flex items-center justify-center p-4">
        <AuthForm />
      </div>
    );
  }

  // Check if user email is verified
  const isEmailVerified = user.email_confirmed_at !== null;
  
  // Show email verification message if user is logged in but email is not verified
  if (!isEmailVerified) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md mx-auto text-center">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Email Verification Required</h2>
          <p className="text-gray-600 mb-4">
            Please verify your email address before using this feature.
          </p>
          <p className="text-sm text-gray-500 mb-6">
            Check your inbox for a verification link from Supabase.
          </p>
          <div className="space-y-3">
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-emerald-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-emerald-700 transition-colors duration-200"
            >
              I've Verified My Email
            </button>
            <button
              onClick={logout}
              className="w-full bg-gray-200 text-gray-700 py-2 px-4 rounded-lg font-medium hover:bg-gray-300 transition-colors duration-200"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">🍽️ Food Calorie Estimator</h1>
          <p className="text-gray-600">Upload a food image to get instant calorie and nutrition analysis</p>
          
          {/* Auth Section */}
          <div className="flex items-center justify-center gap-4 mt-4">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span>Welcome,</span>
              <span className="font-medium">{user.email}</span>
            </div>
            <button
              onClick={logout}
              className="text-sm text-red-600 hover:text-red-700 font-medium"
            >
              Logout
            </button>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Upload Section */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">
                Upload Food Image
              </h2>
              
              {/* Drag & Drop Area */}
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-all duration-300 ${
                  isDragging
                    ? 'border-emerald-400 bg-emerald-50'
                    : 'border-gray-300 hover:border-emerald-400 hover:bg-emerald-50'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                {imagePreview ? (
                  <div className="space-y-4">
                    <img
                      src={imagePreview}
                      alt="Selected food"
                      className="max-h-48 mx-auto rounded-lg shadow-md"
                    />
                    <p className="text-sm text-gray-600">
                      {selectedImage?.name}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <Upload className="w-12 h-12 text-gray-400 mx-auto" />
                    <div>
                      <p className="text-lg font-medium text-gray-700">
                        Drop your image here
                      </p>
                      <p className="text-sm text-gray-500">
                        or click to browse files
                      </p>
                    </div>
                  </div>
                )}
              </div>
              {/* Image History Thumbnails */}
              {imageHistory.length > 0 && (
                <ImageHistory images={imageHistory} onSelect={handleHistorySelect} />
              )}

              {/* File Input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileInputChange}
                className="hidden"
                disabled={!user}
              />
              
              {/* Action Buttons */}
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 bg-emerald-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-emerald-700 transition-colors duration-200 flex items-center justify-center gap-2"
                  disabled={!user}
                >
                  <Upload className="w-5 h-5" />
                  Choose Image
                </button>
                
                {selectedImage && user && (
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

              {/* Show sign-in message if not logged in */}
              {!user && !authLoading && (
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-yellow-800 text-center">
                  Please sign in to upload an image.
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-red-800 font-medium">Error</p>
                    <p className="text-red-700 text-sm">{error}</p>
                  </div>
                </div>
              )}
            </div>
            {/* Add History component below upload form */}
            <History />
          </div>

          {/* Results Section */}
          <div className="space-y-6">
            {result && (
              <>
                <div id="result">
                  {/* Food Items Card */}
                  <div className="bg-white rounded-xl shadow-lg p-6 mb-4">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-2xl">🍽</span>
                      <h3 className="text-lg font-semibold text-gray-800">Identified Food Items</h3>
                    </div>
                    <ul className="list-disc list-inside text-gray-700 text-base pl-2">
                      {result.foodItems && result.foodItems.length > 0 ? (
                        result.foodItems.map((item, idx) => (
                          <li key={idx}>{item}</li>
                        ))
                      ) : (
                        <li>No food items identified.</li>
                      )}
                    </ul>
                  </div>

                  {/* Nutrition Table Card */}
                  <div className="bg-white rounded-xl shadow-lg p-6 mb-4">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-2xl">🥗</span>
                      <h3 className="text-lg font-semibold text-gray-800">Nutrition Facts</h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-sm text-gray-700">
                        <thead>
                          <tr className="border-b">
                            <th className="py-2 px-4 text-left">Calories</th>
                            <th className="py-2 px-4 text-left">Protein (g)</th>
                            <th className="py-2 px-4 text-left">Carbs (g)</th>
                            <th className="py-2 px-4 text-left">Fat (g)</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td className="py-2 px-4 font-mono">{result.totalCalories ?? '-'}</td>
                            <td className="py-2 px-4 font-mono">{result.nutritionFacts?.protein_g ?? '-'}</td>
                            <td className="py-2 px-4 font-mono">{result.nutritionFacts?.carbohydrates_g ?? '-'}</td>
                            <td className="py-2 px-4 font-mono">{result.nutritionFacts?.fat_g ?? '-'}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    {result.servingSize && (
                      <div className="mt-2 text-xs text-gray-500">Serving Size: {result.servingSize}</div>
                    )}
                    {typeof result.confidenceScore === 'number' && (
                      <div className="mt-2 text-xs text-blue-600">Confidence: {(result.confidenceScore * 100).toFixed(0)}%</div>
                    )}
                  </div>

                  {/* Explanation Card */}
                  <div className="bg-white rounded-xl shadow-lg p-6 mb-4">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-2xl">💬</span>
                      <h3 className="text-lg font-semibold text-gray-800">Explanation</h3>
                    </div>
                    <p className="text-gray-700 leading-relaxed whitespace-pre-line">{result.explanation}</p>
                  </div>
                </div>

                {/* Download / Copy Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 mt-2 mb-4">
                  <button
                    onClick={handleDownloadResult}
                    className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 transition-colors duration-200 flex items-center justify-center gap-2"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V4" /></svg>
                    Download Result
                  </button>
                  <button
                    onClick={handleCopyResult}
                    className="flex-1 bg-emerald-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-emerald-700 transition-colors duration-200 flex items-center justify-center gap-2"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16h8M8 12h8m-7 8h6a2 2 0 002-2V6a2 2 0 00-2-2H7a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    {copySuccess ? copySuccess : 'Copy Result'}
                  </button>
                </div>

                {/* Feedback Section */}
                <Feedback
                  imageId={simpleHash(imagePreview || JSON.stringify(result))}
                  result={result}
                />

                {/* Reset Button */}
                <button
                  onClick={resetApp}
                  className="w-full mt-2 bg-gray-100 text-gray-700 py-3 px-6 rounded-lg font-medium hover:bg-gray-200 transition-colors duration-200"
                >
                  Analyze Another Image
                </button>
              </>
            )}

            {/* Instructions */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                How it works
              </h3>
              <div className="space-y-3 text-gray-600">
                <div className="flex items-start gap-3">
                  <div className="bg-emerald-100 text-emerald-600 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold flex-shrink-0">
                    1
                  </div>
                  <p>Upload a clear photo of your food</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="bg-emerald-100 text-emerald-600 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold flex-shrink-0">
                    2
                  </div>
                  <p>AI analyzes the image and identifies food items</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="bg-emerald-100 text-emerald-600 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold flex-shrink-0">
                    3
                  </div>
                  <p>Get instant calorie estimates and nutritional insights</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-12 text-gray-500 text-sm">
          <p>
            Powered by OpenAI Vision API • Estimates are approximate and for reference only
          </p>
        </div>
      </div>
    </div>
  );
}

export default App;