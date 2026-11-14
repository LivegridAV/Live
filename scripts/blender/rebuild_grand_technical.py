"""Stable entrypoint for the selected technical shape-v2 architecture.

The rejected generator is preserved with its baseline hashes in
reports/architecture-corrections/20261018/technical/.
Run Blender --background --factory-startup --python this-file.py.
"""
from pathlib import Path
import runpy

runpy.run_path(str(Path(__file__).with_name('rebuild_grand_technical_shape_v2.py')), run_name='__main__')
