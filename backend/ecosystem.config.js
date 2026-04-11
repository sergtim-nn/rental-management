module.exports = {
  apps: [{
    name: 'rental-api',
    script: './dist/index.js',
    cwd: '/root/rental-management/backend',
    env: { NODE_ENV: 'production' },
    instances: 1,
    autorestart: true,
    watch: false,
    error_file: '/var/log/rental-api-error.log',
    out_file: '/var/log/rental-api-out.log',
  }]
};
