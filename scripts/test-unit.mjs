import { readdirSync } from 'node:fs';
import { spawn } from 'node:child_process';
const files = readdirSync('tests').filter(n => n.endsWith('.test.js') && n !== 'firestore.rules.test.js').sort().map(n => 'tests/' + n);
const child = spawn(process.execPath, ['--test', ...files], { stdio: 'inherit' });
child.on('error', error => { console.error(error.message); process.exit(1); });
child.on('exit', code => process.exit(code ?? 1));
