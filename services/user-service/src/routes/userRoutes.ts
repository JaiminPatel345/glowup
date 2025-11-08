import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { UserController } from '../controllers/userController';
import { validateBody, validateParams, validateQuery, validateFile } from '../middleware/validation';
import {
  createUserPreferencesSchema,
  updateUserPreferencesSchema,
  updateUserProfileSchema,
  userIdSchema,
  paginationSchema,
  fileUploadSchema,
} from '../validation/schemas';

const router = Router();
const userController = new UserController();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, process.env.UPLOAD_PATH || './uploads');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '5242880'), // 5MB default
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

// Health check
router.get('/health', userController.healthCheck);

// User Profile Routes
router.get(
  '/users/:userId',
  validateParams(userIdSchema),
  userController.getUserProfile
);

router.put(
  '/users/:userId',
  validateParams(userIdSchema),
  validateBody(updateUserProfileSchema),
  userController.updateUserProfile
);

router.delete(
  '/users/:userId',
  validateParams(userIdSchema),
  userController.deactivateUser
);

// User Preferences Routes
router.get(
  '/users/:userId/preferences',
  validateParams(userIdSchema),
  userController.getUserPreferences
);

router.post(
  '/users/:userId/preferences',
  validateParams(userIdSchema),
  validateBody(createUserPreferencesSchema),
  userController.createUserPreferences
);

router.put(
  '/users/:userId/preferences',
  validateParams(userIdSchema),
  validateBody(updateUserPreferencesSchema),
  userController.updateUserPreferences
);

router.delete(
  '/users/:userId/preferences',
  validateParams(userIdSchema),
  userController.deleteUserPreferences
);

// Combined Routes
router.get(
  '/users/:userId/complete',
  validateParams(userIdSchema),
  userController.getUserWithPreferences
);

// File Upload Routes
router.post(
  '/users/:userId/profile-image',
  validateParams(userIdSchema),
  upload.single('profileImage'),
  validateFile(fileUploadSchema),
  userController.uploadProfileImage
);

// Admin Routes
router.get(
  '/admin/users',
  validateQuery(paginationSchema),
  userController.getAllUsers
);

export default router;