import React, { createContext, useState, useEffect, useContext } from 'react';
import { getApiUrl } from '../config';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [accessToken, setAccessToken] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [rememberMe, setRememberMe] = useState(false);

  // ===== URL PARAMETER EXTRACTION =====
  const urlParams = new URLSearchParams(window.location.search);
  const urlAccessToken = urlParams.get('access_token');
  const urlRefreshToken = urlParams.get('refresh_token');

  // ===== TOKEN MANAGEMENT =====
  const getStoredTokens = () => {
    try {
      const stored = localStorage.getItem('spotify_tokens');
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.error('Error reading stored tokens:', error);
      return null;
    }
  };

  const storeTokens = (accessToken, refreshToken, rememberMe) => {
    try {
      if (rememberMe && accessToken && refreshToken) {
        const tokens = {
          access_token: accessToken,
          refresh_token: refreshToken,
          timestamp: Date.now()
        };
        localStorage.setItem('spotify_tokens', JSON.stringify(tokens));
      } else {
        localStorage.removeItem('spotify_tokens');
      }
    } catch (error) {
      console.error('Error storing tokens:', error);
    }
  };

  const isTokenExpired = (timestamp) => {
    const TOKEN_LIFETIME = 3600000; // 1 hour in milliseconds
    return Date.now() - timestamp > TOKEN_LIFETIME;
  };

  const refreshAccessToken = async (refreshToken) => {
    try {
      const response = await fetch(getApiUrl('/api/auth/refresh'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh_token: refreshToken })
      });

      if (response.ok) {
        const data = await response.json();
        return data.access_token;
      }
      return null;
    } catch (error) {
      console.error('Error refreshing token:', error);
      return null;
    }
  };

  const logout = () => {
    localStorage.removeItem('spotify_tokens');
    setAccessToken(null);
    setRememberMe(false);
    window.history.replaceState({}, document.title, window.location.pathname);
  };

  // Initialize authentication
  useEffect(() => {
    const initializeAuth = async () => {
      setAuthLoading(true);
      
      try {
        // First, check if we have a token from URL (new login)
        if (urlAccessToken && urlRefreshToken) {
          console.log('New login detected, storing tokens...');
          setAccessToken(urlAccessToken);
          storeTokens(urlAccessToken, urlRefreshToken, true);
          
          // Clear URL parameters
          window.history.replaceState({}, document.title, window.location.pathname);
          return;
        }

        // Check for stored tokens
        const storedTokens = getStoredTokens();
        if (storedTokens && !isTokenExpired(storedTokens.timestamp)) {
          console.log('Using stored valid token');
          setAccessToken(storedTokens.access_token);
          setRememberMe(true);
          return;
        }

        // Try to refresh token if expired
        if (storedTokens && storedTokens.refresh_token) {
          console.log('Token expired, attempting refresh...');
          const newAccessToken = await refreshAccessToken(storedTokens.refresh_token);
          if (newAccessToken) {
            console.log('Token refreshed successfully');
            setAccessToken(newAccessToken);
            storeTokens(newAccessToken, storedTokens.refresh_token, true);
            setRememberMe(true);
            return;
          }
        }

        // Try auto-login with app account
        console.log('Attempting auto-login with app account...');
        try {
          const autoLoginResponse = await fetch(getApiUrl('/api/auth/auto-login'));
          if (autoLoginResponse.ok) {
            const autoLoginData = await autoLoginResponse.json();
            if (autoLoginData.access_token) {
              console.log('Auto-login successful:', autoLoginData.message);
              setAccessToken(autoLoginData.access_token);
              setRememberMe(true);
              return;
            }
          } else {
            const errorData = await autoLoginResponse.json();
            if (errorData.setup_required) {
              console.log('Auto-login setup required:', errorData.error);
            }
          }
        } catch (autoLoginError) {
          console.log('Auto-login failed, falling back to manual login:', autoLoginError.message);
        }

        // No valid token found
        console.log('No valid token found, user needs to login');
        setAccessToken(null);
        
      } catch (error) {
        console.error('Error initializing authentication:', error);
        setAccessToken(null);
      } finally {
        setAuthLoading(false);
      }
    };

    initializeAuth();
  }, [urlAccessToken, urlRefreshToken]);

  const value = {
    accessToken,
    authLoading,
    rememberMe,
    logout
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);

