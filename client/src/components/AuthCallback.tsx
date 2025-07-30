import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const completeLogin = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (data?.session?.user) {
        // Clear any pending login flag
        localStorage.removeItem('pending-login');
        navigate('/');
      } else {
        console.error('Login failed or not confirmed yet', error);
        // Redirect back to home page if no session
        navigate('/');
      }
    };
    completeLogin();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-emerald-100 flex items-center justify-center">
      <div className="bg-white rounded-xl shadow-lg p-8 max-w-md mx-auto text-center">
        <div className="w-16 h-16 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-700 text-lg">Logging you in…</p>
        <p className="text-gray-500 text-sm mt-2">Please wait while we complete your authentication.</p>
      </div>
    </div>
  );
}