const { DatabaseSync } = require('node:sqlite');
const db = new DatabaseSync('./prisma/dev.db', { readOnly: true });
try {
  const result = db.prepare('SELECT name, (priceSale - pricePurchase) AS margen FROM Product ORDER BY margen DESC LIMIT 5').all();
  console.log(result);
} catch (e) {
  console.error(e);
}
