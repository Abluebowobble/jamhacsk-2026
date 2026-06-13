// Builds the Express app: middleware + routes. No listening here (see server.js)
// so the app can be imported by tests without opening a port.
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import config from './config/index.js';
import apiRoutes from './routes/index.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';

const app = express();

// CORS limited to the configured frontend origin(s).
app.use(
  cors({
    origin: config.frontendOrigins,
    credentials: true,
  })
);

app.use(express.json());
app.use(morgan(config.isProd ? 'combined' : 'dev'));

// Root ping so hitting the bare host shows the server is up.
app.get('/', (req, res) => {
  res.json({ name: 'hestia-backend', env: config.env, api: config.apiPrefix });
});

app.use(config.apiPrefix, apiRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
