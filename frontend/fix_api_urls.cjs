const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

walkDir(path.join(__dirname, 'app'), (filePath) => {
  if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    // Replace const API
    content = content.replace(/const API = "http:\/\/localhost:5000";/g, 'const API = import.meta.env.VITE_API_URL || "http://localhost:5000";');
    
    // Replace in startsWith
    content = content.replace(/resource\.startsWith\("http:\/\/localhost:5000"\)/g, 'resource.startsWith(import.meta.env.VITE_API_URL || "http://localhost:5000")');

    // Replace in template literals: `http://localhost:5000/api/...`
    content = content.replace(/`http:\/\/localhost:5000\//g, '`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/');

    if (content !== original) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log('Updated: ' + filePath);
    }
  }
});
console.log('Done!');
