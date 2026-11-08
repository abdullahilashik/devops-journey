const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send(`
        <html>
            <head>
                <script src="https://cdn.tailwindcss.com"></script>
            </head>
            <body class="bg-gray-100 flex items-center justify-center h-screen">
                <h1 class="text-3xl font-bold">Hello express updated</h1>
            </body>
        </html>
    `);
});

app.listen(port, () => {
    console.log(`Listening on server url: http://localhost:${port}`);
});