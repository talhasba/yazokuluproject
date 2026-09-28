# Local Program Editor

The Local Program Editor provides a browser form for updating catalogue facts and bilingual program-page content without manually editing JSON.

## Open the editor

Double-click `open-program-editor.bat`. It starts the local site and opens:

`http://localhost:5173/admin`

Keep the terminal window open while editing. The editor is available only through the local Node server; GitHub Pages does not provide its save API.

## Editing workflow

1. Search for a program or filter by provider.
2. Edit its overview, dates and pricing, English content, or Turkish content.
3. Use **Preview** to inspect the saved version of the redesigned program page.
4. Select **Save changes** or press `Ctrl+S`.
5. Open the local website for a final catalogue check.
6. Commit and push `data/program-editor-overrides.json` when the changes are ready for GitHub Pages.

The editor never rewrites `data/programs.normalized.json` or `data/program-digests.json`. It stores only fields that differ from the generated content in `data/program-editor-overrides.json`. Both the catalogue bundle and `program-page.js` merge these overrides at runtime.

Use **Reset changes** to remove all overrides for the selected program and return it to its generated source content.

## Safety

- The write API listens only on `127.0.0.1`.
- Save and reset requests require a random token inserted into the locally served editor page and accept only the local site origin.
- The server validates all editable fields before saving.
- Before each change, the previous override file is copied into `.local-editor/backups/`.
- Local backups are excluded from Git; the active override file is committed so approved edits can be published.
