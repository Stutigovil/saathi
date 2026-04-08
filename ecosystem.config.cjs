const path = require('path');

module.exports = {
  apps: [
    {
      name: 'saathi-backend',
      cwd: path.join(__dirname, 'backend'),
      script: 'server.js',
      env: {
        NODE_ENV: 'production',
        PORT: 5000,
        BIND_HOST: '127.0.0.1'
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
      args: 'start -- -H 127.0.0.1 -p 3000',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        HOSTNAME: '127.0.0.1'
      }
    }
  ]
};
