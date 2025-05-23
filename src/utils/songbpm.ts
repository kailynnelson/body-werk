interface SongBPMResponse {
  tempo: number;
  key: string;
  mode: string;
  time_signature: string;
}

export async function getSongBPM(artist: string, title: string, apiKey: string): Promise<SongBPMResponse | null> {
  try {
    const response = await fetch(
      `https://api.getsongbpm.com/tempo/?api_key=${apiKey}&artist=${encodeURIComponent(artist)}&song=${encodeURIComponent(title)}`
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch BPM: ${response.status}`);
    }

    const data = await response.json();
    return data.song || null;
  } catch (error) {
    console.error('Error fetching song BPM:', error);
    return null;
  }
} 