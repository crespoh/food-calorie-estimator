import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './AuthContext';
import UnifiedScreen from './components/UnifiedScreen';
import PublicResult from './pages/PublicResult';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<UnifiedScreen />} />
          <Route path="/result/:resultId" element={<PublicResult />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
