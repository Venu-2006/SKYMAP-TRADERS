import path from 'path';
import swaggerJSDoc from 'swagger-jsdoc';

/** OpenAPI spec assembled from @openapi JSDoc blocks in the route files. */
export const swaggerSpec = swaggerJSDoc({
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'SKYMAP TRADERS API',
      version: '1.0.0',
      description:
        'REST API for the SKYMAP TRADERS marketplace. Responses use the envelope `{ success, data, meta? }`; errors use `{ success: false, message, details? }`.',
    },
    servers: [{ url: '/api/v1' }],
    components: {
      securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string' },
            name: { type: 'string' },
            role: { type: 'string', enum: ['CUSTOMER', 'SELLER', 'ADMIN', 'SUPER_ADMIN'] },
            emailVerified: { type: 'boolean' },
            referralCode: { type: 'string' },
          },
        },
        Error: {
          type: 'object',
          properties: { success: { type: 'boolean', example: false }, message: { type: 'string' }, details: {} },
        },
      },
    },
  },
  // Match both ts (dev) and compiled js (prod) route files. Glob needs forward slashes (even on
  // Windows) and does not expand {ts,js} braces reliably, so list each extension separately.
  apis: ['ts', 'js'].map((ext) => path.join(__dirname, `../modules/**/*.routes.${ext}`).replace(/\\/g, '/')),
});
