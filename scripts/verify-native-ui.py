"""Run actual Expo web component checks using the installed Edge browser."""
import argparse
import html
from pathlib import Path
import re
import subprocess
import tempfile

ROOT=Path(__file__).resolve().parents[1]
EDGE=Path('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe')
OUT=ROOT/'evidence/native-ui'

def run_browser(url,screenshot=None,size='1280,1000'):
    with tempfile.TemporaryDirectory(prefix='ecohanoi-native-') as profile:
        args=[str(EDGE),'--headless','--disable-gpu','--no-first-run','--no-default-browser-check',
              '--hide-scrollbars','--force-device-scale-factor=1',f'--user-data-dir={profile}',
              f'--window-size={size}','--virtual-time-budget=18000']
        args += [f'--screenshot={screenshot}'] if screenshot else ['--dump-dom']
        result=subprocess.run(args+[url],capture_output=True,timeout=60,creationflags=getattr(subprocess,'CREATE_NO_WINDOW',0))
        if result.returncode:raise RuntimeError(result.stderr.decode('utf-8','replace')[-1200:])
        return result.stdout.decode('utf-8','replace')

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--screenshots',action='store_true');options=parser.parse_args()
    OUT.mkdir(parents=True,exist_ok=True)
    rendered=run_browser('http://127.0.0.1:8792/_tests')
    match=re.search(r'<pre id="results">(.*?)</pre>',rendered,re.S)
    report=html.unescape(match.group(1)) if match else 'FAIL missing report'
    (OUT/'browser-tests.txt').write_text(report,encoding='utf-8');print(report)
    assert 'RESULT: PASS' in report and 'FAIL ' not in report
    if options.screenshots:
        for screen in ['home','garden','guide','stats','scan','review']:
            path=OUT/(screen+'.png')
            run_browser('http://127.0.0.1:8792/_capture?screen='+screen,path,'390,1000')
            assert path.is_file() and path.stat().st_size>4000
            print('Saved',path.relative_to(ROOT))
