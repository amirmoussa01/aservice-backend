import multer from "multer";
import path from "path";
import fs from "fs";

// Créer le dossier uploads/services s'il n'existe pas
const servicesDir = 'uploads/services';
if (!fs.existsSync(servicesDir)) {
  fs.mkdirSync(servicesDir, { recursive: true });
  console.log(`✅ Dossier créé: ${servicesDir}`);
}

// Storage pour images de services
const serviceImageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/services/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'service-' + uniqueSuffix + ext);
  }
});

// Filtre pour images
const imageFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (extname && mimetype) {
    cb(null, true);
  } else {
    cb(new Error('Seules les images sont autorisées (jpeg, jpg, png, gif, webp)'));
  }
};

// Middleware pour images de services
export const uploadServiceImage = multer({
  storage: serviceImageStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: imageFilter
}).single('image');