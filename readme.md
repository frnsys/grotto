Simple app to facilitate tagging and footnotes of markdown notes.

![](demo.gif)

Assumes notes are in the format of:

```markdown

# Rosset, P. M., & Altieri, M. A. (1997). Agroecology versus input substitution: a fundamental contradiction of sustainable agriculture. Society & Natural Resources, 10(3), 283-295.

Some notes

> A quotation

---

# Muller, A., Schader, C., Scialabba, N. E. H., Brüggemann, J., Isensee, A., Erb, K. H., ... & Niggli, U. (2017). Strategies for feeding the world more sustainably with organic agriculture. Nature communications, 8(1), 1290.

Some more notes

> Another quotation
```

That is, documents are separated by `---`, followed by the citation starting with `# `.

## Configuration

Edit the following values in `config.py`:

- `DB_PATH`: where the tag database (in CSV format) will be saved.
- `NOTES_DIR`: the directory to look for markdown notes in.

## Usage

Run the server with `python app.py`, which runs the app at `http://localhost:5000`.

### Opening a note

To open a markdown note, append the path to the app url. E.g. say my `NOTES_DIR` variable is `/home/ftseng/notes/research`, I can open the note at `/home/ftseng/notes/research/fertilizer.md` by visiting `http://localhost:5000/fertilizer.md`.

### Tagging text and images

To tag highlights in this note, select some text and hit `t`, then enter your tags (comma-separated). To add tags to an image, `CTRL+click` the image. Hit `ESC` to cancel out of the tag input.

Each article has an id generated for it (the `base64` encoded data preceding each article title). This id is generated from the article "title" (what follows the `#`, assumed to be a citation--see above). When you add tags, the tags and highlighted text or image path are associated with that article id in the saved CSV (specified with the `DB_PATH` configuration variable).

### Other items of note

- To generate markdown-formatted footnotes, click on the `Footnotes` link.
- To generate an "outline" (tagged texts/images grouped by tag), click on the `Outline` link.
