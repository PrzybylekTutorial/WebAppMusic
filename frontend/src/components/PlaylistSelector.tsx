import React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface PlaylistSelectorProps {
  useDynamicPlaylist: boolean;
  setUseDynamicPlaylist: (use: boolean) => void;
  dynamicPlaylistId: string | null;
}

const PlaylistSelector: React.FC<PlaylistSelectorProps> = ({ useDynamicPlaylist, setUseDynamicPlaylist, dynamicPlaylistId }) => {
  return (
    <div className="mb-8 transition-opacity duration-300">
      <h3 className="text-center mb-5 text-[var(--color-text-primary)] font-[var(--font-headers)] text-xl font-bold">
        🎵 Choose Your Music Source
      </h3>
      <div className="flex justify-center gap-4 flex-wrap">
        <Button 
          onClick={() => setUseDynamicPlaylist(false)}
          className={cn(
            "rounded-full font-bold shadow-md transition-all px-5 py-3 h-auto text-white",
            !useDynamicPlaylist ? "bg-green-500 hover:bg-green-600" : "bg-gray-500 hover:bg-gray-600"
          )}
        >
          📻 Original Playlist
        </Button>
        <Button 
          onClick={() => setUseDynamicPlaylist(true)}
          disabled={!dynamicPlaylistId}
          className={cn(
            "rounded-full font-bold shadow-md transition-all px-5 py-3 h-auto text-white",
            useDynamicPlaylist && dynamicPlaylistId ? "bg-blue-500 hover:bg-blue-600" : "bg-gray-500 hover:bg-gray-600",
            !dynamicPlaylistId && "cursor-not-allowed opacity-50"
          )}
        >
          🎲 Dynamic Database ({dynamicPlaylistId ? 'Ready' : 'Create First'})
        </Button>
      </div>
    </div>
  );
};

export default PlaylistSelector;
