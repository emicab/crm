const { execSync } = require('child_process');
const path = require('path');

console.log('Migrating crm_template.db schema...');
const templateDbPath = 'file:' + path.resolve(__dirname, '../prisma/crm_template.db').replace(/\\/g, '/');

try {
  execSync('npx prisma migrate deploy', {
    stdio: 'inherit',
    cwd: path.resolve(__dirname, '../'),
    env: {
      ...process.env,
      DATABASE_URL: templateDbPath
    }
  });
  console.log('crm_template.db schema migrated successfully.');
} catch (error) {
  console.error('Failed to migrate crm_template.db:', error);
  process.exit(1);
}
