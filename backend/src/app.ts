import compression from 'compression';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import { env } from './config/env';
import { swaggerSpec } from './docs/swagger';
import { prisma } from './lib/prisma';
import { errorHandler, notFound } from './middleware/error';
import { apiLimiter, CSRF_HEADER } from './middleware/security';
import { UPLOAD_DIR } from './lib/cloudinary';
import adminRoutes from './modules/admin/admin.routes';
import authRoutes from './modules/auth/auth.routes';
import cartRoutes from './modules/cart/cart.routes';
import orderRoutes from './modules/orders/orders.routes';
import sellerRoutes from './modules/seller/seller.routes';
import brandRoutes from './modules/brands/brands.routes';
import categoryRoutes from './modules/categories/categories.routes';
import marketingRoutes from './modules/marketing/marketing.routes';
import productRoutes from './modules/products/products.routes';
import reviewRoutes from './modules/reviews/reviews.routes';
import userRoutes from './modules/users/users.routes';

export function createApp() {
  const app = express();

  // Behind Railway/Render proxies: trust first hop so req.ip and secure cookies work.
  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(
    cors({
      origin: (origin, cb) => cb(null, !origin || env.corsOrigins.includes(origin)),
      credentials: true,
      allowedHeaders: ['Content-Type', 'Authorization', CSRF_HEADER, 'X-Session-Id'],
    }),
  );
  app.use(compression());
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: false, limit: '1mb' }));
  app.use(cookieParser());
  app.use(morgan(env.isProd ? 'combined' : 'dev'));

  app.get('/health', async (_req, res) => {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', uptime: process.uptime() });
  });

  // Locally stored uploads (fallback when Cloudinary is not configured).
  app.use('/uploads', express.static(UPLOAD_DIR, { maxAge: '30d', immutable: true, index: false, dotfiles: 'deny' }));

  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, { customSiteTitle: 'SKYMAP TRADERS API' }));
  app.get('/api/docs.json', (_req, res) => res.json(swaggerSpec));

  const api = express.Router();
  api.use(apiLimiter);
  api.use('/auth', authRoutes);
  api.use('/users', userRoutes);
  api.use('/products', productRoutes);
  api.use('/categories', categoryRoutes);
  api.use('/brands', brandRoutes);
  api.use('/reviews', reviewRoutes);
  api.use('/marketing', marketingRoutes);
  api.use('/cart', cartRoutes);
  api.use('/orders', orderRoutes);
  api.use('/admin', adminRoutes);
  api.use('/seller', sellerRoutes);
  app.use('/api/v1', api);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
