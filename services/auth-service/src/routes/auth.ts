import { Router } from 'express';
import { AuthController } from '../controllers/authController';
import { authenticateToken } from '../middleware/auth';
import { validateRequest, registerSchema, loginSchema, refreshTokenSchema, changePasswordSchema, resetPasswordSchema } from '../middleware/validation';
import { authLimiter, passwordResetLimiter, registrationLimiter } from '../middleware/rateLimiter';

const router = Router();
const authController = new AuthController();

// Public routes
router.post('/register', 
  registrationLimiter,
  validateRequest(registerSchema),
  authController.register.bind(authController)
);

router.post('/login',
  authLimiter,
  validateRequest(loginSchema),
  authController.login.bind(authController)
);

router.post('/refresh',
  validateRequest(refreshTokenSchema),
  authController.refreshToken.bind(authController)
);

router.post('/logout',
  validateRequest(refreshTokenSchema),
  authController.logout.bind(authController)
);

router.post('/reset-password',
  passwordResetLimiter,
  validateRequest(resetPasswordSchema),
  authController.resetPassword.bind(authController)
);

// Protected routes
router.get('/profile',
  authenticateToken,
  authController.getProfile.bind(authController)
);

router.post('/change-password',
  authenticateToken,
  validateRequest(changePasswordSchema),
  authController.changePassword.bind(authController)
);

router.get('/validate',
  authenticateToken,
  authController.validateToken.bind(authController)
);

export default router;