import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";

import authRoutes from "./routes/auth.routes.js";
import providerRoutes from "./routes/provider.routes.js";
import clientRoutes from "./routes/client.routes.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));

// Servir les fichiers statiques (documents uploadés)
app.use(
  "/uploads/documents",
  express.static(path.join(process.cwd(), "uploads", "documents"))
);
app.use(
  "/uploads/avatars",
  express.static(path.join(process.cwd(), "uploads", "avatars"))
);

// === ROUTES ===
app.use("/api/auth", authRoutes);
app.use("/api/provider", providerRoutes);
app.use("/api/client", clientRoutes);

export default app;
