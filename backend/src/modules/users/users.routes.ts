import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { imageUpload } from '../../middleware/upload';
import { validate } from '../../middleware/validate';
import { ApiError } from '../../utils/ApiError';
import { asyncHandler, ok } from '../../utils/http';
import { authService } from '../auth/auth.service';
import {
  changePasswordSchema,
  createAddressSchema,
  idParamSchema,
  updateAddressSchema,
  updateProfileSchema,
} from './users.schema';
import { usersService } from './users.service';

const router = Router();
router.use(authenticate);

/**
 * @openapi
 * /users/me:
 *   get:
 *     tags: [Users]
 *     security: [{ bearerAuth: [] }]
 *     summary: Current user's profile
 *   patch:
 *     tags: [Users]
 *     security: [{ bearerAuth: [] }]
 *     summary: Update name, phone or language
 */
router.get('/me', asyncHandler(async (req, res) => ok(res, await usersService.getMe(req.user!.id))));
router.patch(
  '/me',
  validate(updateProfileSchema),
  asyncHandler(async (req, res) => ok(res, await usersService.updateMe(req.user!.id, req.body))),
);

/**
 * @openapi
 * /users/me/avatar:
 *   post:
 *     tags: [Users]
 *     security: [{ bearerAuth: [] }]
 *     summary: Upload a profile photo (multipart field "avatar")
 */
router.post(
  '/me/avatar',
  imageUpload.single('avatar'),
  asyncHandler(async (req, res) => {
    if (!req.file) throw ApiError.badRequest('Attach an image in the "avatar" field');
    ok(res, await usersService.updateAvatar(req.user!.id, req.file));
  }),
);

/**
 * @openapi
 * /users/me/password:
 *   post:
 *     tags: [Users]
 *     security: [{ bearerAuth: [] }]
 *     summary: Change password (Google-only accounts may set one without currentPassword)
 */
router.post(
  '/me/password',
  validate(changePasswordSchema),
  asyncHandler(async (req, res) => {
    await authService.changePassword(req.user!.id, req.body.currentPassword, req.body.newPassword);
    ok(res, { message: 'Password updated' });
  }),
);

/**
 * @openapi
 * /users/me/addresses:
 *   get:
 *     tags: [Users]
 *     security: [{ bearerAuth: [] }]
 *     summary: List saved addresses
 *   post:
 *     tags: [Users]
 *     security: [{ bearerAuth: [] }]
 *     summary: Add an address
 * /users/me/addresses/{id}:
 *   patch:
 *     tags: [Users]
 *     security: [{ bearerAuth: [] }]
 *     summary: Update an address
 *   delete:
 *     tags: [Users]
 *     security: [{ bearerAuth: [] }]
 *     summary: Delete an address
 */
router.get('/me/addresses', asyncHandler(async (req, res) => ok(res, await usersService.listAddresses(req.user!.id))));
router.post(
  '/me/addresses',
  validate(createAddressSchema),
  asyncHandler(async (req, res) => ok(res, await usersService.createAddress(req.user!.id, req.body), undefined, 201)),
);
router.patch(
  '/me/addresses/:id',
  validate(updateAddressSchema),
  asyncHandler(async (req, res) => ok(res, await usersService.updateAddress(req.user!.id, req.params.id, req.body))),
);
router.delete(
  '/me/addresses/:id',
  validate(idParamSchema),
  asyncHandler(async (req, res) => {
    await usersService.deleteAddress(req.user!.id, req.params.id);
    ok(res, { message: 'Address deleted' });
  }),
);

export default router;
