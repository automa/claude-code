module.exports = {
  apps: [
    {
      name: 'bot-dev',
      script: 'pnpm',
      args: 'dev',
    },
    {
      name: 'bot',
      watch: ['build'],
      script: 'build/index.js',
    },
  ],
};
