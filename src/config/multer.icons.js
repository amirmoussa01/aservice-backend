import multer from "multer";
import path from "path";
import fs from "fs";

// Créer le dossier uploads/icons s'il n'existe pas
const iconsDir = 'uploads/icons';
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
  console.log(`✅ Dossier créé: ${iconsDir}`);
}

// Configuration storage pour les icônes de catégories
const iconStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/icons/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'icon-' + uniqueSuffix + ext);
  }
});

// Filtre pour accepter seulement les images
const imageFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|svg|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (extname && mimetype) {
    cb(null, true);
  } else {
    cb(new Error('Seules les images sont autorisées (jpeg, jpg, png, gif, svg, webp)'));
  }
};

// Middleware upload pour icônes de catégories
export const uploadCategoryIcon = multer({
  storage: iconStorage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB max pour les icônes
  fileFilter: imageFilter
}).single('icon');