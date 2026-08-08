const fs = require('fs');
function patch(file, target, repl) {
    let text = fs.readFileSync(file, 'utf8');
    text = text.split(target).join(repl);
    fs.writeFileSync(file, text);
}

// connections.ts
patch('src/routes/connections.ts', 'const { userId } = req.params;', 'const userId = req.params.userId as string;');

// opportunities.ts
patch('src/routes/opportunities.ts', 'const { id } = req.params;', 'const id = req.params.id as string;');

// registrations.ts
patch('src/routes/registrations.ts', 'where: { id: req.params.id }', 'where: { id: req.params.id as string }');

