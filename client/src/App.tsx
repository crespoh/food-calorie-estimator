import React from 'react';
import { AuthProvider } from './AuthContext';
import UnifiedScreen from './components/UnifiedScreen';

function App() {
  return (
    <AuthProvider>
      <UnifiedScreen />
    </AuthProvider>
  );
}

export default App;
