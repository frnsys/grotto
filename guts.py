import os
import json
import config
import paramiko
import subprocess
from tqdm import tqdm
from lib import db, fn
from nom import html2md
from scp import SCPClient
from slugify import slugify
from collections import defaultdict


def sync_remote_hili(remote, local):
    """sync remote hili data to local"""
    conn, path = remote.split(':')
    user, host = conn.split('@')
    ssh = paramiko.SSHClient()
    ssh.load_system_host_keys()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(host, 22, user)
    scp = SCPClient(ssh.get_transport())

    annos_path = os.path.join(path, 'annos.json')
    scp.get(annos_path, '/tmp/annos.json')

    local = os.path.expanduser(local)
    annos_path = os.path.join(local, 'annos.json')

    with open(annos_path, 'r') as f:
        lines = f.read().splitlines()

    # Add new lines from remote
    new_lines = []
    with open('/tmp/annos.json', 'r') as f:
        for l in f.read().splitlines():
            if l not in lines:
                new_lines.append(l)
    if new_lines:
        with open(annos_path, 'a') as f:
            f.write('\n'.join(new_lines)+'\n')

    # Synchronize assets
    subprocess.run([
        'rsync',
        '-ravu',
        '--progress',
        os.path.join(remote, 'assets/'),
        os.path.join(local, 'assets')
    ])


def sync_notes():
    db_ = db.CSVDB(config.DB_PATH)
    changes = {
        'citations': set(),
        'books': set()
    }

    print('Synchronizing remote hili to local...')
    sync_remote_hili(config.HILI_REMOTE, config.HILI_LOCAL)

    print('Adding hili annotations to grotto db...')
    hili = os.path.join(os.path.expanduser(config.HILI_LOCAL), 'annos.json')
    with open(hili, 'r') as f:
        for l in tqdm(f.read().splitlines()):
            anno = json.loads(l)
            url = anno['href']
            title = anno['title']
            citation = '{}. <{}>'.format(title, url)
            tags = anno['tags']
            if 'file' in anno:
                type = 'image'
                data = 'assets/{}'.format(anno['file']['name'])
            else:
                type = 'text'
                data = html2md.html_to_markdown(anno['html'])
            fnid = fn.make_id(citation)

            # Only add new entries
            # Since old entries may have been changed
            # in the database
            if data not in db_[fnid]:
                db_[fnid][data] = {
                    'type': type,
                    'tags': tags
                }
                db_.sources[fnid] = citation
                changes['citations'].add(citation)
        db_.save()

    # Kobo
    print('Adding kobo annotations to notes...')
    kobo_out = os.path.expanduser(config.KOBO_OUTPUT)
    with open(os.path.expanduser(config.KOBO), 'r') as f:
        kobo = json.load(f)
        books = defaultdict(list)
        cites = {}
        for h in kobo:
            title = h['title'].strip()
            author = h['author']
            anno = h['anno']
            text = h['text']
            slug = slugify(title, separator='_')
            if author:
                citation = '{}. {}.'.format(title, author.strip())
            else:
                citation = '{}.'.format(title)
            cites[slug] = citation

            quote = []
            for l in text.splitlines():
                quote.append('> {}'.format(l.strip()))
            quote = '\n'.join(quote)

            if anno:
                quote = '{}\n{}'.format(anno, quote)

            books[slug].append(quote)

        for slug, highlights in books.items():
            text = '# {}\n\n{}'.format(cites[slug], '\n\n'.join(highlights))
            path = os.path.join(kobo_out, f'{slug}.md')
            if not os.path.exists(path):
                changes['books'].append(path)
            with open(path, 'w') as f:
                f.write(text)

    return changes


if __name__ == '__main__':
    sync_notes()
