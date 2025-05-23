# Body Werk - Spotify Playlist Danceability Sorter

A mobile-first web application that allows users to:
1. Log in with their Spotify account
2. Select one of their playlists
3. Create a new copy of that playlist, sorted by danceability score

## Setup

1. Create a Spotify Developer account and register your application at [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Create a `.env.local` file in the root directory with the following variables:
```env
SPOTIFY_CLIENT_ID=your_client_id
SPOTIFY_CLIENT_SECRET=your_client_secret
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_random_string
```

3. Install dependencies:
```bash
npm install
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Features

- Secure Spotify OAuth authentication
- Mobile-first responsive design
- Playlist selection interface
- Automatic playlist sorting by danceability
- Modern, clean UI with Tailwind CSS

## Tech Stack

- Next.js
- TypeScript
- Tailwind CSS
- NextAuth.js
- Spotify Web API

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
