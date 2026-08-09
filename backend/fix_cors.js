const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'index.ts');
let content = fs.readFileSync(filePath, 'utf8');

const target = `app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));`;

const replacement = `const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',') 
  : [process.env.FRONTEND_URL || 'http://localhost:5173'];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));`;

if (content.includes(target)) {
    content = content.replace(target, replacement);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log("Replaced successfully!");
} else {
    console.log("Target not found!");
}
