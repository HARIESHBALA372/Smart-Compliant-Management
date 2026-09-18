import swaggerJSDoc from 'swagger-jsdoc'
import { env } from '../config/env'

// Minimal inline type for swagger-jsdoc options (no @types/swagger-jsdoc installed)
interface SwaggerJsDocOptions {
  definition: Record<string, unknown>
  apis: string[]
}

const options: SwaggerJsDocOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Smart Complaint Management API',
      version: '1.0.0',
      description:
        'REST API for the Smart Complaint Management App — registration, complaint lifecycle, rule-based classification, SLA monitoring, notifications, feedback and admin management.',
    },
    servers: [{ url: `http://localhost:${env.PORT}/api`, description: 'Local server' }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            email: { type: 'string' },
            role: { type: 'string', enum: ['USER', 'STAFF', 'ADMIN'] },
            isActive: { type: 'boolean' },
          },
        },
        Complaint: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            complaintNumber: { type: 'string', example: 'CMP-2026-000001' },
            title: { type: 'string' },
            description: { type: 'string' },
            category: { type: 'string', enum: ['WATER', 'ELECTRICITY', 'ROADS', 'SANITATION', 'TRANSPORT', 'SAFETY', 'OTHER'] },
            priority: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] },
            status: { type: 'string', enum: ['SUBMITTED', 'UNDER_REVIEW', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'REJECTED', 'CLOSED'] },
            location: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string' },
            error: { type: 'object', nullable: true },
          },
        },
        Notification: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            userId: { type: 'string' },
            complaintId: { type: 'string', nullable: true },
            type: {
              type: 'string',
              enum: [
                'COMPLAINT_CREATED',
                'COMPLAINT_ASSIGNED',
                'STATUS_UPDATED',
                'COMMENT_ADDED',
                'COMPLAINT_RESOLVED',
                'COMPLAINT_CLOSED',
                'COMPLAINT_ESCALATED',
                'COMPLAINT_REJECTED',
                'COMPLAINT_REOPENED',
                'COMPLAINT_PRIORITY_CHANGED',
                'FEEDBACK_REQUEST',
                'ADMIN_ANNOUNCEMENT',
                'SYSTEM_NOTIFICATION',
                'SLA_WARNING',
                'SLA_BREACHED',
              ],
            },
            channel: { type: 'string', enum: ['IN_APP', 'EMAIL'] },
            priority: { type: 'string', enum: ['NORMAL', 'IMPORTANT', 'CRITICAL'] },
            title: { type: 'string' },
            message: { type: 'string' },
            isRead: { type: 'boolean' },
            readAt: { type: 'string', format: 'date-time', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        NotificationPreferences: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            userId: { type: 'string' },
            complaintStatusUpdates: { type: 'boolean' },
            complaintAssignment: { type: 'boolean' },
            complaintResolution: { type: 'boolean' },
            commentNotifications: { type: 'boolean' },
            slaAlerts: { type: 'boolean' },
            emailNotifications: { type: 'boolean' },
            inAppNotifications: { type: 'boolean' },
            announcements: { type: 'boolean' },
            feedbackRequests: { type: 'boolean' },
          },
        },
      },
    },
    tags: [
      { name: 'Auth' },
      { name: 'Complaints' },
      { name: 'Notifications' },
      { name: 'Feedback' },
      { name: 'Departments' },
      { name: 'Dashboard' },
      { name: 'Analytics' },
      { name: 'Admin' },
    ],
    paths: {
      '/notifications': {
        get: {
          tags: ['Notifications'],
          summary: 'List my notifications',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'page', in: 'query', schema: { type: 'integer' } },
            { name: 'limit', in: 'query', schema: { type: 'integer' } },
            { name: 'unread', in: 'query', schema: { type: 'boolean' } },
            { name: 'type', in: 'query', schema: { type: 'string' } },
          ],
          responses: {
            '200': { description: 'Paginated notifications with unreadCount' },
            '401': { description: 'Unauthorized' },
          },
        },
      },
      '/notifications/unread-count': {
        get: {
          tags: ['Notifications'],
          summary: 'Get my unread notification count',
          security: [{ bearerAuth: [] }],
          responses: {
            '200': { description: '{ "data": { "unreadCount": 3 } }' },
          },
        },
      },
      '/notifications/preferences': {
        get: {
          tags: ['Notifications'],
          summary: 'Get my notification preferences',
          security: [{ bearerAuth: [] }],
          responses: { '200': { description: 'NotificationPreferences' } },
        },
        put: {
          tags: ['Notifications'],
          summary: 'Update my notification preferences',
          security: [{ bearerAuth: [] }],
          requestBody: {
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/NotificationPreferences' },
              },
            },
          },
          responses: { '200': { description: 'Updated NotificationPreferences' } },
        },
      },
      '/notifications/announce': {
        post: {
          tags: ['Notifications'],
          summary: 'Broadcast an announcement to all active users (ADMIN)',
          security: [{ bearerAuth: [] }],
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['title', 'message'],
                  properties: {
                    title: { type: 'string' },
                    message: { type: 'string' },
                    type: { type: 'string', enum: ['ADMIN_ANNOUNCEMENT', 'SYSTEM_NOTIFICATION'] },
                  },
                },
              },
            },
          },
          responses: { '200': { description: '{ "data": { "sent": <count> } }' } },
        },
      },
      '/notifications/read-all': {
        put: {
          tags: ['Notifications'],
          summary: 'Mark all my notifications as read',
          security: [{ bearerAuth: [] }],
          responses: { '200': { description: 'Count of updated rows' } },
        },
      },
      '/notifications/{id}/read': {
        put: {
          tags: ['Notifications'],
          summary: 'Mark a notification as read',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { '200': { description: 'Updated notification' } },
        },
      },
      '/notifications/{id}': {
        delete: {
          tags: ['Notifications'],
          summary: 'Delete a notification',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { '200': { description: 'Deleted' } },
        },
      },
    },
  },
  apis: [],
}

export async function swaggerSpec(): Promise<Record<string, unknown>> {
  const jsdoc = (await import('swagger-jsdoc')).default
  return jsdoc(options) as unknown as Record<string, unknown>
}