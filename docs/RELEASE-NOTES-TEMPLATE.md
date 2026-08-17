# Turntable Android release notes template

## Turntable Android A.X.Y.Z

Download: [APK](PASTE_RELEASE_APK_LINK_HERE)

### What changed

- [Change]
- [Fix]
- [Known limitation, if any]

### Install or update

1. Download the APK from this Release.
2. Allow installs from the downloading browser/file manager if Android asks.
3. Install the APK. If Android reports a signature conflict, uninstall the older development APK first; this removes local Turntable data.

### First-time Spotify setup

1. Enable `peekabu411.github.io` under **Settings → Apps → Turntable → Set as default → Open supported web addresses**.
2. In Spotify Developer Dashboard, add this Redirect URI exactly:
   `https://peekabu411.github.io/spotify/callback`
3. Paste your Spotify Developer Client ID into Turntable and connect Spotify.

### Need help?

Read the [full setup and troubleshooting guide](../README.md#troubleshooting). Include reports with the Android device model, Android version, browser used for Spotify sign-in, and a screenshot of the error—never a Spotify password, Client Secret, or access token.
