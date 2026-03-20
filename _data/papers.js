const fs = require('fs');
const path = require('path');

module.exports = () => {
  return fs.readdirSync('./papers/')
    .filter(f => f.endsWith('.json'))
    .map(file => {
      const slug = path.basename(file, '.json');
      const data = JSON.parse(fs.readFileSync(`./papers/${file}`));
      return { ...data, slug };
    });
};
