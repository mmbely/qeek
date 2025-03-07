# Getting Started with Create React App

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

The page will reload if you make edits.\
You will also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can't go back!**

If you aren't satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you're on your own.

You don't have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn't feel obligated to use this feature. However we understand that this tool wouldn't be useful if you couldn't customize it when you are ready for it.

## Repository Indexer

The repository indexer is a Python tool that analyzes GitHub repositories, extracts metadata, and generates AI-powered insights about the codebase.

### Setup and Installation

1. Navigate to the repository-indexer directory:
   ```bash
   cd functions/repository-indexer
   ```

2. Create and activate a virtual environment:
   ```bash
   python3 -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

### Usage

#### Syncing a Repository

To sync a GitHub repository and analyze its contents:
   ```bash
   python3 src/cli.py <repository_name> --account-id <account_id>
   ```

Example:
   ```bash
   
python3 src/cli.py mmbely/qeek --account-id slakjdsakjdkajsdksajdlksaj
   ```


#### Additional Options

The CLI supports several options to customize the sync process:

   ```bash 
python3 src/cli.py <repository_name> --account-id <account_id> [OPTIONS]
   ```

Available options:
- `--max-files <number>`: Limit the number of files to process
- `--skip-types <extensions>`: Skip files with specific extensions (comma-separated)
- `--force`: Force reprocessing of all files, even if they haven't changed
- `--verbose`: Enable verbose logging for debugging

Example with options:

   ```bash 
python3 src/cli.py mmbely/qeek --account-id sadsadsadsad --max-files 50 --skip-types .jpg,.png,.svg --verbose
   ```


### Monitoring Progress

The sync process updates the repository status in Firestore in real-time. You can monitor the progress in the application UI under the GitHub Settings section.

### Troubleshooting

If you encounter issues:

1. Ensure your GitHub token has the necessary permissions
2. Check that your account ID is correct
3. Verify that the Firebase project is properly configured
4. Look for error messages in the CLI output

For detailed logs, run the command with the `--verbose` flag.

## Component System

### Documentation

All reusable components are documented in `.cursor/components.json`. This file contains:
- Component metadata and descriptions
- Props documentation
- Styling information including theme usage
- Usage examples and current implementations

### Shared Components

#### Notification Component
A standardized notification component for displaying success and error messages:

```tsx
import { Notification } from '../components/ui/notification';

// Success example
<Notification
  type="success"
  message="Operation completed successfully"
/>

// Error example
<Notification
  type="error"
  message="An error occurred"
/>
```

Features:
- Consistent styling using theme colors
- Dark mode support
- Type-safe props
- Appropriate icons for each type

### Development Standards

When developing components:
1. Follow TypeScript type safety guidelines
2. Ensure dark mode compatibility
3. Use theme colors from `theme.ts`
4. Document new components in `components.json`
5. Follow existing component structure

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).
