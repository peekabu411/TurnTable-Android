# Spotify setup and callback hosting

Turntable for Android uses Spotify Authorization Code with PKCE. The app controls Spotify through the Web API; it does not use or store a Spotify Client Secret.

## The shared callback

The exact redirect URI is:

```
https://peekabu411.github.io/spotify/callback
```

This is only Spotify's secure return address after a user approves sign-in. It does not identify the user, receive their Spotify password, or store their tokens. Android verifies the domain with the public `assetlinks.json` file and then reopens Turntable with the authorization result.

The hosted source is in the separate public GitHub Pages repository:

- https://github.com/peekabu411/peekabu411.github.io
- https://peekabu411.github.io/.well-known/assetlinks.json
- https://peekabu411.github.io/spotify/callback/

The callback needs to stay online and unchanged. Do not delete the Pages repository or change this URL without updating Android, rebuilding the APK, and changing every Spotify Developer app that uses it.

## Setup for the app owner

1. In the Spotify Developer Dashboard, create an app.
2. Add the exact redirect URI above in **Redirect URIs** and save it.
3. Select **Web API**. The Web Playback SDK is not required by Turntable.
4. Build and install the APK.
5. Open Turntable, enter the app's **Client ID**, and approve Spotify access.

Never paste a Client Secret into Turntable. PKCE is specifically designed for an installed app without a secret.

## Setup for another downloader

For a self-service installation, each person:

1. Creates their own Spotify Developer app.
2. Registers the same shared callback URI above.
3. Installs Turntable.
4. Enters their own Client ID on Turntable's Connect Spotify screen.
5. Signs in to their own Spotify account.

They do not need their own domain, callback page, GitHub account, or access to the app owner's Spotify account. Their Spotify access and refresh tokens are kept on their own phone.

## Why each user should use their own Client ID

Spotify development-mode apps can only serve up to five allowlisted Spotify users. Using one shared Client ID means the app owner must manually maintain that allowlist. Giving each downloader their own Client ID avoids that administrative burden for a personal/community distribution.

## Android App Links and signing

The Pages repository contains:

```
.well-known/assetlinks.json
spotify/callback/index.html
.nojekyll
```

`assetlinks.json` currently contains the SHA-256 fingerprint for this project's debug signing key and package name:

```
com.luigimendoza.turntable
01:38:A4:6D:DC:F6:46:6D:DB:0A:D6:1A:98:06:A0:E9:5A:8B:9D:C5:D2:95:00:62:C3:DB:E9:2A:58:42:28:3A
```

Before distributing a release-signed APK, obtain its certificate SHA-256 fingerprint and add it as another value in `sha256_cert_fingerprints` in the Pages repository. Keep the debug fingerprint too if debug builds will continue to be used.

Example:

```powershell
keytool -list -v -keystore path\to\release.keystore -alias your-key-alias
```

Then wait for GitHub Pages to deploy before testing sign-in.

## Build a debug APK

```powershell
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
$env:ANDROID_SDK_ROOT = $env:ANDROID_HOME
cd android
.\gradlew.bat --no-daemon :app:assembleDebug
```

The output is:

```
android\app\build\outputs\apk\debug\app-debug.apk
```
## Troubleshooting: browser does not return to Turntable

After approving Spotify, Android should reopen Turntable automatically. Some Android versions and manufacturer software—such as Oppo/ColorOS, Samsung, Xiaomi, and others—can instead leave Chrome on a blank **Returning to Turntable…** page when supported app links are disabled or verification has not been refreshed.

1. Open **Android Settings → Apps → Turntable → Open by default** (the wording varies by brand).
2. Enable **Open supported links** / **Open in this app** for Turntable.
3. If it was already enabled, clear Turntable’s defaults, reopen the app, and try **Connect Spotify** again.
4. Keep the same HTTPS Redirect URI in the Spotify Developer Dashboard. Do not replace it with a browser URL or Client Secret.

Turntable will show this guidance on the connection screen when it has not received the browser return. The authorization code is protected by PKCE; do not copy or share it from the callback page.
