Prompt 2: Android Application (Kotlin + Jetpack Compose)
"Act as a senior Android Developer. Build a native Android Quran Tafsir application using Kotlin and Jetpack Compose.

Requirements:

Architecture: Use MVVM architecture with Clean Architecture principles.

Data Handling: Load Quranic text and Tafsir from a local SQLite database (Room). Populate the database from a raw JSON asset on the first app launch.

Media: Implement Media3 (ExoPlayer) to stream audio/video from external URLs. Support background playback and notification controls.

Backend: Integrate the Supabase Kotlin SDK for cloud synchronization of user bookmarks and reading progress.

UI/UX: Use Material Design 3. Implement a bottom navigation bar, dynamic color support (Material You), and a custom reader screen with font size adjustment and theme switching (Light/Dark/Sepia).

Dependencies: Provide a clean build.gradle.kts with necessary dependencies (Room, Media3, Hilt for Dependency Injection, and the Supabase Kotlin SDK).
