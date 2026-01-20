/**
 * @calibr/api - Backend API services
 */

import { Hono } from "hono";

const app = new Hono();

app.get("/", (c) => {
  return c.json({
    name: "Calibr.ly API",
    version: "0.1.0",
    status: "ok",
  });
});

app.get("/health", (c) => {
  return c.json({ status: "healthy" });
});

export default app;

export { app };
