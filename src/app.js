import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";

import authRoutes from "./routes/auth.routes.js";
import providerRoutes from "./routes/provider.routes.js";
import clientRoutes from "./routes/client.routes.js";
import serviceRoutes from "./routes/service.routes.js";
import categoryRoutes from "./routes/category.routes.js";
import bookingRoutes from "./routes/booking.routes.js";

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
app.use('/uploads', express.static('uploads'));

// ✅ AJOUTE CES LIGNES ICI (Route de monitoring)
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    message: 'Bconnect API is running',
    timestamp: new Date().toISOString() 
  });
});

// Route racine (optionnel, pour tester que l'API fonctionne)
app.get('/', (req, res) => {
  res.json({ 
    message: 'Bienvenue sur Bconnect API', 
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      provider: '/api/provider',
      client: '/api/client',
      services: '/api/services',
      categories: '/api/categories',
    }
  });
});
// === ROUTES ===
app.use("/api/auth", authRoutes);
app.use("/api/provider", providerRoutes);
app.use("/api/client", clientRoutes);
app.use("/api", serviceRoutes);
app.use("/api", categoryRoutes);
app.use("/api", bookingRoutes);


export default app;
