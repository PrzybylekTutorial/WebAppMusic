import React from 'react';

const PlaylistSelector = ({ useDynamicPlaylist, setUseDynamicPlaylist, dynamicPlaylistId }) => {
  return (
    <div style={{ marginBottom: 30 }}>
      <h3 style={{ textAlign: 'center', marginBottom: 20, color: '#333' }}>
        🎵 Choose Your Music Source
      </h3>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 15, flexWrap: 'wrap' }}>
        <button 
          onClick={() => setUseDynamicPlaylist(false)}
          style={{ 
            padding: '12px 20px',
            backgroundColor: !useDynamicPlaylist ? '#28a745' : '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: 25,
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            fontWeight: 'bold',
            boxShadow: '0 4px 8px rgba(0,0,0,0.2)'
          }}
        >
          📻 Original Playlist
        </button>
        <button 
          onClick={() => setUseDynamicPlaylist(true)}
          disabled={!dynamicPlaylistId}
          style={{ 
            padding: '12px 20px',
            backgroundColor: useDynamicPlaylist && dynamicPlaylistId ? '#007bff' : '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: 25,
            cursor: dynamicPlaylistId ? 'pointer' : 'not-allowed',
            transition: 'all 0.3s ease',
            fontWeight: 'bold',
            boxShadow: '0 4px 8px rgba(0,0,0,0.2)'
          }}
        >
          🎲 Dynamic Database ({dynamicPlaylistId ? 'Ready' : 'Create First'})
        </button>
      </div>
    </div>
  );
};

export default PlaylistSelector;

