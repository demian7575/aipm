import { createApp } from './app.js';

const port = process.env.PORT || 4000;

createApp()
  .then((app) => {
    app.listen(port, () => {
      console.log(`Server running on http://localhost:${port}`);
    });
  })
  .catch((error) => {
    console.error('Failed to start server', error);
    process.exit(1);
  });
