#!/usr/bin/env python3
"""把 openGym 的动作目录同步到本站的共享素材目录，并生成选动作用的索引。

    python3 sync_opengym.py --dir /var/www/tanchengyi-media/opengym
    python3 sync_opengym.py --dir ... --ref <分支或提交>   默认 main
    python3 sync_opengym.py --dir ... --force             上游没变也重新处理

做法：流式读取 GitHub 的源码压缩包（不落盘、不解压到任意路径），只取 catalogue/ 下
文件名符合预期的条目。压缩包头里带有提交号，和上次一致就立即断开，不会重复下载。

输出到 --dir：
    <id>.webp / <id>.mp4   动作图片与动画（内容没变的文件不会重写）
    info/<id>.json         单个动作的名称与步骤说明（中文优先）
    catalog.json           动作索引：[id, 中文名, 英文名, 部位, 器械, 类别, 是否静态保持]
    provenance.json        每个素材文件的来源路径、git blob 哈希、字节数
    NOTICE.txt             版权与来源说明
    sync-state.json        上次同步的提交号与时间

只用 Python 标准库。上游内容被当作不可信数据：文件名、大小、文件头都会校验，
文字写入索引前会去掉标记字符。
"""
import argparse
import datetime
import hashlib
import json
import os
import re
import sys
import tarfile
import urllib.request

REPO = 'DuarteSantos8/openGym'
EXERCISE_RE = re.compile(r'^catalogue/exercises/(\d{4,5})\.json$')
STILL_RE = re.compile(r'^catalogue/media/still/(\d{4,5})\.webp$')
CLIP_RE = re.compile(r'^catalogue/media/clip/(\d{4,5})\.mp4$')
ZH_PATH = 'catalogue/i18n/zh.json'
MAX_EXERCISE_BYTES = 64 * 1024
MAX_I18N_BYTES = 16 * 1024 * 1024
MAX_STILL_BYTES = 1024 * 1024
MAX_CLIP_BYTES = 4 * 1024 * 1024
MIN_EXERCISES = 1000  # Fewer than this means the upstream layout changed; keep what we have.
STRIP = re.compile(r'[<>&"\'`\\\x00-\x1f\x7f]')


def clean(value, limit):
    return re.sub(r'\s+', ' ', STRIP.sub('', value if isinstance(value, str) else '')).strip()[:limit]


def blob_sha(data):
    return hashlib.sha1(b'blob %d\0' % len(data) + data).hexdigest()


def write_if_changed(path, data):
    try:
        with open(path, 'rb') as handle:
            if handle.read() == data:
                return False
    except FileNotFoundError:
        pass
    temp = path + '.tmp'
    with open(temp, 'wb') as handle:
        handle.write(data)
    os.replace(temp, path)
    return True


def write_json(path, value):
    return write_if_changed(path, json.dumps(value, ensure_ascii=False, separators=(',', ':')).encode('utf-8'))


def load_json(path, fallback):
    try:
        with open(path, encoding='utf-8') as handle:
            return json.load(handle)
    except (OSError, ValueError):
        return fallback


def main():
    parser = argparse.ArgumentParser(description='Sync the openGym exercise catalogue.')
    parser.add_argument('--dir', required=True)
    parser.add_argument('--ref', default='main')
    parser.add_argument('--force', action='store_true')
    args = parser.parse_args()
    if not re.match(r'^[A-Za-z0-9._/-]{1,80}$', args.ref) or '..' in args.ref:
        sys.exit('invalid --ref')
    out = os.path.abspath(args.dir)
    os.makedirs(os.path.join(out, 'info'), exist_ok=True)
    os.umask(0o022)
    state = load_json(os.path.join(out, 'sync-state.json'), {})
    known = {asset.get('path'): asset for asset in load_json(os.path.join(out, 'provenance.json'), {}).get('assets', []) if isinstance(asset, dict)}

    request = urllib.request.Request(f'https://codeload.github.com/{REPO}/tar.gz/{args.ref}', headers={'User-Agent': 'opengym-catalogue-sync'})
    exercises, zh, stills, clips, assets, written = {}, {}, set(), set(), [], 0
    with urllib.request.urlopen(request, timeout=120) as response:
        archive = tarfile.open(fileobj=response, mode='r|gz')
        commit = None
        for member in archive:
            if commit is None:
                # git archive records the commit in the pax global header.
                commit = archive.pax_headers.get('comment', '')
                if not re.match(r'^[0-9a-f]{40}$', commit):
                    commit = ''
                if commit and commit == state.get('commit') and not args.force:
                    print(f'up to date at {commit[:7]} ({state.get("count")} exercises)')
                    return
            if not member.isreg():
                continue
            name = member.name.split('/', 1)[1] if '/' in member.name else ''
            if name == ZH_PATH and member.size <= MAX_I18N_BYTES:
                parsed = json.loads(archive.extractfile(member).read())
                zh = parsed if isinstance(parsed, dict) else {}
                continue
            match = EXERCISE_RE.match(name)
            if match and member.size <= MAX_EXERCISE_BYTES:
                try:
                    parsed = json.loads(archive.extractfile(member).read())
                except ValueError:
                    continue
                if isinstance(parsed, dict):
                    exercises[match.group(1)] = parsed
                continue
            still, clip = STILL_RE.match(name), CLIP_RE.match(name)
            if not (still and member.size <= MAX_STILL_BYTES) and not (clip and member.size <= MAX_CLIP_BYTES):
                continue
            exercise_id = (still or clip).group(1)
            filename = exercise_id + ('.webp' if still else '.mp4')
            data = archive.extractfile(member).read()
            # Only accept files that really are what their extension says.
            if still and not (data[:4] == b'RIFF' and data[8:12] == b'WEBP'):
                continue
            if clip and data[4:8] != b'ftyp':
                continue
            sha = blob_sha(data)
            target = os.path.join(out, filename)
            previous = known.get('media/opengym/' + filename)
            if not (previous and previous.get('gitBlobSha') == sha and os.path.isfile(target) and os.path.getsize(target) == len(data)):
                written += write_if_changed(target, data)
            (stills if still else clips).add(exercise_id)
            assets.append({'path': 'media/opengym/' + filename, 'sourcePath': name, 'gitBlobSha': sha, 'bytes': len(data)})

    items = []
    for exercise_id in sorted(exercises):
        exercise = exercises[exercise_id]
        # The same movement drawn on a second figure is listed once.
        if exercise.get('variantOf') or exercise_id not in stills or exercise_id not in clips:
            continue
        english = clean(exercise.get('name'), 80)
        if not english:
            continue
        translation = zh.get(exercise_id) if isinstance(zh.get(exercise_id), dict) else {}
        chinese = clean(translation.get('name'), 40)
        steps_zh = [clean(step, 300) for step in translation.get('instructions', []) if isinstance(step, str)] if isinstance(translation.get('instructions'), list) else []
        steps_en = [clean(step, 300) for step in exercise.get('instructions', []) if isinstance(step, str)] if isinstance(exercise.get('instructions'), list) else []
        steps = [step for step in (steps_zh or steps_en)[:8] if step]
        items.append([exercise_id, chinese, english, clean(exercise.get('bodyPart'), 20), clean(exercise.get('equipment'), 30),
                      clean(exercise.get('category'), 20), 1 if exercise.get('hold') is True else 0])
        write_json(os.path.join(out, 'info', exercise_id + '.json'),
                   {'id': exercise_id, 'name': chinese or english, 'en': english, 'lang': 'zh' if steps_zh else 'en', 'steps': steps,
                    'description': '' if steps_zh else clean(exercise.get('description'), 400)})

    if len(items) < MIN_EXERCISES:
        sys.exit(f'only {len(items)} usable exercises found; upstream layout may have changed, nothing was published')

    now = datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
    assets.sort(key=lambda asset: asset['path'])
    write_json(os.path.join(out, 'provenance.json'), {
        'repository': f'https://github.com/{REPO}', 'commit': commit, 'syncedAt': now,
        'copyright': '© Aliaksandr Makatserchyk, Gym visual, gymvisual.com', 'assets': assets})
    write_if_changed(os.path.join(out, 'NOTICE.txt'), f'''Exercise demonstrations

© Aliaksandr Makatserchyk, Gym visual, https://gymvisual.com/

Media source: https://github.com/{REPO}
Synced from commit: {commit}
Source notice: https://github.com/{REPO}/blob/{commit or 'main'}/NOTICE.md

These stills and animations are proprietary media, not covered by openGym's
AGPL license. The website owner confirmed a separate authorization for use
in this independent website. That authorization does not grant visitors
redistribution rights. Obtain your own license from Gym visual before
reusing the media.

The 180 px media files are reproduced without modification and are kept in
step with the openGym catalogue by an automated sync. Per-file source paths,
source Git blob hashes and byte sizes are listed in provenance.json.
Exercise names and instructions come from the openGym catalogue.
This website is not endorsed by or affiliated with openGym or Gym visual.
'''.encode('utf-8'))
    # The index goes last, once every file it points at is in place.
    write_json(os.path.join(out, 'catalog.json'), {'commit': commit, 'syncedAt': now, 'count': len(items), 'items': items})
    write_json(os.path.join(out, 'sync-state.json'), {'commit': commit, 'syncedAt': now, 'count': len(items)})
    print(f'synced {commit[:7] or args.ref}: {len(items)} exercises in the index, {len(assets)} media files checked, {written} written')


if __name__ == '__main__':
    main()
