import express from "express";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { registerRoutes } from "./routes";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files in production
if (process.env.NODE_ENV === "production") {
  app.use(express.static(join(__dirname, "../dist/public")));
}

// Register routes
registerRoutes(app);

// Start server
const server = app.listen(PORT, "0.0.0.0", () => {
  console.log(`BCCSMaint server running on port ${PORT}`);
});

export default server;