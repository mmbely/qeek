# Qeek Development Guidelines

## Project Setup

### Prerequisites
- Node.js (LTS version)
- npm (preferred package manager)
- Python 3.x (for repository indexer)
- Firebase CLI

### Initial Setup
```bash
# Install dependencies
npm install

# Setup repository indexer
cd functions/repository-indexer
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

## Code Organization

### Directory Structure
```
qeek/
├── src/
│   ├── components/     # React components
│   ├── context/       # React context providers
│   ├── hooks/         # Custom React hooks
│   ├── pages/         # Page components
│   ├── services/      # API and service functions
│   ├── types/         # TypeScript type definitions
│   └── utils/         # Utility functions
├── functions/         # Firebase Functions
└── .cursor/          # Project documentation
```

## Development Standards

### TypeScript
- Use TypeScript for all new code
- Define interfaces for all data structures
- Avoid using `any` type
- Use type inference when types are obvious
- Export types and interfaces when shared across files

### React Components
1. **Component Structure**
   ```typescript
   // ComponentName.tsx
   import React from 'react';
   import { ComponentProps } from './types';
   
   export const ComponentName: React.FC<ComponentProps> = ({ prop1, prop2 }) => {
     // Component logic
     return (
       // JSX
     );
   };
   ```

2. **Hooks Usage**
   - Use custom hooks for shared logic
   - Follow hooks naming convention: `use[Feature]`
   - Keep hooks focused and composable

### State Management
1. **React Context**
   - Use for global state (auth, theme, etc.)
   - Keep context providers close to where they're needed
   - Split large contexts into smaller, focused ones

2. **Local State**
   - Use `useState` for simple component state
   - Use `useReducer` for complex state logic
   - Consider `useMemo` and `useCallback` for performance optimization

### Firebase Integration
1. **Security Rules**
   - Always test security rules before deployment
   - Follow principle of least privilege
   - Document complex rules

2. **Data Structure**
   - Follow Firestore best practices for scalability
   - Use subcollections for related data
   - Keep documents small and focused

### Styling
1. **Tailwind CSS**
   - Use utility classes for styling
   - Create custom components for repeated patterns
   - Follow mobile-first approach

2. **Material UI**
   - Use MUI components for complex UI elements
   - Maintain consistent theme across components
   - Customize using theme provider

## Git Workflow

### Branch Naming
- feature/[feature-name]
- bugfix/[bug-description]
- hotfix/[issue-number]
- release/[version]

### Commit Messages
```
type(scope): description

[optional body]
[optional footer]
```
Types:
- feat: New feature
- fix: Bug fix
- docs: Documentation
- style: Formatting
- refactor: Code restructuring
- test: Adding tests
- chore: Maintenance

### Pull Requests
- Use PR template
- Include test coverage
- Link related issues
- Request review from relevant team members

## Testing

### Unit Tests
- Write tests for all new features
- Use React Testing Library
- Focus on user behavior over implementation
- Maintain high test coverage

### Integration Tests
- Test component integration
- Verify Firebase interactions
- Mock external services

## Performance Guidelines

### React Optimization
- Use React.memo for expensive renders
- Implement proper cleanup in useEffect
- Avoid prop drilling with context
- Use lazy loading for routes

### Firebase Usage
- Implement proper indexing
- Use batch operations for multiple updates
- Monitor quota usage
- Cache frequently accessed data

## Error Handling

### Frontend
- Use error boundaries for React components
- Implement proper form validation
- Show user-friendly error messages
- Log errors to monitoring service

### Backend
- Use try-catch blocks
- Return appropriate HTTP status codes
- Log errors with context
- Handle Firebase errors gracefully

## Documentation

### Code Documentation
- Document complex functions
- Add JSDoc comments for public APIs
- Keep README files updated
- Document configuration requirements

### Component Documentation
- Update components.json for new components
- Include usage examples
- Document props and types
- Note any dependencies

## Deployment

### Environment Setup
```bash
# Development
REACT_APP_API_URL=http://localhost:3001
REACT_APP_FIREBASE_CONFIG={...}

# Production
REACT_APP_API_URL=https://api.qeek.app
REACT_APP_FIREBASE_CONFIG={...}
```

### Deployment Checklist
- Run all tests
- Check bundle size
- Verify environment variables
- Test on staging environment
- Monitor error reporting
- Check Firebase quotas

## Security

### Frontend
- Sanitize user input
- Implement proper authentication flows
- Use secure HTTP headers
- Follow OWASP guidelines

### Backend
- Validate all inputs
- Use proper Firebase security rules
- Implement rate limiting
- Monitor for suspicious activity

## Monitoring

### Error Tracking
- Use Firebase Crashlytics
- Monitor performance metrics
- Track user engagement
- Set up alerts for critical issues

### Performance Monitoring
- Track page load times
- Monitor Firebase quotas
- Check API response times
- Monitor resource usage
