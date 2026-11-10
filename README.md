# Snapchat Web on iPhone

Snapchat for Web refuses to run on phones. Both options here present iPhone
Safari/WebKit to it as desktop Safari, so you can use Snapchat without the app.

## Option 1: userscript (2 minutes)

1. Install **Userscripts** from the App Store, open it once and pick a scripts folder.
2. Settings → Apps → Safari → Extensions → Userscripts: turn on, allow snapchat.com.
3. In Safari open
   https://raw.githubusercontent.com/ChristianRelf/snapchat/main/snapchat-web-iphone.user.js
   and install it from the Userscripts extension menu.
4. Leave "Request Desktop Website" off and open `www.snapchat.com/web`.

## Option 2: Snap Web app (more reliable)

A small app that loads Snapchat Web in a web view. Its spoof runs before any
Snapchat code and isn't affected by the page's CSP, so it can't lose a race
or be blocked the way the userscript can.

1. Download `SnapWeb.ipa` from the
   [latest release](https://github.com/ChristianRelf/snapchat/releases/latest).
2. Sign and install it with [Sideloadly](https://sideloadly.io) (Windows/Mac),
   [AltStore](https://altstore.io) or [SideStore](https://sidestore.io) using your Apple ID.
3. On the phone: Settings → General → VPN & Device Management → trust your Apple ID,
   and turn on Settings → Privacy & Security → Developer Mode.

With a free Apple ID the app must be re-signed every 7 days (AltStore/SideStore
can do this automatically).

The IPA is built by GitHub Actions on every push to `app/`
(`.github/workflows/build-ipa.yml`). To change the page width, edit
`VIEWPORT_WIDTH` in `app/SnapWeb/spoof.js`.

## Limitations

- Login may need an SMS code or a recovery code if two-factor is on.
- AR lenses may not work; no push notifications in the app.
- If Snapchat changes its device checks, these need updating.
