import React, { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, Clock, Utensils, AlertCircle } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../AuthContext';

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
  serving_size?: string;
  confidence_score?: number;
  image_url?: string;
}

interface Feedback {
  id: string;
  calorie_result_id: string;
  image_id: string;
  user_id: string;
  feedback: string;
  rating: number;
  created_at: string;
}

const NutritionTable: React.FC<{ facts?: CalorieResult['nutrition_table'] }> = ({ facts }) => {
  if (!facts) return null;
  const keys = Object.keys(facts);
  if (keys.length === 0) return null;
  return (
    <table className="min-w-max text-xs mt-2 border rounded">
      <thead>
        <tr>
          {keys.map((key) => (
            <th key={key} className="px-2 py-1 bg-gray-100 text-gray-700 capitalize">{key.replace(/_g$/, '').replace(/_/g, ' ')}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        <tr>
          {keys.map((key) => (
            <td key={key} className="px-2 py-1 text-center">{facts[key]}</td>
          ))}
        </tr>
      </tbody>
    </table>
  );
};

// Feedback component for history items
const HistoryFeedback: React.FC<{ 
  calorieResultId: string; 
  imageId: string; 
  onFeedbackSubmitted: () => void;
  existingFeedback?: Feedback | null;
}> = ({ calorieResultId, imageId, onFeedbackSubmitted, existingFeedback }) => {
  const { user } = useAuth();
  const [feedback, setFeedback] = useState<'yes' | 'no' | null>(
    existingFeedback ? (existingFeedback.feedback as 'yes' | 'no') : null
  );
  const [showThankYou, setShowThankYou] = useState(false);
  const [loading, setLoading] = useState(false);

  const sendFeedback = async (feedbackValue: 'yes' | 'no') => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      
      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const response = await fetch(`${apiBase}/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
        },
        body: JSON.stringify({
          calorieResultId,
          imageId,
          feedback: feedbackValue,
          rating: feedbackValue === 'yes' ? 5 : 1
        }),
      });
      
      if (response.ok) {
        console.log('✅ Feedback sent successfully');
        setFeedback(feedbackValue);
        setShowThankYou(true);
        onFeedbackSubmitted();
        setTimeout(() => setShowThankYou(false), 3000);
      } else {
        console.error('❌ Failed to send feedback');
      }
    } catch (error) {
      console.error('❌ Error sending feedback:', error);
    } finally {
      setLoading(false);
    }
  };

  if (showThankYou) {
    return (
      <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded text-green-800 text-xs text-center">
        Thank you for your feedback!
      </div>
    );
  }

  // If feedback was just submitted, show thank you message
  if (feedback !== null && !existingFeedback) {
    return (
      <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded text-xs">
        <div className="flex items-center gap-2">
          <span className={`font-medium ${feedback === 'yes' ? 'text-green-600' : 'text-red-600'}`}>
            {feedback === 'yes' ? '👍 Accurate' : '👎 Inaccurate'}
          </span>
        </div>
      </div>
    );
  }

  // If feedback already exists, don't show the submission buttons
  if (existingFeedback) {
    return (
      <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded text-xs">
        <div className="flex items-center gap-2">
          <span className={`font-medium ${existingFeedback.feedback === 'yes' ? 'text-green-600' : 'text-red-600'}`}>
            {existingFeedback.feedback === 'yes' ? '👍 Accurate' : '👎 Inaccurate'}
          </span>
          <span className="text-gray-500">
            • {new Date(existingFeedback.created_at).toLocaleString()}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-3">
      <p className="text-xs text-gray-600 mb-2">Was this accurate?</p>
      <div className="flex gap-2">
        <button
          onClick={() => sendFeedback('yes')}
          disabled={loading}
          className="flex-1 bg-green-100 text-green-700 py-1 px-2 rounded text-xs font-medium hover:bg-green-200 transition-colors disabled:opacity-50"
        >
          👍 Yes
        </button>
        <button
          onClick={() => sendFeedback('no')}
          disabled={loading}
          className="flex-1 bg-red-100 text-red-700 py-1 px-2 rounded text-xs font-medium hover:bg-red-200 transition-colors disabled:opacity-50"
        >
          👎 No
        </button>
      </div>
    </div>
  );
};

interface HistoryProps {
  refreshTrigger?: number;
}

const History: React.FC<HistoryProps> = ({ refreshTrigger }) => {
  const { user } = useAuth();
  const [results, setResults] = useState<CalorieResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [feedbackData, setFeedbackData] = useState<Record<string, Feedback>>({});
  const apiBase = import.meta.env.VITE_API_URL;

  useEffect(() => {
    const fetchHistory = async () => {
      setLoading(true);
      setError(null);
      if (!user) {
        setResults([]);
        setLoading(false);
        return;
      }
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const accessToken = session?.access_token;
        if (!accessToken) {
          setResults([]);
          setLoading(false);
          return;
        }
        const res = await fetch(`${apiBase}/user-history`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });
        const json = await res.json();
        if (json.success) {
          setResults(json.results);
        } else {
          setError(json.error || 'Failed to fetch history');
        }
      } catch (err: any) {
        setError(err.message || 'Failed to fetch history');
      }
      setLoading(false);
    };
    fetchHistory();
  }, [user, apiBase, refreshTrigger]);

  // Fetch feedback for expanded items when they change
  useEffect(() => {
    if (isHistoryExpanded && expandedItems.size > 0) {
      expandedItems.forEach(itemId => {
        if (!feedbackData[itemId]) {
          fetchFeedbackForResult(itemId);
        }
      });
    }
  }, [expandedItems, isHistoryExpanded]);

  const toggleHistoryExpanded = () => {
    setIsHistoryExpanded(!isHistoryExpanded);
  };

  const toggleItemExpanded = (itemId: string) => {
    const newExpandedItems = new Set(expandedItems);
    if (newExpandedItems.has(itemId)) {
      newExpandedItems.delete(itemId);
    } else {
      newExpandedItems.add(itemId);
      // Fetch feedback when expanding an item
      fetchFeedbackForResult(itemId);
    }
    setExpandedItems(newExpandedItems);
  };

  const toggleAllItems = () => {
    if (expandedItems.size === results.length) {
      // All items are expanded, collapse all
      setExpandedItems(new Set());
    } else {
      // Some or no items are expanded, expand all
      setExpandedItems(new Set(results.map(r => r.id)));
    }
  };

  const fetchFeedbackForResult = async (calorieResultId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      if (!accessToken) return;

      console.log('🔍 Fetching feedback for result:', calorieResultId);
      const res = await fetch(`${apiBase}/feedback/${calorieResultId}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      
      const json = await res.json();
      console.log('📥 Feedback response:', json);
      
      if (json.success) {
        setFeedbackData(prev => ({
          ...prev,
          [calorieResultId]: json.feedback || null
        }));
        console.log('✅ Feedback data updated for:', calorieResultId, json.feedback);
      } else {
        console.log('❌ Failed to fetch feedback:', json.error);
      }
    } catch (error) {
      console.error('❌ Failed to fetch feedback:', error);
    }
  };

  const handleFeedbackSubmitted = (calorieResultId: string) => {
    // Refresh feedback data for this result
    fetchFeedbackForResult(calorieResultId);
  };

  if (!user) return null;

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      {/* History Header with Toggle */}
      <div 
        className="flex items-center justify-between cursor-pointer hover:bg-gray-50 -mx-6 -mt-6 px-6 pt-6 pb-4 rounded-t-xl transition-colors"
        onClick={toggleHistoryExpanded}
      >
        <div className="flex items-center gap-3">
          <Clock className="w-5 h-5 text-emerald-600" />
          <h2 className="text-xl font-bold text-gray-800">Your Calorie Estimation History</h2>
          {results.length > 0 && (
            <span className="bg-emerald-100 text-emerald-700 text-sm px-2 py-1 rounded-full font-medium">
              {results.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isHistoryExpanded && results.length > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleAllItems();
              }}
              className="text-sm text-gray-600 hover:text-gray-800 px-2 py-1 rounded hover:bg-gray-100 transition-colors"
            >
              {expandedItems.size === results.length ? 'Collapse All' : 'Expand All'}
            </button>
          )}
          {isHistoryExpanded ? (
            <ChevronUp className="w-5 h-5 text-gray-600" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-600" />
          )}
        </div>
      </div>

      {/* History Content */}
      {isHistoryExpanded && (
        <div className="mt-4">
          {loading ? (
            <div className="text-center text-gray-500 py-8 flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
              Loading history...
            </div>
          ) : error ? (
            <div className="text-center text-red-500 py-8 bg-red-50 rounded-lg border border-red-200">
              <AlertCircle className="w-6 h-6 mx-auto mb-2" />
              Error: {error}
            </div>
          ) : !results.length ? (
            <div className="text-center text-gray-400 py-8 bg-gray-50 rounded-lg">
              <Utensils className="w-8 h-8 mx-auto mb-2 opacity-50" />
              No history found for your account.
              <p className="text-sm mt-1">Your food analyses will appear here once you start using the app.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {results.map((res) => (
                <div key={res.id} className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                  {/* Item Header - Always Visible */}
                  <div 
                    className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => toggleItemExpanded(res.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs text-gray-500">
                            {new Date(res.created_at).toLocaleString()}
                          </span>
                          <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full font-medium">
                            {res.total_calories ?? '-'} cal
                          </span>
                          {feedbackData[res.id] && (
                            <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                              feedbackData[res.id].feedback === 'yes' 
                                ? 'bg-green-100 text-green-700' 
                                : 'bg-red-100 text-red-700'
                            }`}>
                              {feedbackData[res.id].feedback === 'yes' ? '👍' : '👎'}
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-700">
                          <span className="font-medium">Items: </span>
                          {res.food_items && res.food_items.length > 0 
                            ? res.food_items.slice(0, 2).join(', ') + (res.food_items.length > 2 ? '...' : '')
                            : 'None identified'
                          }
                        </div>
                        {/* Serving Size and Confidence Score */}
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                          {res.serving_size && (
                            <span className="flex items-center gap-1">
                              <span className="font-medium">Serving:</span>
                              <span>{res.serving_size}</span>
                            </span>
                          )}
                          {typeof res.confidence_score === 'number' && (
                            <span className="flex items-center gap-1">
                              <span className="font-medium">Confidence:</span>
                              <span className="text-blue-600 font-medium">{(res.confidence_score * 100).toFixed(0)}%</span>
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {expandedItems.has(res.id) ? (
                          <ChevronUp className="w-4 h-4 text-gray-500" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-gray-500" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Item Details - Collapsible */}
                  {expandedItems.has(res.id) && (
                    <div className="px-4 pb-4 border-t border-gray-100 bg-gray-50">
                      <div className="pt-4 space-y-3">
                        {/* Complete Food Items List */}
                        <div>
                          <span className="font-semibold text-gray-700 text-sm">All Food Items:</span>
                          <ul className="list-disc list-inside ml-4 text-gray-700 text-sm mt-1">
                            {res.food_items && res.food_items.length > 0 ? res.food_items.map((item, i) => (
                              <li key={i}>{item}</li>
                            )) : <li>None identified</li>}
                          </ul>
                        </div>

                        {/* Nutrition Table */}
                        {res.nutrition_table && (
                          <div>
                            <span className="font-semibold text-gray-700 text-sm">Nutrition Facts:</span>
                            <NutritionTable facts={res.nutrition_table} />
                          </div>
                        )}

                        {/* Explanation */}
                        <div>
                          <span className="font-semibold text-gray-700 text-sm">AI Explanation:</span>
                          <div className="mt-1 text-xs text-gray-600 bg-white p-3 rounded border leading-relaxed">
                            {res.explanation}
                          </div>
                        </div>

                        {/* Feedback Section */}
                        <div>
                          <span className="font-semibold text-gray-700 text-sm">Feedback:</span>
                          <HistoryFeedback 
                            calorieResultId={res.id}
                            imageId={`img_${Math.abs(res.id.split('-')[0].charCodeAt(0))}`}
                            onFeedbackSubmitted={() => handleFeedbackSubmitted(res.id)}
                            existingFeedback={feedbackData[res.id] || null}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Collapsed Summary */}
      {!isHistoryExpanded && results.length > 0 && (
        <div className="mt-2 text-sm text-gray-600">
          Click to view your {results.length} previous analysis{results.length !== 1 ? 'es' : ''}
        </div>
      )}
    </div>
  );
};

export default History; 
