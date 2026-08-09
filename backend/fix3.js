const fs = require('fs');
const glob = require('fs').readdirSync; // not real glob, but we can just loop
const path = require('path');

function processDir(dir) {
    const files = fs.readdirSync(dir);
    for (const f of files) {
        const fullPath = path.join(dir, f);
        if (fs.statSync(fullPath).isDirectory()) {
            processDir(fullPath);
        } else if (fullPath.endsWith('.ts')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            // Find all req.params.xxx and replace with (req.params.xxx as string)
            // But be careful not to replace if already casted
            // We can just regex req\.params\.([a-zA-Z0-9_]+)
            // First remove existing casts if any to avoid double casting
            content = content.replace(/req\.params\.([a-zA-Z0-9_]+) as string/g, 'req.params.$1');
            content = content.replace(/\(req\.params\.([a-zA-Z0-9_]+) as string\)/g, 'req.params.$1');
            
            // Now apply cast
            content = content.replace(/req\.params\.([a-zA-Z0-9_]+)/g, '(req.params.$1 as string)');
            fs.writeFileSync(fullPath, content, 'utf8');
        }
    }
}

processDir('src/routes');
