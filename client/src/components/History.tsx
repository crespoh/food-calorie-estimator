import React, { useEffect, useState } from 'react';
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
  }, [user, apiBase]);

  if (!user) return null;
  if (loading) {
    return <div className="text-center text-gray-500 py-8">Loading history...</div>;
  }
  if (error) {
    return <div className="text-center text-red-500 py-8">Error: {error}</div>;
  }
  if (!results.length) {
    return <div className="text-center text-gray-400 py-8">No history found for your account.</div>;
  }

  return (
    <div className="mt-10">
      <h2 className="text-xl font-bold mb-4 text-gray-800">Your Calorie Estimation History</h2>
      <div className="space-y-6">
        {results.map((res) => (
          <div key={res.id} className="bg-white rounded-lg shadow p-4 flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex-1">
              <div className="text-xs text-gray-400 mb-1">{new Date(res.created_at).toLocaleString()}</div>
              <div className="mb-2">
                <span className="font-semibold text-gray-700">Food Items:</span>
                <ul className="list-disc list-inside ml-4 text-gray-700">
                  {res.food_items && res.food_items.length > 0 ? res.food_items.map((item, i) => (
                    <li key={i}>{item}</li>
                  )) : <li>None</li>}
                </ul>
              </div>
              <div className="mb-2">
                <span className="font-semibold text-gray-700">Total Calories:</span>
                <span className="ml-2 text-blue-700 font-mono">{res.total_calories ?? '-'}</span>
              </div>
              {res.nutrition_table && <NutritionTable facts={res.nutrition_table} />}
              <div className="mt-2 text-xs text-gray-500">{res.explanation}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default History; 