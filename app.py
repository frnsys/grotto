import os
import json
import config
from glob import glob
from lib import db, fn
from nom import md2html
from collections import defaultdict
from flask import Flask, Response, render_template, request, jsonify, send_from_directory

app = Flask(__name__)
db = db.CSVDB(config.DB_PATH)

def get_files(path):
    path = os.path.join(config.NOTES_DIR, path)
    if path.endswith('.md'):
        return [path]
    else:
        return glob(os.path.join(config.NOTES_DIR, path, '*.md'))

@app.route('/')
def index():
    return render_template('test.html')

@app.route('/<path:path>')
def notes(path):
    """Render single or directory of notes for tagging"""
    files = get_files(path)
    fns, idx = fn.make_footnotes(files)
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
    path = os.path.join(config.NOTES_DIR, path, 'assets', '/'.join(p))
    return send_from_directory(path, file)


@app.route('/<path:path>/fns')
def footnotes(path):
    """Render markdown for footnotes"""
    files = get_files(path)

    # Only show footnotes in db
    only = db.keys()
    fns, idx = fn.make_footnotes(files, id_len=config.FNID_LEN, only=only)
    return Response('\n'.join(fns), mimetype='text/plain')


@app.route('/<path:path>/tags')
def outline(path):
    """Render outline (organized tags)"""
    files = get_files(path)
    fns, idx = fn.make_footnotes(files)

    tags = defaultdict(list)
    for fnid in idx.keys():
        if fnid in db:
            for data, m in db[fnid].items():
                for tag in m['tags']:
                    tags[tag].append((data, m['type'], fnid[:config.FNID_LEN]))

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
        # Update tags
        # Assume the type hasn't changed
        if tags:
            db[fnid][data]['tags'] = tags

        # If no tags, delete this
        else:
            del db[fnid][data]
    elif tags:
        # Add new entry
        db[fnid][data] = {
            'type': type,
            'tags': tags
        }

    db.save()
    return jsonify(ok=True)


if __name__ == '__main__':
    app.run(debug=True)
