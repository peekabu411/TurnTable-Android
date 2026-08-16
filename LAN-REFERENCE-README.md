# Turntable Remote

Turntable Remote lets a phone control Spotify playing on a Windows PC or Mac over the same trusted Wi-Fi network. It is designed for landscape use and includes album, vinyl, lyrics, playlist, queue, Dial, and vertical Bar layouts.

> New user? You do not need to know PowerShell, Terminal, Node.js, or programming. Choose the guide for your computer below and follow it in order.

## Start here

1. Keep the computer and phone on the same private Wi-Fi network.
2. Install and sign in to the Spotify desktop app on the computer.
3. Confirm the Spotify account has Premium.
4. Choose your computer:

   - [Windows beginner installation](docs/INSTALL-WINDOWS.md)
   - [macOS beginner installation](docs/INSTALL-MACOS.md)

5. After computer setup, choose your phone:

   - [iPhone and iPad setup using Safari](docs/PHONE-IOS.md)
   - [Android setup using Chrome](docs/PHONE-ANDROID.md)

6. Open Spotify on the computer and **play one song in the desktop client first**. This gives Spotify an active playback device and lets the remote synchronize.

## Ways to obtain the project

Use one method. GitHub Releases is recommended because a release ZIP can include a checksum manifest that Setup verifies locally.

### A. GitHub Release ZIP — recommended

1. Open this project's GitHub **Releases** page.
2. Download the newest Turntable Remote ZIP from **Assets**.
3. Extract the entire ZIP before running Setup. Do not run Setup from inside the ZIP preview.
4. Keep `checksums.sha256` beside the setup files. Setup uses it to detect missing or modified files.

### B. Git clone

1. Install Git from its official website if it is not already available.
2. Open PowerShell or Terminal.
3. Run `git clone <repository-url>` using this project's GitHub URL.
4. Open the downloaded `spotify-lan-remote` folder.

Git's object verification protects the clone. A development clone may not include a release checksum manifest.

### C. Folder or ZIP sent directly by the creator

1. Ask the sender to provide the ZIP and its SHA-256 value separately.
2. Extract it completely.
3. Run the included verification script before Setup.
4. If verification fails, do not bypass the warning. Obtain a fresh copy from the creator or GitHub.

## What Setup does

With permission, Setup:

- verifies release files when a checksum manifest is present;
- installs the project in a stable local application folder;
- detects Node.js and offers to install it when missing;
- opens Spotify Developer Dashboard and shows exactly what to enter;
- creates the private local configuration;
- uses a four-digit phone PIN, starting with `0000`;
- starts the server automatically and opens Spotify authorization;
- displays the phone address and connection checklist.

Your Spotify Client Secret and authorization tokens stay on the computer. They are excluded from Git and from distribution packages.

## Everyday use

1. On Windows, open **DASHBOARD - Windows.cmd**. On macOS, open **DASHBOARD - macOS.command**.
2. Confirm the server says **Running**.
3. Open Spotify on the computer and start a song.
4. Open the saved Turntable Remote shortcut on the phone.

The server must remain running while the phone controls Spotify. The graphical Dashboard can start, stop, restart, authorize, and diagnose it.

## Safety

Read [File verification and security](docs/SECURITY.md). Checksums detect changed files, but Windows SmartScreen and macOS Gatekeeper can still warn about unsigned community software. Fully removing those warnings requires trusted code signing and, on macOS, notarization.

## More help

- [Complete advanced guide](docs/ADVANCED-GUIDE.md)
- [Troubleshooting](docs/TROUBLESHOOTING.md)
- [Creating a safe distribution ZIP](docs/DISTRIBUTION.md)

Do not expose port `8787` to the public internet. This project is intended for a trusted home network.
