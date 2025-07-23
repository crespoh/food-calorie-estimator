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
  image_url?: string;
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

const History: React.FC = () => {
  const { user } = useAuth();
  const [results, setResults] = useState<CalorieResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
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
        const res = await fetch(`${apiBase}/api/user-history`, {
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
  }, [user, apiBase]);

  const toggleHistoryExpanded = () => {
    setIsHistoryExpanded(!isHistoryExpanded);
  };

  const toggleItemExpanded = (itemId: string) => {
    const newExpandedItems = new Set(expandedItems);
    if (newExpandedItems.has(itemId)) {
      newExpandedItems.delete(itemId);
    } else {
      newExpandedItems.add(itemId);
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
                        </div>
                        <div className="text-sm text-gray-700">
                          <span className="font-medium">Items: </span>
                          {res.food_items && res.food_items.length > 0 
                            ? res.food_items.slice(0, 2).join(', ') + (res.food_items.length > 2 ? '...' : '')
                            : 'None identified'
                          }
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