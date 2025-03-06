# Qeek API Documentation

## Overview

Qeek uses a hybrid API approach:
1. Firebase Services (Authentication, Firestore, Storage, Functions)
2. Custom REST API endpoints
3. Gemini AI Integration

## Authentication

### Firebase Authentication

All API requests require authentication using Firebase Authentication. The client should include the Firebase ID token in the Authorization header:

```
Authorization: Bearer <firebase_id_token>
```

## REST Endpoints

Base URL: `http://localhost:3001` (development) or configured via `REACT_APP_API_URL`

### Repository Management

#### Sync Repository
```http
POST /api/repository/sync
Content-Type: application/json

{
    "repositoryName": "string",
    "userId": "string",
    "accountId": "string"
}
```

Response:
```json
{
    "status": "success",
    "syncId": "string"
}
```

## Firebase Services

### Chat Service

#### Messages Collection
- Collection: `messages`
- Document structure:
```typescript
interface Message {
    id: string;
    content: string;
    channelId: string;
    senderId: string;
    timestamp: Timestamp;
    // Optional fields
    edited?: boolean;
    editedAt?: Timestamp;
}
```

Operations:
- Send Message: `addDoc(collection(db, 'messages'), messageData)`
- Update Message: `updateDoc(doc(db, 'messages', messageId), updates)`
- Delete Message: `deleteDoc(doc(db, 'messages', messageId))`
- Subscribe to Messages: Query with `onSnapshot`

### User Management

#### Users Collection
- Collection: `users`
- Document structure:
```typescript
interface CustomUser {
    id: string;
    email: string;
    displayName: string;
    role: 'admin' | 'member';
    accountId: string;
}
```

### Email Service

Firebase Functions for email operations:

#### Send Invitation Email
```typescript
interface InvitationEmailData {
    email: string;
    accountName: string;
    role: 'admin' | 'member';
    invitationId: string;
}
```

## AI Integration (Gemini)

### Generate AI Summary
```typescript
interface GeminiResponse {
    error?: string;
    modelVersion?: string;
    candidates?: Array<{
        content: {
            parts: Array<{ text: string }>;
        };
        finishReason?: string;
        avgLogprobs?: number;
    }>;
    content: {
        parts: Array<{ text: string }>;
    };
    text: string;
}
```

Endpoints:
```typescript
generateAISummary(
    content: string,
    filePath: string,
    customPrompt: string
): Promise<GeminiResponse>
```

## Error Handling

All API endpoints follow a consistent error response format:

```json
{
    "error": {
        "code": "string",
        "message": "string",
        "details": {} // Optional additional error context
    }
}
```

Common HTTP Status Codes:
- 200: Success
- 400: Bad Request
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 500: Internal Server Error

## Rate Limiting

- Firebase services have their own rate limiting based on your Firebase plan
- Custom REST endpoints: TBD (implement rate limiting if needed)

## Websocket Connections

Real-time updates are handled through Firebase's real-time capabilities:
- Chat messages: `onSnapshot` listeners
- Repository sync status: Firestore document listeners
- User presence: Firestore with Firebase Realtime Database

## Development Guideliness

1. Always use TypeScript interfaces for request/response typing
2. Implement proper error handling for all API calls
3. Use the provided service functions instead of direct Firebase calls
4. Monitor Firebase quotas and usage limits
5. Follow security best practices:
   - Validate all inputs
   - Use appropriate Firebase security rules
   - Never expose sensitive data in client-side code
