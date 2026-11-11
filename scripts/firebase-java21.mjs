// Lance la CLI Firebase avec un JDK 21 ou plus (exigé par les émulateurs),
// même si le Java par défaut de la machine est plus ancien.
// Usage : node scripts/firebase-java21.mjs <arguments de firebase…>

import { execSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync } from 'node:fs';
import { delimiter, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const majorOf = (text) => Number((/version "(\d+)/.exec(text) || [])[1] || 0);

function defaultJavaMajor() {
  try {
    return majorOf(execSync('java -version 2>&1', { encoding: 'utf8' }));
  } catch {
    return 0;
  }
}

function findJdk21() {
  const roots = ['C:\\Program Files\\Java', 'C:\\Program Files\\Eclipse Adoptium', 'C:\\Program Files\\Microsoft'];
  const found = roots.filter(existsSync).flatMap((root) =>
    readdirSync(root)
      .map((name) => ({ dir: join(root, name), major: Number((/jdk-?(\d+)/i.exec(name) || [])[1] || 0) }))
      .filter((jdk) => jdk.major >= 21 && existsSync(join(jdk.dir, 'bin'))));
  return found.sort((a, b) => b.major - a.major)[0]?.dir;
}

const env = { ...process.env };
// Les sous-commandes d'emulators:exec doivent retrouver le même Node que ce lanceur.
const pathKey = Object.keys(env).find(key => key.toLowerCase() === 'path') || 'PATH';
env[pathKey] = `${dirname(process.execPath)}${delimiter}${env[pathKey] || ''}`;
if (defaultJavaMajor() < 21) {
  const jdk = findJdk21();
  if (!jdk) {
    console.error('Java 21 ou plus est nécessaire pour les émulateurs Firebase : https://adoptium.net');
    process.exit(1);
  }
  env.JAVA_HOME = jdk;
  env[pathKey] = `${join(jdk, 'bin')}${delimiter}${env[pathKey]}`;
}

// Sous Windows, Java ouvre ses tubes internes via des sockets Unix créées dans
// le dossier temporaire ; un chemin court « 8.3 » (C:\Users\NOM~1\…) les fait
// échouer (« Unable to establish loopback connection »). On leur donne un dossier simple.
if (process.platform === 'win32') {
  const socketDir = 'C:\\Temp\\intranuit-jdk';
  mkdirSync(socketDir, { recursive: true });
  env.JAVA_TOOL_OPTIONS = `${env.JAVA_TOOL_OPTIONS || ''} -Djdk.net.unixdomain.tmpdir=${socketDir}`.trim();
}

const cli = fileURLToPath(new URL('../node_modules/firebase-tools/lib/bin/firebase.js', import.meta.url));
const child = spawn(process.execPath, [cli, ...process.argv.slice(2)], { env, stdio: 'inherit' });
child.on('error', (error) => {
  console.error('Impossible de lancer Firebase :', error.message);
  process.exit(1);
});
child.on('exit', (code) => process.exit(code ?? 1));
