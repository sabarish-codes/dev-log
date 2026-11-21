export const openapiSpec = {
  openapi: '3.0.3',

  info: {
    title: 'Developer Logbook API',
    version: '1.0.0',
    description: 'API documentation for Developer Logbook',
  },

  servers: [
    {
      url: 'http://localhost:3000',
    },
  ],

  paths: {
    '/check': {
      get: {
        summary: 'Check API status',
        tags: ['System'],
        responses: {
          '200': { description: 'API is running' },
        },
      },
    },

    '/health': {
      get: {
        summary: 'Check API readiness',
        tags: ['System'],
        responses: {
          '200': {
            description: 'Dependencies healthy',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/HealthResponse' },
              },
            },
          },
          '503': { description: 'Dependency unavailable' },
        },
      },
    },

    '/api/v1/auth/register': {
      post: {
        summary: 'Register a new user',
        tags: ['Auth'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/RegisterRequest' },
            },
          },
        },
        responses: {
          '201': {
            description: 'User registered successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AuthResponse' },
              },
            },
          },
          '400': { description: 'Validation failed' },
          '409': { description: 'Email already registered' },
        },
      },
    },

    '/api/v1/auth/login': {
      post: {
        summary: 'Log in with credentials',
        tags: ['Auth'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/LoginRequest' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Login successful',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AuthResponse' },
              },
            },
          },
          '401': { description: 'Invalid email or password' },
        },
      },
    },

    '/api/v1/auth/me': {
      get: {
        summary: 'Get current user profile',
        tags: ['Auth'],
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Current user profile',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: {
                      type: 'object',
                      properties: {
                        user: { $ref: '#/components/schemas/User' },
                      },
                    },
                  },
                },
              },
            },
          },
          '401': { description: 'Unauthorized' },
        },
      },
    },

    '/api/v1/auth/refresh': {
      post: {
        summary: 'Rotate access and refresh tokens',
        tags: ['Auth'],
        description: 'Requires refreshToken cookie',
        responses: {
          '200': {
            description: 'New access token',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: {
                      type: 'object',
                      properties: {
                        accessToken: { type: 'string' },
                      },
                    },
                  },
                },
              },
            },
          },
          '401': { description: 'Invalid or missing refresh token' },
        },
      },
    },

    '/api/v1/auth/logout': {
      post: {
        summary: 'Log out user',
        tags: ['Auth'],
        description: 'Revokes refresh token and clears cookie',
        responses: {
          '200': { description: 'Logged out successfully' },
        },
      },
    },
  },

  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    schemas: {
      HealthResponse: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['ok', 'not_ready'] },
          checks: {
            type: 'object',
            properties: {
              database: { type: 'boolean' },
              redis: { type: 'boolean' },
            },
            required: ['database', 'redis'],
          },
        },
        required: ['status', 'checks'],
      },
      RegisterRequest: {
        type: 'object',
        required: ['username', 'email', 'password'],
        properties: {
          username: { type: 'string', example: 'developer' },
          email: { type: 'string', format: 'email', example: 'dev@devlog.io' },
          password: {
            type: 'string',
            format: 'password',
            minLength: 8,
            example: 'Password123!',
          },
        },
      },
      LoginRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email', example: 'dev@devlog.io' },
          password: {
            type: 'string',
            format: 'password',
            example: 'Password123!',
          },
        },
      },
      User: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          username: { type: 'string', example: 'developer' },
          email: { type: 'string', example: 'dev@devlog.io' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      AuthResponse: {
        type: 'object',
        properties: {
          data: {
            type: 'object',
            properties: {
              user: { $ref: '#/components/schemas/User' },
              accessToken: { type: 'string', example: 'eyJhbGciOiJIUzI1Ni...' },
            },
          },
        },
      },
    },
  },
};
