# Turntable for Android

Standalone Android edition of Turntable. It preserves the Turntable remote experience while connecting directly to Spotify from the phone through Authorization Code with PKCE.

## Spotify setup

Read [Spotify setup and callback hosting](docs/SPOTIFY-SETUP.md) before signing in or distributing the APK.

- Spotify callback: `https://peekabu411.github.io/spotify/callback`
- Callback/App Links host: [peekabu411.github.io](https://github.com/peekabu411/peekabu411.github.io)
- The app never contains a Spotify Client Secret.
- For self-service distribution, each user creates their own Spotify Developer app, registers the callback URL above, and enters their own Client ID in Turntable.

## Internal product label

`ver(A.9.10)` tracks the current Turntable feature generation. Android's numeric build version is maintained separately for installation updates.

## Development

```powershell
npm install
npm run sync:android
npm run open:android
```

Android Studio is used to run, sign, and package the APK.
