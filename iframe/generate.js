/**
 * Generate an HTML file containing the rollup build
 */

const fs = require("fs");

const inlineScript = fs.readFileSync("html.js");

console.log(`
  <!DOCTYPE html>
  <html lang="en">
    <head> </head>
    <body>
      <script>
        ${inlineScript};
      </script>
    </body>
  </html>
`);
