import React, { createContext, useContext, ReactNode } from 'react';
import { useSpotifyPlayer } from '../hooks/useSpotifyPlayer';
import { useAuth } from '@auth';

// Define the type for the player context
type SpotifyPlayerContextType = ReturnType<typeof useSpotifyPlayer>;

const SpotifyPlayerContext = createContext<SpotifyPlayerContextType | null>(null);

export const SpotifyPlayerProvider = ({ children }: { children: ReactNode }) => {
  const { accessToken } = useAuth();
  const player = useSpotifyPlayer(accessToken);

  return (
    <SpotifyPlayerContext.Provider value={player}>
      {children}
    </SpotifyPlayerContext.Provider>
  );
};

export const useSpotifyPlayerContext = () => {
  const context = useContext(SpotifyPlayerContext);
  if (!context) {
    throw new Error('useSpotifyPlayerContext must be used within a SpotifyPlayerProvider');
  }
  return context;
};


