import os
import csv
import json
from glob import glob
from nom import md2html
from collections import defaultdict
from footnotes import make_footnotes
from flask import Flask, Response, render_template, request, jsonify, send_from_directory

app = Flask(__name__)
db = defaultdict(dict)
db_path = 'test.csv'
notes_dir = '/home/ftseng/notes/research'
fnid_len = 6


@app.route('/')
def index():
    return 'index'


@app.route('/<path:path>')
def notes(path):
    """Render single or directory of notes for tagging"""
    path = os.path.join(notes_dir, path)
    if path.endswith('.md'):
        files = [path]
    else:
        files = glob(os.path.join(notes_dir, path, '*.md'))

    fns, idx = make_footnotes(files)
    ids = {c: id for id, c in idx.items()}

    docs = []
    for f in files:
        lines = []
        for l in open(f, 'r').read().splitlines():
            if l.startswith('# '):
                if lines:
                    html = md2html.compile_markdown('\n'.join(lines))
                    docs.append(html)
                    docs.append('</article>')
                    lines = []
                c = l.strip('# ')
                docs.append('<article id="{id}"><a class="fn-ref" id="{id}">{id}</a>'.format(id=ids[c]))
            lines.append(l)
        if lines:
            html = md2html.compile_markdown('\n'.join(lines))
            docs.append(html)
            docs.append('</article>')

    html = '\n'.join(docs)
    tags = {}
    for fnid in idx.keys():
        if fnid in db:
            tags[fnid] = db[fnid]

    return render_template('notes.html', html=html, tags=json.dumps(tags))


@app.route('/<path:path>/assets/<path:asset_path>')
def asset(path, asset_path):
    """Serve assets (images)"""
    *p, file = asset_path.split('/')
    path = os.path.join(notes_dir, path, 'assets', '/'.join(p))
    return send_from_directory(path, file)


@app.route('/<path:path>/fns')
def footnotes(path):
    """Render markdown for footnotes"""
    path = os.path.join(notes_dir, path)
    if path.endswith('.md'):
        files = [path]
    else:
        files = glob(os.path.join(notes_dir, path, '*.md'))

    # Only show footnotes in db
    only = db.keys()
    fns, idx = make_footnotes(files, id_len=fnid_len, only=only)
    return Response('\n'.join(fns), mimetype='text/plain')


@app.route('/<path:path>/tags')
def outline(path):
    """Render outline (organized tags)"""
    path = os.path.join(notes_dir, path)
    if path.endswith('.md'):
        files = [path]
    else:
        files = glob(os.path.join(notes_dir, path, '*.md'))
    fns, idx = make_footnotes(files)

    tags = defaultdict(list)
    for fnid in idx.keys():
        if fnid in db:
            for data, m in db[fnid].items():
                for tag in m['tags']:
                    tags[tag].append((data, m['type'], fnid[:fnid_len]))

    outline = []
    for tag, ds in tags.items():
        outline.append('# {}\n'.format(tag))
        for data, typ, fnid in ds:
            outline.append('- {}[^{}]'.format(data, fnid))
        outline.append('\n')

    return Response('\n'.join(outline), mimetype='text/plain')



@app.route('/tag', methods=['POST'])
def tag():
    """Endpoint for saving tags"""
    data = request.get_json()
    fnid = data['fnid']
    tags = data['tags']
    type = data['type']
    data = data['data']

    if data in db[fnid]:
        # Assume the type hasn't changed
        # Append tag (if new)
        existing = db[fnid][data]
        for tag in tags:
            if tag not in existing['tags']:
                existing['tags'].append(tag)
    else:
        # Add new entry
        db[fnid][data] = {
            'type': type,
            'tags': tags
        }

    save_db(db, db_path)
    return jsonify(ok=True)


def load_db(path):
    """Load a CSV 'database'"""
    db = defaultdict(dict)
    with open(path, newline='') as f:
        reader = csv.reader(f, delimiter=',', quotechar='"', quoting=csv.QUOTE_MINIMAL)
        for row in reader:
            fnid, data, tags, type = row
            tags = tags.split(',')
            db[fnid][data] = {
                'type': type,
                'tags': tags
            }
    return db


def save_db(db, path):
    """Save a CSV 'database'"""
    # Write to tmp file first
    tmpfile = '/tmp/.scanner.csv'
    with open(tmpfile, 'w', newline='') as f:
        writer = csv.writer(f, delimiter=',', quotechar='"', quoting=csv.QUOTE_MINIMAL)
        for fnid, annos in db.items():
            for data, m in annos.items():
                writer.writerow([fnid, data, ','.join(m['tags']), m['type']])
        f.flush()
        os.fsync(f.fileno())

    # Safe to overwrite existing file
    os.rename(tmpfile, path)


if __name__ == '__main__':
    db = load_db(db_path)
    app.run(debug=True)
