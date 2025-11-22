import React from 'react';
import { LOGIN_URL } from '../config';
import { Headphones, Lock, Info, Loader } from 'lucide-react';

const WelcomeScreen = ({ authLoading }) => {
  return (
    <div style={{ textAlign: 'center', marginBottom: 30 }}>
      {authLoading ? (
        <div style={{ color: 'var(--color-text-secondary)', fontSize: '1.1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
          <Loader className="spin" size={24} /> Connecting to Spotify...
        </div>
      ) : (
        <div>
          <a href={LOGIN_URL} style={{ textDecoration: 'none' }}>
            <button className="btn-primary" style={{ fontSize: '1.2rem', padding: '15px 40px' }}>
              <Headphones size={24} /> Connect with Spotify
            </button>
          </a>
          
          <div style={{ marginTop: 20, fontSize: '0.95rem', color: 'var(--color-text-secondary)', maxWidth: '450px', margin: '20px auto 0' }}>
             ✨ <strong>One-time setup:</strong> Connect once and stay logged in!
          </div>
          
          <div style={{ 
            marginTop: 30, 
            padding: 25, 
            backgroundColor: 'var(--color-accent-lime)', 
            borderRadius: 20, 
            maxWidth: '550px',
            margin: '30px auto 0',
            boxShadow: 'var(--shadow-soft)'
          }}>
            <div style={{ textAlign: 'left', color: 'var(--color-text-primary)' }}>
              <div style={{ fontWeight: 'bold', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8, fontSize: '1.1rem' }}>
                <Lock size={18} /> Secure Authentication
              </div>
              <ul style={{ margin: 0, paddingLeft: 20, fontSize: '0.9rem', lineHeight: 1.6 }}>
                <li>This app uses Spotify's secure login system.</li>
                <li>Your password is <strong>never</strong> shared with us.</li>
                <li>We only access your public profile and playback control.</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WelcomeScreen;
