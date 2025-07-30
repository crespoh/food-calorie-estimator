import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './AuthContext';
import UnifiedScreen from './components/UnifiedScreen';
import AuthCallback from './components/AuthCallback';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<UnifiedScreen />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
