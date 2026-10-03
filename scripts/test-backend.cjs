const { existsSync } = require('node:fs');
const { spawnSync } = require('node:child_process');

const python = existsSync('.venv/bin/python') ? '.venv/bin/python' : 'python3';
const result = spawnSync(python, ['-m', 'unittest', 'discover', '-s', 'tests', '-p', 'test_*.py'], { stdio: 'inherit' });
if (result.error) console.error(result.error.message);
process.exitCode = result.status ?? 1;
