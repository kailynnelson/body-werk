import type { DefaultSession } from "next-auth";
import type { JWT as NextAuthJWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session extends DefaultSession {
    accessToken?: string;
    error?: string;
    user?: {
      id?: string;
    } & DefaultSession["user"];
  }

  interface Profile {
    id: string;
    display_name: string;
    email: string;
    images?: { url: string }[];
  }
}

declare module "next-auth/jwt" {
  interface JWT extends NextAuthJWT {
    accessToken?: string;
    refreshToken?: string;
    accessTokenExpires?: number;
    id?: string;
    error?: string;
  }
} 