# Turntable for Android

Turntable is a standalone Android Spotify remote. It connects directly to a listener's Spotify account through Authorization Code with PKCE; it does not require the original LAN remote.

## Download and install

1. Open the repository's [Releases](https://github.com/peekabu411/TurnTable-Android/releases) page and download the newest APK.
2. Android may ask you to allow installs from the browser or file manager used for the download. Allow that source, install the APK, then open Turntable.
3. Keep the APK only from this repository's official Releases page. Never install a modified APK sent from an unknown source.

## First launch: allow Spotify to return to Turntable

On Android 12 and newer, Turntable checks whether Android is allowed to open Turntable after Spotify sign-in.

1. If Turntable shows **Let links return to Turntable**, tap **Open Turntable link settings**.
2. In Android Settings, choose **Set as default**.
3. Turn on **Open supported web addresses**.
4. Enable `peekabu411.github.io`.
5. Return to Turntable and tap **I enabled it — Check again**.

The guide appears only once when Android reports that the link is disabled. To show it again later, use **Settings → Setup → Show link setup again**. Resetting this guide does not disconnect Spotify or erase your visual settings.

## Connect Spotify

Each person should use a Spotify Developer app and their own Client ID while this project is distributed outside the Play Store.

1. Sign in at the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard).
2. Create an app, select **Web API**, and open its settings.
3. Add this Redirect URI exactly:

   `https://peekabu411.github.io/spotify/callback`

4. Save the Spotify app settings.
5. Copy that app's **Client ID**—not a Client Secret.
6. In Turntable, paste the Client ID in the Devices/pairing area and choose **Connect Spotify**.

Turntable never needs or stores a Spotify Client Secret. A Client ID identifies the Spotify developer app; it is not the user's password.

## Troubleshooting

### Android will not install the APK

Allow installs from the browser or file manager that downloaded it, then retry. If an older Turntable build was signed differently, uninstall the old app before installing this debug build; this only removes local app data on that phone.

### Browser says “Returning to Turntable,” but Turntable does not continue

Open **Settings → Apps → Turntable → Set as default** and turn on **Open supported web addresses** for `peekabu411.github.io`. Then return to Turntable, open **Settings → Setup → Show link setup again**, and check the setting again. This is especially important on Oppo/ColorOS and other Android builds that keep the callback open in Chrome.

### Browser shows a blank page or `localhost` connection error after Spotify approval

The Spotify Redirect URI must be exactly `https://peekabu411.github.io/spotify/callback`—not `localhost`, not the Android custom URI, and with no extra slash. Update it in Spotify Developer Dashboard, save, and reconnect from Turntable.

### Spotify says “redirect URI mismatch”

The redirect URI saved in the Spotify Developer Dashboard does not exactly match Turntable's callback. Copy and paste the URI above exactly, save the Spotify app settings, then try again.

### Turntable says “Spotify auth expired”

Reconnect Spotify from Turntable. Before doing so, confirm the supported-link setting above is enabled. If it still expires, verify that the Client ID belongs to the Spotify app where the callback was saved.

### No Spotify devices or playback controls fail

Open the Spotify app on a device, start playing something, then use Turntable's refresh control. Spotify playback control generally requires Spotify Premium, and the selected playback device must be available to the signed-in account.

### A new APK will not update the previous one

APK updates must use the same application signing key. For this development distribution, download each release only from this repository. If Android reports a signature conflict, uninstall the old Turntable APK and install the new one; note that this removes local Turntable data.

## Sharing a release

When you share Turntable, send the GitHub Release link—not an APK copied through chat. Include these items:

- Current version and date
- APK download link
- A short list of changes and known issues
- The first-launch supported-link instructions
- The Spotify callback URI
- A link to this README's troubleshooting section

A reusable [release-notes template](docs/RELEASE-NOTES-TEMPLATE.md) is included for every future release.

## Privacy and safety

- The APK does not request storage, contacts, location, camera, microphone, or SMS permissions.
- Spotify authorization happens in Spotify's browser flow; Turntable does not see the Spotify password.
- The app stores connection and display preferences locally on the phone.
- Do not publish a Spotify Client Secret, personal access token, or private signing key in the repository or a release.

## Development

```powershell
npm install
npm run sync:android
npm run open:android
```

Android Studio is used to run, sign, and package the APK. See the release-notes template before publishing.
