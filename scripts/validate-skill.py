from pathlib import Path
import os
import runpy
import sys

root = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(root / '.runtime' / 'pydeps'))
validator = Path(os.environ.get('CODEX_HOME', str(Path.home() / '.codex'))) / 'skills' / '.system' / 'skill-creator' / 'scripts' / 'quick_validate.py'
sys.argv = [str(validator), str(root / 'skills' / 'avg-maker')]
runpy.run_path(str(validator), run_name='__main__')
