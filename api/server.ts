/**
 * local server entry file, for local development
 */
import app from './app.js';
import { initDatabase } from './config/database.js';

/**
 * start server with port
 */
const PORT = process.env.PORT || 3001;

// Initialize database first, then start server
initDatabase().then(() => {
  const server = app.listen(PORT, () => {
    console.log(`Server ready on port ${PORT}`);
  });

  /**
   * close server
   */
  process.on('SIGTERM', () => {
    console.log('SIGTERM signal received');
    server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  });

  process.on('SIGINT', () => {
    console.log('SIGINT signal received');
    server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  });
}).catch(err => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});

export default app;