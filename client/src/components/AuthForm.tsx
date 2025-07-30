import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";

export default function AuthForm() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [showResend, setShowResend] = useState(false);
  const [isPolling, setIsPolling] = useState(false);

  // Session polling effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isPolling) {
      interval = setInterval(async () => {
        const { data } = await supabase.auth.getUser();
        if (data?.user) {
          clearInterval(interval);
          localStorage.removeItem('pending-login');
          setIsPolling(false);
          navigate('/');
        }
      }, 2000);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isPolling, navigate]);

  // Check for pending login on component mount
  useEffect(() => {
    const pendingLogin = localStorage.getItem('pending-login');
    if (pendingLogin) {
      setIsPolling(true);
      setShowResend(true);
      setMessage("Check your email for the login link! Please verify your email address before using the app.");
    }
  }, []);

  const handleLogin = async () => {
    if (!email) {
      setMessage("Please enter your email address");
      return;
    }
    
    setLoading(true);
    setMessage("");
    
    try {
      const { error } = await supabase.auth.signInWithOtp({ 
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      });
      
      if (error) {
        setMessage(error.message);
      } else {
        setMessage("Check your email for the login link! Please verify your email address before using the app.");
        // Store email for polling reference
        localStorage.setItem('pending-login', email);
        setEmail("");
        setShowResend(true);
        setIsPolling(true);
      }
    } catch (err) {
      setMessage("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!email) {
      setMessage("Please enter your email address first");
      return;
    }
    
    setLoading(true);
    setMessage("");
    
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      });
      
      if (error) {
        setMessage(error.message);
      } else {
        setMessage("Verification email sent again! Please check your inbox.");
      }
    } catch (err) {
      setMessage("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setMessage("");
    
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      
      if (error) {
        setMessage(error.message);
        setLoading(false);
      }
    } catch (err) {
      setMessage("An unexpected error occurred. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-8 max-w-md mx-auto">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome to Food Calorie Estimator</h2>
        <p className="text-gray-600">Sign in to get started</p>
      </div>
      
      <div className="space-y-4">
        {/* Google OAuth Button */}
        <button 
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full bg-white text-gray-700 py-2 px-4 rounded-lg font-medium border border-gray-300 hover:bg-gray-50 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continue with Google
        </button>
        
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">Or continue with email</span>
          </div>
        </div>
        
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Email Address
          </label>
          <input
            id="email"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
            disabled={loading}
          />
        </div>
        
        <button 
          onClick={handleLogin} 
          disabled={loading}
          className="w-full bg-emerald-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-emerald-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Sending...
            </>
          ) : (
            'Send Magic Link'
          )}
        </button>
        
        {showResend && (
          <button 
            onClick={handleResendVerification}
            disabled={loading}
            className="w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-lg font-medium hover:bg-gray-200 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            Resend Verification Email
          </button>
        )}
        
        {message && (
          <div className={`p-3 rounded-lg text-sm ${
            message.includes('Check your email') || message.includes('sent again')
              ? 'bg-green-50 text-green-800 border border-green-200' 
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            {message}
            {isPolling && message.includes('Check your email') && (
              <div className="mt-2 flex items-center gap-2 text-xs text-green-700">
                <div className="w-3 h-3 border-2 border-green-600 border-t-transparent rounded-full animate-spin"></div>
                Waiting for you to click the link...
              </div>
            )}
          </div>
        )}
      </div>
      
      <div className="mt-6 text-center">
        <p className="text-sm text-gray-500">
          We'll send you a secure link to sign in instantly. Email verification is required.
        </p>
      </div>
    </div>
  );
} 