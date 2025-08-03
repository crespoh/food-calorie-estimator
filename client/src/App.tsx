import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { AuthProvider } from './AuthContext';
import UnifiedScreen from './components/UnifiedScreen';
import PublicResult from './pages/PublicResult';
import DebugInfo from './components/DebugInfo';

function App() {
  return (
    <AuthProvider>
      <Router>
        {/* <DebugInfo /> */}
        <Routes>
          <Route path="/" element={<UnifiedScreen />} />
          <Route path="/result/:resultId" element={<PublicResult />} />
          <Route path="/test" element={<div>Test route working!</div>} />
          <Route path="*" element={
            <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50 flex items-center justify-center">
              <div className="text-center">
                <h1 className="text-2xl font-bold text-gray-900 mb-4">404 - Page Not Found</h1>
                <p className="text-gray-600 mb-6">The page you're looking for doesn't exist.</p>
                <Link to="/" className="inline-flex items-center gap-2 bg-emerald-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-emerald-700 transition-colors">
                  Go Home
                </Link>
              </div>
            </div>
          } />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
