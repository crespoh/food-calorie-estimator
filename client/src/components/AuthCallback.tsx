import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

export default function AuthCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const completeLogin = async () => {
      try {
        // Parse URL hash for error parameters
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const authError = hashParams.get('error');
        const errorCode = hashParams.get('error_code');
        const errorDescription = hashParams.get('error_description');

        if (authError) {
          // Handle authentication errors
          let userFriendlyError = 'Authentication failed. Please try again.';
          
          if (errorCode === 'otp_expired') {
            userFriendlyError = 'Your email link has expired. Please request a new one.';
          } else if (authError === 'access_denied') {
            userFriendlyError = 'Access was denied. Please try logging in again.';
          } else if (errorDescription) {
            userFriendlyError = decodeURIComponent(errorDescription.replace(/\+/g, ' '));
          }
          
          setError(userFriendlyError);
          setIsLoading(false);
          
          // Clear the hash to clean up the URL
          window.history.replaceState(null, '', window.location.pathname);
          
          // Redirect to auth form after showing error for a moment
          setTimeout(() => {
            navigate('/', { state: { authError: userFriendlyError } });
          }, 3000);
          return;
        }

        // Try to get session for successful authentication
        const { data, error: sessionError } = await supabase.auth.getSession();
        if (data?.session?.user) {
          // Clear any pending login flag
          localStorage.removeItem('pending-login');
          setIsLoading(false);
          navigate('/');
        } else {
          console.error('Login failed or not confirmed yet', sessionError);
          setError('Unable to complete login. Please try again.');
          setIsLoading(false);
          // Redirect back to home page if no session
          setTimeout(() => {
            navigate('/');
          }, 2000);
        }
      } catch (err) {
        console.error('Error during authentication callback:', err);
        setError('An unexpected error occurred during login.');
        setIsLoading(false);
        setTimeout(() => {
          navigate('/');
        }, 2000);
      }
    };
    completeLogin();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-emerald-100 flex items-center justify-center">
      <div className="bg-white rounded-xl shadow-lg p-8 max-w-md mx-auto text-center">
        {error ? (
          <>
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <p className="text-red-700 text-lg font-medium mb-2">Authentication Error</p>
            <p className="text-red-600 text-sm mb-4">{error}</p>
            <p className="text-gray-500 text-xs">Redirecting you back to the login page...</p>
          </>
        ) : isLoading ? (
          <>
            <div className="w-16 h-16 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-700 text-lg">Logging you in…</p>
            <p className="text-gray-500 text-sm mt-2">Please wait while we complete your authentication.</p>
          </>
        ) : (
          <>
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-emerald-700 text-lg">Login Successful!</p>
            <p className="text-gray-500 text-sm mt-2">Redirecting you to the app...</p>
          </>
        )}
      </div>
    </div>
  );
}