import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Loader2, AlertCircle, Utensils, ArrowLeft, ExternalLink } from 'lucide-react';
import { trackPublicResultView, trackPublicResultShare, trackPublicResultCTA } from '../utils/analytics';
import DebugInfo from '../components/DebugInfo';

interface PublicResultData {
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
  serving_size?: string;
  confidence_score?: number;
  image_url?: string;
}

const NutritionTable: React.FC<{ facts?: PublicResultData['nutrition_table'] }> = ({ facts }) => {
  if (!facts) return null;
  const keys = Object.keys(facts);
  if (keys.length === 0) return null;
  
  return (
    <table className="min-w-full text-sm border rounded-lg overflow-hidden">
      <thead>
        <tr className="bg-gray-50">
          {keys.map((key) => (
            <th key={key} className="px-4 py-2 text-left font-medium text-gray-700 capitalize">
              {key.replace(/_g$/, '').replace(/_/g, ' ')}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        <tr>
          {keys.map((key) => (
            <td key={key} className="px-4 py-2 border-t text-gray-900">
              {facts[key]}
            </td>
          ))}
        </tr>
      </tbody>
    </table>
  );
};

const PublicResult: React.FC = () => {
  const { resultId } = useParams<{ resultId: string }>();
  const [result, setResult] = useState<PublicResultData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPublicResult = async () => {
      console.log('🔍 PublicResult: Starting fetch for resultId:', resultId);
      
      if (!resultId) {
        console.log('❌ PublicResult: No resultId provided');
        setError('No result ID provided');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3000';
        const url = `${apiBase}/public-result/${resultId}`;
        console.log('🔍 PublicResult: Fetching from URL:', url);
        
        const response = await fetch(url);
        console.log('🔍 PublicResult: Response status:', response.status);
        
        const data = await response.json();
        console.log('🔍 PublicResult: Response data:', data);

        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch result');
        }

        if (data.success && data.result) {
          setResult(data.result);
          // Track the public result view
          trackPublicResultView(resultId);
          console.log('✅ PublicResult: Successfully loaded result');
        } else {
          throw new Error('Invalid response format');
        }
      } catch (err) {
        console.error('❌ PublicResult: Error fetching result:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch result');
      } finally {
        setLoading(false);
      }
    };

    fetchPublicResult();
  }, [resultId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading shared result...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">Result Not Found</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 bg-emerald-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-emerald-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Try Your Own Analysis
          </Link>
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600">No result data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50">
      {/* <DebugInfo /> */}
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-emerald-600 hover:text-emerald-700 mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to CaloriTrack
          </Link>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">🍽️ Shared Food Analysis</h1>
          <p className="text-gray-600">This result was shared from our AI-powered CaloriTrack app</p>
        </div>

        {/* Result Card */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          {/* Analysis Date */}
          <div className="text-sm text-gray-500 mb-4">
            Analyzed on {new Date(result.created_at).toLocaleDateString()} at {new Date(result.created_at).toLocaleTimeString()}
          </div>

          {/* Food Image */}
          {result.image_url && result.image_url !== 'inline' && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">📸</span>
                <h2 className="text-xl font-semibold text-gray-800">Analyzed Food Image</h2>
              </div>
              <div className="relative">
                <img 
                  src={result.image_url} 
                  alt="Analyzed food" 
                  className="w-full max-w-md mx-auto rounded-lg shadow-md object-cover"
                  style={{ maxHeight: '400px' }}
                  onError={(e) => {
                    console.log('❌ Image failed to load:', result.image_url);
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
            </div>
          )}

          {/* Food Items */}
          <div className="space-y-4 mb-6">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🍽️</span>
              <h2 className="text-xl font-semibold text-gray-800">Food Items</h2>
            </div>
            <ul className="list-disc list-inside space-y-1 text-gray-700">
              {result.food_items && result.food_items.length > 0 ? (
                result.food_items.map((item, index) => (
                  <li key={index}>{item}</li>
                ))
              ) : (
                <li>No food items identified</li>
              )}
            </ul>
          </div>

          {/* Nutrition Table */}
          <div className="space-y-4 mb-6">
            <div className="flex items-center gap-2">
              <span className="text-2xl">📊</span>
              <h2 className="text-xl font-semibold text-gray-800">Nutrition Facts</h2>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600 mb-1">
                  {result.total_calories}
                </div>
                <div className="text-blue-700 font-medium">Total Calories</div>
              </div>
            </div>
            {result.nutrition_table && (
              <NutritionTable facts={result.nutrition_table} />
            )}
          </div>

          {/* Serving Size and Confidence */}
          <div className="space-y-2 mb-6 text-sm text-gray-600">
            {result.serving_size && (
              <div className="flex items-center gap-2">
                <span className="font-medium">Serving Size:</span>
                <span>{result.serving_size}</span>
              </div>
            )}
            {typeof result.confidence_score === 'number' && (
              <div className="flex items-center gap-2">
                <span className="font-medium">Confidence:</span>
                <span className="text-blue-600 font-medium">
                  {(result.confidence_score * 100).toFixed(0)}%
                </span>
              </div>
            )}
          </div>

          {/* Explanation */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-2xl">💬</span>
              <h2 className="text-xl font-semibold text-gray-800">AI Analysis</h2>
            </div>
            <p className="text-gray-700 leading-relaxed">{result.explanation}</p>
          </div>
        </div>

        {/* Call to Action */}
        <div className="text-center">
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-emerald-800 mb-2">
              Want to analyze your own food?
            </h3>
            <p className="text-emerald-700 mb-4">
              Upload a photo of your meal and get instant calorie and nutrition analysis powered by AI.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                to="/"
                onClick={() => trackPublicResultCTA(result.id)}
                className="inline-flex items-center gap-2 bg-emerald-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-emerald-700 transition-colors"
              >
                <Utensils className="w-4 h-4" />
                Try It Yourself
              </Link>
              <button
                onClick={() => {
                  const shareText = `🍽️ Check out this food analysis! Found ${result.food_items?.join(', ') || 'delicious food'} - ${result.total_calories} calories total. Try analyzing your own food at ${window.location.origin}`;
                  navigator.clipboard.writeText(shareText);
                  trackPublicResultShare(result.id);
                  alert('Share text copied to clipboard!');
                }}
                className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                Share This Result
              </button>
            </div>
          </div>
        </div>

        {/* Additional Info */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>
            This analysis was performed using AI-powered image recognition technology. 
            Results are estimates and should not replace professional nutritional advice.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PublicResult; 