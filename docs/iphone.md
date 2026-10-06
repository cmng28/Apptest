# Still on your iPhone

Still is a web app with a Home Screen icon. The iPhone version is prepared; it needs an approved HTTPS hosting link before you can install it. The GitHub file page and ZIP are downloads, not the app's website.

## Once the website is approved and live

1. Open the app's website link in **Safari** on your iPhone.
2. Tap **Share** (the square with an upward arrow). On some Safari layouts it is inside the menu.
3. Choose **Add to Home Screen** and tap **Add**. Keep **Open as Web App** enabled if Safari offers that option.
4. Tap the new **Still** icon.
5. Make a test entry, close Still, and reopen it to confirm the entry stays saved.
6. In **My Taste**, wait for **Ready for offline use** before relying on it without an Internet connection.

The app can reopen and record entries offline after its files have been prepared online. When updating the app, close all Still windows/tabs and reopen it online so the new version can activate; updates do not erase journal storage.

## Save a backup

1. Open **My Taste** and tap **Save backup**.
2. If the share sheet appears, choose **Save to Files**. Otherwise, save the downloaded file from Safari.
3. Keep that file somewhere you can find again. It contains your personal journal, including notes. Sample entries are excluded.

To move entries from a computer, use the updated desktop app's **Save backup**, then choose that file on your iPhone. Add the Home Screen icon first and restore from the app opened through that icon.

## Restore a backup

In **My Taste**, tap **Restore backup**, choose the saved JSON file, and review the counts. **Keep current journal** cancels. **Replace with backup** replaces the current journal with the file; it does not merge two journals. Save your current backup first if you want to keep both.

Files are validated before restoration. An invalid file, failed storage write, or stale tab does not overwrite your existing journal. Backup files are limited to 10 MB. Backups and browser storage are not encrypted.

Safari and the Home Screen app may have separate storage. Each device/browser has its own journal; there is no account or automatic cloud sync. Clearing browser/site data can remove entries, so keep a backup.

## Hosting preparation — publication pending

- `downloads/Still-iphone-site.zip` contains the production website, icons, manifest and offline worker, ready for static HTTPS hosting.
- `.github/workflows/publish-iphone.yml` is **manual only**. Pushing code cannot publish the website. It builds and tests the app before publishing through GitHub Pages when an authorized user runs it.
- GitHub Pages must be available at no additional charge under the repository/account's existing settings. Those settings could not be inspected through the cloud's blocked GitHub API route. No account plan or repository visibility has been changed. If Pages requires a paid plan, use another approved free static host.
- After publication approval, configure Pages to use GitHub Actions and run **Publish Still after approval**. The Actions job reports the real website address on success. Do not treat a guessed address as a working app link.
- The hosted app page can be reachable by others. Personal entries stay in each browser and are never uploaded by the app.

## Development and validation

```sh
npm test
npm run test:e2e
npm run build
npm run test:iphone
```

`npm run package:iphone` rebuilds the hosted ZIP and refreshes the desktop ZIP, keeping its filenames and launcher so existing desktop storage can continue to be used at the same location. This packaging helper uses Python 3; the production website itself requires only static hosting.

Automated checks use phone-size Chromium, not a real iPhone. They verify the production app under a repository subpath, Home Screen metadata/icons, offline reopening, backup export/share paths, validated restore, cancellation and storage failure. The native iPhone installation and Save to Files sheet still need the device check above. A WebKit browser download was attempted but blocked by the environment's network policy; Safari behavior has not been claimed as tested.
