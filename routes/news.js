import express from "express";
import multer from "multer";
import path from "path";
import {
  getNews,
  getNewsBySlug,
  createNews,
  updateNews,
  deleteNews,
  toggleActive
} from "../controllers/newsController.js";

const router = express.Router();

// Upload config
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) =>
    cb(null, Date.now() + path.extname(file.originalname))
});

const upload = multer({ storage });

router.get("/", getNews);
router.get('/:slug', getNewsBySlug);

router.post("/", upload.single("image"), createNews);
router.put("/:slug", upload.single("image"), updateNews);
router.delete("/:slug", deleteNews);
router.patch("/:slug", toggleActive);

export default router;
