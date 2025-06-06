import SpotifyWebApi from "spotify-web-api-node";

export const spotifyApi = new SpotifyWebApi({
  clientId: process.env['SPOTIFY_CLIENT_ID'],
  clientSecret: process.env['SPOTIFY_CLIENT_SECRET'],
});

export const SPOTIFY_SCOPES = [
  'playlist-read-private',
  'playlist-read-collaborative',
  'playlist-modify-private',
  'playlist-modify-public',
  'user-read-email',
  'user-read-private',
  'user-read-playback-state',
  'user-modify-playback-state',
];

export const getUserPlaylists = async (accessToken: string) => {
  spotifyApi.setAccessToken(accessToken);
  const response = await spotifyApi.getUserPlaylists();
  return response.body.items;
};

export const getPlaylistTracks = async (accessToken: string, playlistId: string) => {
  spotifyApi.setAccessToken(accessToken);
  try {
    const allTracks = [];
    let offset = 0;
    const limit = 50; // Smaller batch size to be safe
    
    while (true) {
      const response = await spotifyApi.getPlaylistTracks(playlistId, {
        offset: offset,
        limit: limit,
        fields: 'items(track(id,name,uri,artists(name))),total,next'
      });
      
      if (!response.body.items) break;
      
      // Filter out null tracks and ensure proper track structure
      const validTracks = response.body.items.filter(
        (item) => item?.track?.id && item?.track?.name && item?.track?.uri
      );
      
      allTracks.push(...validTracks);
      
      if (!response.body.next) break;
      offset += limit;
      
      // Safety check
      if (offset > response.body.total) break;
    }
    
    return allTracks;
  } catch (error) {
    console.error('Error in getPlaylistTracks:', error);
    throw error;
  }
};

export const getTracksAudioFeatures = async (accessToken: string, trackIds: string[]) => {
  if (!trackIds.length) return [];
  
  spotifyApi.setAccessToken(accessToken);
  try {
    // Process tracks in chunks of 100 (Spotify API limit)
    const chunkSize = 50; // Smaller batch size to be safe
    const features = [];
    
    for (let i = 0; i < trackIds.length; i += chunkSize) {
      const chunk = trackIds.slice(i, i + chunkSize);
      const response = await spotifyApi.getAudioFeaturesForTracks(chunk);
      if (response.body && response.body.audio_features) {
        features.push(...response.body.audio_features);
      }
      
      // Add a small delay between requests to avoid rate limits
      if (i + chunkSize < trackIds.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    return features.filter(feature => feature !== null);
  } catch (error) {
    console.error('Error in getTracksAudioFeatures:', error);
    throw error;
  }
};

interface CreatePlaylistOptions {
  name: string;
  description: string;
  public: boolean;
}

interface SpotifyTrack {
  id: string;
  name: string;
  uri: string;
}

interface SpotifyPlaylistResponse {
  id: string;
  name: string;
  description?: string | null;
  public?: boolean | null;
  collaborative?: boolean | null;
  tracks: {
    total: number;
    items: Array<{
      track: SpotifyTrack | null;
    }>;
  };
}

export const createPlaylist = async (
  accessToken: string,
  userId: string,
  playlistName: string,
  playlistDescription: string
) => {
  spotifyApi.setAccessToken(accessToken);
  try {
    const options: CreatePlaylistOptions = {
      name: playlistName,
      description: playlistDescription,
      public: false,
    };
    const createResponse = await spotifyApi.createPlaylist(userId, options);
    return createResponse.body as SpotifyPlaylistResponse;
  } catch (error) {
    console.error('Error in createPlaylist:', error);
    throw error;
  }
};

export const addTracksToPlaylist = async (
  accessToken: string,
  playlistId: string,
  trackUris: string[]
) => {
  if (!trackUris.length) return null;
  
  spotifyApi.setAccessToken(accessToken);
  try {
    const response = await spotifyApi.addTracksToPlaylist(playlistId, trackUris);
    return response.body;
  } catch (error) {
    console.error('Error in addTracksToPlaylist:', error);
    throw error;
  }
};

export const getPlaylist = async (accessToken: string, playlistId: string) => {
  spotifyApi.setAccessToken(accessToken);
  try {
    const response = await spotifyApi.getPlaylist(playlistId);
    return response.body;
  } catch (error) {
    console.error('Error in getPlaylist:', error);
    throw error;
  }
}; 