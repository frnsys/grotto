Helper script to go through a note (ending in `.md`) or directory of notes and generate ids for each cited document.

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

## Usage

To generate the list of footnotes:

```
python footnotes.py my_notes.md
```

This outputs to stdout, so you might want to do:

```
python footnotes.py my_notes.md > my_notes.fn.md
```

To generate a version of the documentation to make note sorting easier:

```
python footnotes.py my_notes.md annotate
```

This basically copies the original notes, merges them into a single file, and adds footnote ids to each section.

For example:

```markdown

# Rosset, P. M., & Altieri, M. A. (1997). Agroecology versus input substitution: a fundamental contradiction of sustainable agriculture. Society & Natural Resources, 10(3), 283-295.
<a class="fn-ref" id="3795f">3795f</a>


Some notes

> A quotation

---

# Muller, A., Schader, C., Scialabba, N. E. H., Brüggemann, J., Isensee, A., Erb, K. H., ... & Niggli, U. (2017). Strategies for feeding the world more sustainably with organic agriculture. Nature communications, 8(1), 1290.
<a class="fn-ref" id="03cf0">03cf0</a>

Some more notes

> Another quotation
```

This also includes a script to make citing these notes easier, available after compiling the note to HTML and viewing in a browser (e.g. with [`nom`](https://github.com/frnsys/nom)). When you copy a note, a markdown footnote reference will be added to the clipboard data.

For example, say you copy `Some more notes`. The clipboard data will be `Some more notes [^03cf0]`.
