"""Verify the actual release archives outside the source dependency tree."""
import json
import os
from pathlib import Path
import shutil
import socket
import subprocess
import tempfile
import time
import urllib.request
import zipfile

ROOT = Path(__file__).resolve().parents[1]
NODE = shutil.which('node')
assert NODE, 'Node.js is required'

with tempfile.TemporaryDirectory(prefix='avg-standalone-') as temp:
    folder = Path(temp)
    with zipfile.ZipFile(ROOT / 'product/skill.zip') as archive:
        assert archive.testzip() is None
        names = archive.namelist()
        assert not any('/node_modules/' in n or '/src/editor/' in n for n in names)
        archive.extractall(folder)
    toolkit = folder / 'avg-maker/assets/toolkit'
    for base in [folder / 'avg-maker', toolkit]:
        assert (base / 'LICENSE').read_text().startswith('MIT License')
        assert (base / 'licenses/LICENSE.cocos.md').is_file()
    assert (toolkit / 'dist/index.html').is_file()
    assert (toolkit / 'public/engine/runtime-manifest.json').is_file()
    assert not json.loads((toolkit / 'package.json').read_text()).get('dependencies')
    env = dict(os.environ, PATH='', NODE_PATH='', COCOS_CREATOR=str(folder / 'absent-Creator.exe'))
    launcher = folder / 'avg-maker/scripts/avg.mjs'
    project = folder / 'my-story'

    def run(*args):
        result = subprocess.run([NODE, str(launcher), *map(str, args)], cwd=folder, env=env, capture_output=True, text=True, encoding='utf-8', timeout=60)
        assert result.returncode == 0, result.stdout + result.stderr
        return result.stdout

    assert json.loads(run('doctor'))['ok']
    run('init', '--project', project)
    assert json.loads(run('check', '--project', project))['ok']
    development = subprocess.run([NODE, str(launcher), 'serve', '--dev', '--project', str(project)], cwd=folder, env=env, capture_output=True, text=True, encoding='utf-8', timeout=10)
    assert development.returncode != 0 and 'https://wangyu.tech/avg/source.zip' in development.stderr
    with socket.socket() as sock:
        sock.bind(('127.0.0.1', 0))
        port = sock.getsockname()[1]
    server = subprocess.Popen([NODE, str(launcher), 'serve', '--project', str(project), '--port', str(port)], cwd=folder, env=env, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    url = f'http://127.0.0.1:{port}'
    try:
        for _ in range(100):
            try:
                with urllib.request.urlopen(url + '/api/project', timeout=1) as response:
                    state = json.load(response)
                break
            except OSError:
                if server.poll() is not None:
                    raise AssertionError(server.communicate())
                time.sleep(.1)
        else:
            raise AssertionError('Standalone server did not start')
        assert '[背景 ' in state['project']['scripts'][0]['source']
        for resource in ['/', '/engine/index.html', '/api/capabilities', '/' + state['project']['characters'][0]['poses'][0]['image']]:
            with urllib.request.urlopen(url + resource) as response:
                assert response.status == 200 and response.read()
        for format in ['web', 'creator']:
            request = urllib.request.Request(url + '/api/export', json.dumps({'project': state['project'], 'format': format}).encode(), {'Content-Type': 'application/json'}, method='POST')
            with urllib.request.urlopen(request, timeout=60) as response:
                result = json.load(response)
            with zipfile.ZipFile(result['zip']) as archive:
                assert archive.testzip() is None
                assert ('index.html' if format == 'web' else 'assets/Main.scene') in archive.namelist()
                assert 'LICENSE.avg-maker' in archive.namelist()
                if format == 'creator':
                    assert 'assets/core/keywords.ts' in archive.namelist()
        print('Standalone skill: doctor, init, check, serve, assets, Web and Creator exports passed with no npm/PATH/Creator.')
    finally:
        server.terminate()
        server.communicate(timeout=10)
    with zipfile.ZipFile(ROOT / 'product/source.zip') as archive:
        assert archive.testzip() is None
        names = archive.namelist()
        for name in ['README.md', 'LICENSE', 'THIRD_PARTY_NOTICES.md', 'licenses/LICENSE.cocos.md', 'src/editor/ScriptEditor.jsx', 'src/core/keywords.js', 'package-lock.json', 'scripts/server.mjs', 'cocos-template/AvgPlayer.ts', 'public/engine/index.html']:
            assert 'avg-maker-source/' + name in names
        assert not any('/node_modules/' in n for n in names)
    print('Source archive: complete source, lockfile and prebuilt engine verified.')
