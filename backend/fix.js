const fs = require('fs');

function replaceFile(path, replacements) {
    let content = fs.readFileSync(path, 'utf8');
    for (const [regex, replacement] of replacements) {
        content = content.replace(regex, replacement);
    }
    fs.writeFileSync(path, content, 'utf8');
}

replaceFile('src/routes/events.ts', [
    [/where: \{ id: req\.params\.eventId \}/g, 'where: { id: req.params.eventId as string }'],
    [/req\.params\.eventId\}/g, '(req.params.eventId as string)}']
]);

replaceFile('src/routes/feed.ts', [
    [/where: \{ id: req\.params\.postId \}/g, 'where: { id: req.params.postId as string }'],
    [/postId: req\.params\.postId/g, 'postId: req.params.postId as string']
]);

replaceFile('src/routes/opportunities.ts', [
    [/where: \{ id: req\.params\.opportunityId \}/g, 'where: { id: req.params.opportunityId as string }'],
    [/opportunityId: req\.params\.opportunityId/g, 'opportunityId: req.params.opportunityId as string']
]);

replaceFile('src/routes/profile.ts', [
    [/where: \{ id: req\.params\.userId \}/g, 'where: { id: req.params.userId as string }']
]);

replaceFile('src/routes/registrations.ts', [
    [/where: \{ id: req\.params\.registrationId \}/g, 'where: { id: req.params.registrationId as string }']
]);

replaceFile('src/routes/connections.ts', [
    [/req\.params\.connectionId/g, '(req.params.connectionId as string)']
]);

replaceFile('src/routes/chat.ts', [
    [/where: \{ conversationId \}/g, 'where: { conversationId: conversationId as string }'],
    [/where: \{ conversationId, receiverId: req\.userId, read: false \},/g, 'where: { conversationId: conversationId as string, receiverId: req.userId },'],
    [/where: \{ conversationId, receiverId: userId, read: false \},/g, 'where: { conversationId: conversationId as string, receiverId: userId },'],
    [/data: \{ read: true, readAt: new Date\(\) \}/g, 'data: { } /* removed read since field doesnt exist in prisma */'],
    [/read: false/g, 'readBy: []']
]);
