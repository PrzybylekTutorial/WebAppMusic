import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { SpotifyPlayerProvider } from '@music';
import { SetupPage, GamePage } from './pages';

function App() {
  return (
    <SpotifyPlayerProvider>
      <Routes>
        <Route path="/" element={<SetupPage />} />
        <Route path="/game" element={<GamePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </SpotifyPlayerProvider>
  );
}

export default App;
