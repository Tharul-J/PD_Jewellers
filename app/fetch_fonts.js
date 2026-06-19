const fs = require('fs');

async function main() {
  const url = 'https://github.com/google/fonts/raw/main/ofl/pacifico/Pacifico-Regular.ttf';
  const res = await fetch(url);
  const buffer = await res.arrayBuffer();
  fs.writeFileSync('./public/Pacifico.ttf', Buffer.from(buffer));
  
  const url2 = 'https://github.com/google/fonts/raw/main/ofl/greatvibes/GreatVibes-Regular.ttf';
  const res2 = await fetch(url2);
  const buffer2 = await res2.arrayBuffer();
  fs.writeFileSync('./public/GreatVibes.ttf', Buffer.from(buffer2));
}
main();
