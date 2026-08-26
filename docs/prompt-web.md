> **Historical prompt.** This is the original spec that generated the web app. Note the
> "Backend: Integrate Supabase…" requirement below was **superseded**: the web app uses a
> Cloudflare Worker + D1 backend (`workers/tafsir-api/`, device-ID keyed, no auth), not Supabase.
> Supabase is retained only as a reference for the planned Kotlin app. See `supabase/README.md`.

Prompt 1: Web Application (React + Vite)
"Act as a senior Frontend Developer. Build a high-performance Quran Tafsir web application using React (Vite) and Tailwind CSS.

Requirements:

Data Structure: The application must load Quranic text and Tafsir locally from a JSON file (located in /public/data).

Media: Display audio and video content using external links fetched from the data file. Use standard HTML5 <audio> and <video> tags with custom UI controls.

Features: Implement search functionality for the local data, and a 'Favorites' system.

Backend: Integrate Supabase for user authentication and to sync user favorites and notes across devices.

Design: Use a clean, modern, mobile-first design with Material Design 3 principles. Include a 'Dark Mode' and a 'Sepia' reading mode.

Performance: The app must be a SPA (Single Page Application) with fast loading times.
