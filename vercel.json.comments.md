# Vercel Configuration Documentation

This file explains what each line in `vercel.json` does.

## Complete Configuration with Comments

```json
{
  "version": 2,                              // ← Vercel config version (must be 2)
  "builds": [                                // ← Defines how to build your project
    {                                        // ← Frontend build configuration
      "src": "frontend/package.json",        // ← Points to React app's package.json
      "use": "@vercel/static-build",         // ← Uses static build tool for React
      "config": {                            // ← Frontend build settings
        "distDir": "build"                   // ← Built files go to frontend/build/
      }
    },
    {                                        // ← API build configuration
      "src": "api/package.json",             // ← Points to API's package.json
      "use": "@vercel/node"                  // ← Uses Node.js runtime for API
    }
  ],
  "rewrites": [                              // ← URL rewriting rules for routing
    {                                        // ← API routing rule
      "source": "/api/(.*)",                 // ← Matches any URL starting with /api/
      "destination": "/api/index.js"         // ← Routes to your serverless function
    },
    {                                        // ← Frontend routing rule
      "source": "/(.*)",                     // ← Matches ANY URL (catch-all)
      "destination": "/frontend/build/index.html"  // ← Routes to React app
    }
  ],
  "env": {                                   // ← Environment variables
    "NODE_ENV": "production",                // ← Sets production mode
    "CI": "false"                            // ← Prevents build failures from warnings
  }
}
```

## Line-by-Line Explanation

### Version
- **Line 2**: `"version": 2` - Tells Vercel to use version 2 of their configuration format

### Builds Section
- **Line 3**: `"builds": [` - Opens the builds array
- **Line 4**: `{` - Opens frontend build configuration
- **Line 5**: `"src": "frontend/package.json"` - Points to React app's package.json
- **Line 6**: `"use": "@vercel/static-build"` - Uses Vercel's static build tool
- **Line 7**: `"config": {` - Opens frontend build settings
- **Line 8**: `"distDir": "build"` - Built files go to frontend/build/ folder
- **Line 9**: `}` - Closes frontend build settings
- **Line 10**: `},` - Closes frontend build configuration
- **Line 11**: `{` - Opens API build configuration
- **Line 12**: `"src": "api/package.json"` - Points to API's package.json
- **Line 13**: `"use": "@vercel/node"` - Uses Node.js runtime
- **Line 14**: `}` - Closes API build configuration
- **Line 15**: `],` - Closes builds array

### Rewrites Section
- **Line 16**: `"rewrites": [` - Opens rewrites array
- **Line 17**: `{` - Opens API routing rule
- **Line 18**: `"source": "/api/(.*)"` - Matches URLs starting with /api/
- **Line 19**: `"destination": "/api/index.js"` - Routes to serverless function
- **Line 20**: `},` - Closes API routing rule
- **Line 21**: `{` - Opens frontend routing rule
- **Line 22**: `"source": "/(.*)"` - Matches ANY URL (catch-all)
- **Line 23**: `"destination": "/frontend/build/index.html"` - Routes to React app
- **Line 24**: `}` - Closes frontend routing rule
- **Line 25**: `],` - Closes rewrites array

### Environment Section
- **Line 26**: `"env": {` - Opens environment variables
- **Line 27**: `"NODE_ENV": "production"` - Sets production mode
- **Line 28**: `"CI": "false"` - Prevents build failures from warnings
- **Line 29**: `}` - Closes environment variables
- **Line 30**: `}` - Closes entire configuration

## How It Works

1. **Builds**: Vercel builds your frontend React app and API separately
2. **Rewrites**: When someone visits your site:
   - URLs starting with `/api/` → go to your API functions
   - All other URLs → go to your React app's index.html
3. **Environment**: Sets up production mode and prevents build failures

## Common Issues

- **404 Errors**: Usually caused by incorrect destination paths in rewrites
- **Build Failures**: Often due to missing dependencies or incorrect build configuration
- **API Not Working**: Check that API routing rule points to correct file 