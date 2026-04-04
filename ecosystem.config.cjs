const path = require('path');

module.exports = {
  apps: [
    {
      name: 'saathi-backend',
      cwd: path.join(__dirname, 'backend'),
      script: 'server.js',
      env: {
        NODE_ENV: 'production',
        PORT: 5000
      }
    },
    {
      name: 'saathi-scheduler',
      cwd: path.join(__dirname, 'backend'),
      script: 'scheduler.js',
      env: {
        NODE_ENV: 'production'
      }
    },
    {
      name: 'saathi-frontend',
      cwd: path.join(__dirname, 'frontend'),
      script: 'npm',
      args: 'start',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      }
    }
  ]
};
