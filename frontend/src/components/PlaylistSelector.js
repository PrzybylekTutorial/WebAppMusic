import React from 'react';

const PlaylistSelector = ({ useDynamicPlaylist, setUseDynamicPlaylist, dynamicPlaylistId }) => {
  return (
    <div className="playlist-selector">
      <h3 className="section-title-center">
        🎵 Choose Your Music Source
      </h3>
      <div className="mode-buttons-container">
        <button 
          onClick={() => setUseDynamicPlaylist(false)}
          className="mode-button"
          style={{ 
            backgroundColor: !useDynamicPlaylist ? '#28a745' : '#6c757d',
          }}
        >
          📻 Original Playlist
        </button>
        <button 
          onClick={() => setUseDynamicPlaylist(true)}
          disabled={!dynamicPlaylistId}
          className="mode-button"
          style={{ 
            backgroundColor: useDynamicPlaylist && dynamicPlaylistId ? '#007bff' : '#6c757d',
            cursor: dynamicPlaylistId ? 'pointer' : 'not-allowed',
          }}
        >
          🎲 Dynamic Database ({dynamicPlaylistId ? 'Ready' : 'Create First'})
        </button>
      </div>
    </div>
  );
};

export default PlaylistSelector;

