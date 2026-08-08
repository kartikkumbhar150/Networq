const fs = require('fs');
function patch(file, target, repl) {
    let text = fs.readFileSync(file, 'utf8');
    text = text.split(target).join(repl);
    fs.writeFileSync(file, text);
}

// events.ts
patch('src/routes/events.ts', 'req.params.eventId', '(req.params.eventId as string)');

// opportunities.ts
patch('src/routes/opportunities.ts', 'req.params.opportunityId', '(req.params.opportunityId as string)');

// registrations.ts
patch('src/routes/registrations.ts', 'req.params.registrationId', '(req.params.registrationId as string)');

// connections.ts
patch('src/routes/connections.ts', 'req.params.userId', '(req.params.userId as string)');
patch('src/routes/connections.ts', 'uId = userId as string', 'uId = userId as string'); // already ok
