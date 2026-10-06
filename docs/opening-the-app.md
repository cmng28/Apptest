# Opening Still on a computer

The cloud environment setup screen does not provide a live app preview or downloadable workspace attachments. Publishing an environment snapshot is separate from delivering or hosting this application.

## Portable app

After the repository files have been uploaded to GitHub, open `downloads/Still.zip` in the GitHub file browser and use **Download raw file**. Extract the ZIP on your computer.

The ZIP contains the complete app as `Still.html`, a Python 3 local launcher (`start.py`), and `OPEN_ME.txt` with instructions. There are no external app downloads, services, accounts, or fees.

For the tested launcher path, open a terminal in the extracted folder and run:

```sh
# macOS or Linux
python3 start.py

# Windows
py start.py
```

The launcher opens your browser and serves only Still on your computer. Keep the terminal open while using it; Ctrl+C stops it. Nothing is publicly hosted. Entries stay in your browser rather than being sent to the launcher.

You may also open `Still.html` directly in Chrome or Edge. Direct-file opening could not be verified in the managed cloud browser because its administrator policy blocks file URLs. If your browser blocks direct-file apps or storage, use the launcher.

Use the same opening method and browser profile each time. Direct-file and launcher modes have separate storage. For direct-file mode, keep the HTML file at the same path. Clearing browser data removes journal entries; storage is not encrypted.

## Development source

The source app is at the repository root. See [README.md](../README.md) for Node/npm installation, development, build, and test commands.

## Portable-package validation

The exact bundled HTML passed add, edit, delete, sample navigation, reload retrieval, and persistence after fully restarting Chromium. Interactions also worked offline after the document loaded. The included local launcher passed save, reload, browser restart, retrieval, and deletion. Both checks recorded zero page errors and zero external requests. The ZIP contains the same validated HTML bytes.
