const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const app = express();
app.use(bodyParser.json());

// Map of project IDs to their local directory paths
const projects = {};

// Create multiple files in a project
app.post('/file/batch', (req, res) => {
  const { projectId, files } = req.body;
  if (!projectId || !files) {
    return res.status(400).json({ error: 'projectId and files are required' });
  }
  // Determine project root, default to unique directory under projects/
  let root = projects[projectId];
  if (!root) {
    root = path.resolve(__dirname, '../projects', projectId);
    projects[projectId] = root;
  }
  files.forEach(file => {
    const filePath = path.join(root, file.path);
    const dir = path.dirname(filePath);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(filePath, file.content);
  });
  res.json({ status: 'files created' });
});

// Deploy project to Vercel using the Vercel CLI
app.post('/deploy', (req, res) => {
  const { projectId, vercelProjectName } = req.body;
  const root = projects[projectId];
  if (!root) {
    return res.status(400).json({ error: 'project not found' });
  }
  const cmd = `npx vercel --prod --cwd ${root} --confirm --name ${vercelProjectName}`;
  exec(cmd, (err, stdout, stderr) => {
    if (err) {
      return res.status(500).json({ error: stderr || err.message });
    }
    const match = stdout.match(/https?:\/\/[^\s]+\.vercel\.app/);
    const url = match ? match[0] : null;
    res.json({ deploymentUrl: url || 'unknown' });
  });
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log('API server listening on port', PORT);
});
