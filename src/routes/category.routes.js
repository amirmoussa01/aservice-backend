import express from "express";
import { 
  getAllCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
  getCategoriesStats,
  searchCategories,           // ✅ Nouveau
  getPopularCategories,       // ✅ Nouveau
  getTrendingCategories,      // ✅ Nouveau
  autocompleteCategories,     // ✅ Nouveau
  getCategoryServices         // ✅ Nouveau
} from "../controllers/category.controller.js";
import { auth } from "../middlewares/auth.js";
import { isAdmin } from "../middlewares/roles.js";
import { uploadCategoryIcon } from "../config/multer.icons.js";

const router = express.Router();

// Routes publiques
router.get("/categories", getAllCategories);
router.get("/categories/search", searchCategories);               // ✅ Nouveau
router.get("/categories/popular", getPopularCategories);          // ✅ Nouveau
router.get("/categories/trending", getTrendingCategories);        // ✅ Nouveau
router.get("/categories/autocomplete", autocompleteCategories);   // ✅ Nouveau
router.get("/categories/stats", getCategoriesStats);
router.get("/categories/:id", getCategoryById);
router.get("/categories/:id/services", getCategoryServices);      // ✅ Nouveau

// Routes admin (protégées)
router.post("/admin/categories", auth, isAdmin, uploadCategoryIcon, createCategory);
router.put("/admin/categories/:id", auth, isAdmin, uploadCategoryIcon, updateCategory);
router.delete("/admin/categories/:id", auth, isAdmin, deleteCategory);

export default router;