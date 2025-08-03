import React, { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { supabase } from '../supabaseClient';
import { BarChart3, Eye, Share2, MousePointer, TrendingUp } from 'lucide-react';

interface AnalyticsData {
  period: string;
  views: number;
  shares: number;
  ctaClicks: number;
  conversionRate: string;
  topResults: Array<{
    result_id: string;
    count: number;
  }>;
}

const AnalyticsDashboard: React.FC = () => {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      if (!user) return;

      try {
        setLoading(true);
        setError(null);

        const { data: { session } } = await supabase.auth.getSession();
        const accessToken = session?.access_token;

        const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3000';
        const response = await fetch(`${apiBase}/public-analytics`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch analytics');
        }

        if (data.success && data.analytics) {
          setAnalytics(data.analytics);
        } else {
          throw new Error('Invalid response format');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch analytics');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [user]);

  if (!user) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="text-center text-gray-500">
          <BarChart3 className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <p>Please log in to view analytics</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="text-center text-red-500">
          <p>Error loading analytics: {error}</p>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="text-center text-gray-500">
          <p>No analytics data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-center gap-2 mb-6">
        <BarChart3 className="w-6 h-6 text-emerald-600" />
        <h2 className="text-xl font-semibold text-gray-800">Public Result Analytics</h2>
        <span className="text-sm text-gray-500 ml-auto">{analytics.period}</span>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Eye className="w-5 h-5 text-blue-600" />
            <span className="text-sm font-medium text-blue-700">Views</span>
          </div>
          <div className="text-2xl font-bold text-blue-800">{analytics.views.toLocaleString()}</div>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Share2 className="w-5 h-5 text-green-600" />
            <span className="text-sm font-medium text-green-700">Shares</span>
          </div>
          <div className="text-2xl font-bold text-green-800">{analytics.shares.toLocaleString()}</div>
        </div>

        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <MousePointer className="w-5 h-5 text-purple-600" />
            <span className="text-sm font-medium text-purple-700">CTA Clicks</span>
          </div>
          <div className="text-2xl font-bold text-purple-800">{analytics.ctaClicks.toLocaleString()}</div>
        </div>

        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5 text-orange-600" />
            <span className="text-sm font-medium text-orange-700">Conversion</span>
          </div>
          <div className="text-2xl font-bold text-orange-800">{analytics.conversionRate}%</div>
        </div>
      </div>

      {/* Top Results */}
      {analytics.topResults.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-3">Most Viewed Results</h3>
          <div className="space-y-2">
            {analytics.topResults.slice(0, 5).map((result, index) => (
              <div key={result.result_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-500">#{index + 1}</span>
                  <span className="text-sm text-gray-700 font-mono">{result.result_id.slice(0, 8)}...</span>
                </div>
                <span className="text-sm font-medium text-gray-600">{result.count} views</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Insights */}
      <div className="mt-6 p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
        <h4 className="font-semibold text-emerald-800 mb-2">Insights</h4>
        <ul className="text-sm text-emerald-700 space-y-1">
          <li>• {analytics.views} people viewed shared results</li>
          <li>• {analytics.shares} results were shared by users</li>
          <li>• {analytics.conversionRate}% of viewers clicked "Try It Yourself"</li>
          <li>• Average engagement rate: {analytics.views > 0 ? ((analytics.shares + analytics.ctaClicks) / analytics.views * 100).toFixed(1) : '0'}%</li>
        </ul>
      </div>
    </div>
  );
};

export default AnalyticsDashboard; 