module.exports = {
  apps: [{
    name: 'presupuestos-app',
    script: 'node_modules/tsx/dist/cli.mjs',
    args: 'server/index.ts',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 5000,
      DATABASE_URL: 'postgresql://presupuestos_user:Baires2025@localhost:5432/presupuestos_db'
    }
  }]
};
