import NextAuth, { DefaultSession } from "next-auth";
import SpotifyProvider from "next-auth/providers/spotify";
import { JWT } from "next-auth/jwt";

interface ExtendedToken extends JWT {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  error?: string;
  id?: string;
}

// Add Spotify profile type
interface SpotifyProfile {
  id: string;
  display_name: string;
  email: string;
  images?: { url: string }[];
}

// Extend the built-in session type
interface ExtendedSession extends DefaultSession {
  accessToken?: string;
  error?: string;
}

// Spotify scopes from official documentation
const scopes = [
  'playlist-read-private',
  'playlist-read-collaborative',
  'playlist-modify-private',
  'playlist-modify-public',
  'user-read-email',
  'user-read-private',
  'user-read-playback-state',
  'user-modify-playback-state',
  'user-library-read',
  'user-library-modify',
  'user-top-read',
  'user-read-recently-played',
  'user-follow-read',
  'user-follow-modify',
  'streaming',
  'app-remote-control',
  'user-read-currently-playing',
  'ugc-image-upload'
].join(' ');

async function refreshAccessToken(token: ExtendedToken): Promise<ExtendedToken> {
  try {
    console.log("Refreshing access token...");
    
    const response = await fetch("https://accounts.spotify.com/api/token", {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(
          `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
        ).toString("base64")}`,
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: token.refreshToken,
      }),
      method: "POST",
    });

    const data = await response.json();

    if (!response.ok) {
      throw data;
    }

    console.log("Token refreshed successfully");
    
    return {
      ...token,
      accessToken: data.access_token,
      refreshToken: data.refresh_token ?? token.refreshToken,
      expiresAt: Date.now() + data.expires_in * 1000,
    };
  } catch (error) {
    console.error("Error refreshing access token:", error);
    return {
      ...token,
      error: "RefreshAccessTokenError",
    };
  }
}

const handler = NextAuth({
  providers: [
    SpotifyProvider({
      clientId: process.env.SPOTIFY_CLIENT_ID!,
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: scopes,
          show_dialog: true, // Force re-consent
          access_type: 'offline',
          response_type: 'code',
        },
      },
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/auth/signin',
  },
  callbacks: {
    async jwt({ token, account, profile }) {
      // Initial sign in
      if (account && profile) {
        const spotifyProfile = profile as SpotifyProfile;
        console.log("Initial sign in, setting token with account:", {
          accessToken: account.access_token?.slice(-10),
          refreshToken: account.refresh_token?.slice(-10),
          expiresAt: account.expires_at,
          profile: spotifyProfile.id
        });
        
        return {
          ...token,
          accessToken: account.access_token,
          refreshToken: account.refresh_token,
          expiresAt: (account.expires_at || 0) * 1000,
          id: spotifyProfile.id,
        } as ExtendedToken;
      }

      const extendedToken = token as ExtendedToken;

      // Return previous token if the access token has not expired
      if (Date.now() < extendedToken.expiresAt) {
        return extendedToken;
      }

      console.log("Token expired, refreshing...");
      // Access token has expired, refresh it
      return refreshAccessToken(extendedToken);
    },
    async session({ session, token }) {
      const extendedToken = token as ExtendedToken;
      
      if (extendedToken.error) {
        console.error("Token error:", extendedToken.error);
        throw new Error("Failed to refresh access token");
      }
      
      if (session.user) {
        session.user.id = token.id as string;
      }
      
      session.accessToken = extendedToken.accessToken;
      session.refreshToken = extendedToken.refreshToken;
      session.expiresAt = extendedToken.expiresAt;
      
      console.log("Session updated with token:", {
        userId: session.user?.id,
        tokenEnd: session.accessToken?.slice(-10),
        expiresIn: Math.round((session.expiresAt - Date.now()) / 1000 / 60) + " minutes"
      });
      
      return session;
    },
  },
  debug: process.env.NODE_ENV === 'development',
});

export { handler as GET, handler as POST }; 