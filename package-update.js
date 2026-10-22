import fs from 'node:fs';
import pkg from './package.json' with { type: 'json' };
import pkgLock from './package-lock.json' with { type: 'json' };

// ANSI color helpers
const ANSI = {
    reset: "\x1b[0m",
    yellowBg: "\x1b[43m\x1b[30m", // black on yellow
    greenBg: "\x1b[42m\x1b[30m",  // black on green
};

/**
 * Update Dependencies
 * @param {*} deps
 * @param {*} depType
 * @returns
 */
function updateDependencies(deps, depType = 'dependencies') {
    if (!deps) {
        return;
    }

    for (const [name, currentVersion] of Object.entries(deps)) {
        const lockEntry = pkgLock.packages?.[`node_modules/${name}`];
        if (!lockEntry?.version) {
            console.warn(`${ANSI.yellowBg} WARN ${ANSI.reset} ${name} not found in lock file – skipping.`);
            continue;
        }

        const lockedVersion = lockEntry.version;
        let newVersion;

        if (currentVersion.startsWith('npm:')) {
            const aliasMatch = currentVersion.match(
                /^(npm:(?:@[^/]+\/)?[^@]+@)(\^|~|>=|<=|>|<|=)?(.+)$/,
            );

            if (!aliasMatch) {
                console.warn(`${ANSI.yellowBg} WARN ${ANSI.reset} Could not parse npm alias ${name}: ${currentVersion}`);
                continue;
            }

            const [, aliasPrefix, versionPrefix = ''] = aliasMatch;

            newVersion = `${aliasPrefix}${versionPrefix}${lockedVersion}`;
        } else {
            const prefixMatch = currentVersion.match(/^(\^|~|>=|<=|>|<|=)?/);
            const prefix = prefixMatch?.[0] || '';

            newVersion = `${prefix}${lockedVersion}`;
        }

        if (currentVersion !== newVersion) {
            deps[name] = newVersion;
            console.log(`${ANSI.greenBg} OKAY ${ANSI.reset} ${depType}: ${name} ${currentVersion} → ${newVersion}`,);
        }
    }
}

updateDependencies(pkg.dependencies, 'dependencies');
updateDependencies(pkg.devDependencies, 'devDependencies');

fs.writeFileSync('package.json', JSON.stringify(pkg, null, 4));
console.log(`\n${ANSI.greenBg} DONE ${ANSI.reset} package.json updated based on package-lock.json\n`);