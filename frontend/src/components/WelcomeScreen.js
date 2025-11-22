import React from 'react';
import { LOGIN_URL } from '../config';

const WelcomeScreen = ({ authLoading }) => {
  return (
    <div style={{ textAlign: 'center', marginBottom: 30 }}>
      {authLoading ? (
        <div style={{ color: '#666', fontSize: '1rem' }}>
          🔄 Loading Spotify...
        </div>
      ) : (
        <div>
          <a href={LOGIN_URL} style={{ textDecoration: 'none' }}>
            <button style={{
              padding: '15px 30px',
              fontSize: '1.2rem',
              backgroundColor: '#B5EAD7',
              color: '#555555',
              border: 'none',
              borderRadius: 50,
              cursor: 'pointer',
              boxShadow: '0 8px 16px rgba(181, 234, 215, 0.4)',
              transition: 'all 0.3s ease',
              fontWeight: 'bold'
            }} onMouseOver={(e) => {
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.boxShadow = '0 12px 20px rgba(181, 234, 215, 0.6)';
            }} onMouseOut={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = '0 8px 16px rgba(181, 234, 215, 0.4)';
            }}>
              🎧 Connect with Spotify
            </button>
          </a>
          <div style={{ marginTop: 10, fontSize: '0.9rem', color: '#666', maxWidth: '400px', margin: '10px auto 0' }}>
            💡 <strong>One-time setup:</strong> Connect once and you'll stay logged in automatically on this device!
          </div>
          <div style={{ marginTop: 5, fontSize: '0.8rem', color: '#888', maxWidth: '400px', margin: '5px auto 0' }}>
            🔒 Secure OAuth login - your credentials are never stored
          </div>
          
          {/* Authentication Info Box */}
          <div style={{ 
            marginTop: 20, 
            padding: 15, 
            backgroundColor: '#E2F0CB', 
            borderRadius: 10, 
            border: '1px solid #B5EAD7',
            maxWidth: '500px',
            margin: '20px auto 0'
          }}>
            <div style={{ fontSize: '0.9rem', color: '#333', textAlign: 'left' }}>
              <div style={{ fontWeight: 'bold', marginBottom: 8 }}>🔐 How Authentication Works:</div>
              <ul style={{ margin: 0, paddingLeft: 20, fontSize: '0.85rem', lineHeight: 1.4 }}>
                <li><strong>First time:</strong> Click "Connect with Spotify" to authorize this app</li>
                <li><strong>Automatic login:</strong> On future visits, you'll be logged in automatically</li>
                <li><strong>New device/browser:</strong> You'll need to connect once on each new device</li>
                <li><strong>Security:</strong> Only access tokens are stored locally, never your password</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WelcomeScreen;

