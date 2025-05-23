export default function CreditsPage() {
  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Credits & Attributions</h1>
      
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Data Providers</h2>
        <div className="bg-black/30 backdrop-blur-sm p-6 rounded-lg border border-white/10">
          <h3 className="text-lg font-medium mb-2">GetSongBPM</h3>
          <p className="text-gray-300 mb-4">
            BPM (Beats Per Minute) data is provided by the GetSongBPM API. Visit their website for more
            information about song tempos and musical key information.
          </p>
          <a 
            href="https://getsongbpm.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md 
                     transition-colors duration-200"
          >
            Visit GetSongBPM
          </a>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">About This Project</h2>
        <div className="bg-black/30 backdrop-blur-sm p-6 rounded-lg border border-white/10">
          <p className="text-gray-300 mb-4">
            Body Werk is an open-source project that helps you organize your music by BPM,
            making it easier to create perfectly paced playlists for your workouts, dance sessions,
            or any other activity where music tempo matters.
          </p>
          <a 
            href="https://github.com/kailynnelson/body-werk"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-md 
                     transition-colors duration-200"
          >
            View on GitHub
          </a>
        </div>
      </section>
    </div>
  );
} 