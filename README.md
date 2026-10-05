# Stress-test FRED · workshop website

Website for *Stress-test FRED*, a community red-teaming workshop at D3A 2026
(Thursday, 8 October 2026, 11:00–12:30, Hotel Nyborg Strand, Nyborg).

Live site, once GitHub Pages is enabled: https://eparascho.github.io/stress-test-fred/

Plain HTML, CSS and JavaScript: no build step and no dependencies.

## Structure

| Path | What it is |
| --- | --- |
| `index.html` | All six tabs: Home, Agenda, Meet FRED, Examples, Instructions, Findings |
| `assets/js/config.js` | Links to FRED and the report form, and the contact email |
| `assets/js/examples-data.js` | The red-teaming example conversations |
| `assets/js/main.js` | Tab switching, slide viewer and examples explorer |
| `assets/css/styles.css` | All styling; colors and fonts are defined at the top |
| `assets/slides/` | Slide images, thumbnails, PDF and manifest exported from the deck |
| `assets/img/` | FRED app image and team photos |
| `scripts/export-slides.ps1` | Regenerates `assets/slides/` from the PowerPoint deck |

Every tab has its own link, for example `https://eparascho.github.io/stress-test-fred/#examples`.

## Editing content

- **Text**: edit `index.html`. Each tab is a `<section class="page">` with a comment banner above it.
- **Placeholders**: text that still needs real content is wrapped in `<span class="todo">[…]</span>` and is
  highlighted in amber on the page. Search for `class="todo"` to find every one.
- **Links and email**: fill in `assets/js/config.js`. Until a value is filled in, its button shows a
  "coming soon" state.
- **Team photos**: add a square JPG (about 400 × 400 px) to `assets/img/team/`, then replace the person's
  initials `<span class="person__avatar …">` with an `<img class="person__avatar" …>` like the others.

## Red-teaming examples

Edit `assets/js/examples-data.js`; the format is documented at the top of the file. Each risk has one
conversation with benign intent and one with adversarial intent. In a message:

- wrap the exact words where the risk appears in `==double equals signs==` to highlight them;
- add `risk: "…"` to flag the message and show the explanation underneath it.

The last two items in the risks list open pop-ups (the risk word cloud and a prompt to think of new risks).
Their text is in `index.html`, in the `<dialog>` elements of the Examples tab.

## Updating the slides

The Agenda tab shows images exported from the workshop deck. After changing the deck, run this on
Windows with PowerPoint installed:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\export-slides.ps1 -Deck "C:\path\to\deck.pptx"
```

It rewrites the images, thumbnails, PDF and `slides.js` in `assets/slides/`. Hidden slides are skipped and
speaker notes are never exported. Install the deck's font,
[Plus Jakarta Sans](https://fonts.google.com/specimen/Plus+Jakarta+Sans), before exporting, or PowerPoint
renders the slides with a substitute font.

## Preview locally

```bash
python -m http.server 8000
```

Then open http://localhost:8000.

## Publish with GitHub Pages

1. Commit and push this repository to GitHub.
2. In the repository on GitHub, open **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**, select **main** and **/ (root)**, and save.

The site goes live at https://eparascho.github.io/stress-test-fred/ within a few minutes. The empty
`.nojekyll` file tells GitHub Pages to serve the files as they are.
