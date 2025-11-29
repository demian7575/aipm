const express = require('express');
const app = express();

app.get('/', (req, res) => {
  const lastUpdated = new Date();
  res.render('index', { lastUpdated });
});

app.listen(3000, () => {
  console.log('Server is running on port 3000');
});