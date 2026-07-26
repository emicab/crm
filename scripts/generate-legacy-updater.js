const https = require('https');
const fs = require('fs');

const tagName = process.argv[2] || 'v1.5.15';

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchUrl(res.headers.location).then(resolve).catch(reject);
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

async function main() {
  try {
    const raw = await fetchUrl(`https://github.com/emicab/crm/releases/download/${tagName}/latest.json`);
    const latest = JSON.parse(raw);
    const nsis = latest.platforms['windows-x86_64-nsis'] || latest.platforms['windows-x86_64'];
    const updater = {
      version: latest.version,
      notes: latest.notes,
      pub_date: latest.pub_date,
      platforms: {
        'windows-x86_64': {
          signature: nsis.signature,
          url: nsis.url
        }
      }
    };
    fs.writeFileSync('updater.json', JSON.stringify(updater, null, 2));
    console.log('Successfully generated updater.json:');
    console.log(JSON.stringify(updater, null, 2));
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

main();
