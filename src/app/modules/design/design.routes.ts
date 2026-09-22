import { Router } from "express";
import { auth } from "../../middleware/auth";
import { validateRequest } from "../../middleware/validateRequest";
import { upload } from "../../utils/s3";
import { DesignController } from "./design.controller";
import { DesignValidation } from "./design.validation";

const router = Router();

// Upload a new diamond design image (multipart/form-data field: 'image')
router.post(
  "/upload",
  auth("user", "admin"),
  upload.single("image"),
  validateRequest(DesignValidation.uploadDesignValidationSchema),
  DesignController.uploadDesign
);

// Get recent designs for home screen (default limit: 5)
router.get(
  "/recent",
  auth("user", "admin"),
  DesignController.getRecentDesigns
);

// Get all designs for logged-in user (with pagination & type filter)
router.get(
  "/my-designs",
  auth("user", "admin"),
  DesignController.getMyDesigns
);

// Get specific design by ID
router.get(
  "/:id",
  auth("user", "admin"),
  DesignController.getDesignById
);

// Delete specific design by ID
router.delete(
  "/:id",
  auth("user", "admin"),
  DesignController.deleteDesign
);

export const designRoutes = router;
