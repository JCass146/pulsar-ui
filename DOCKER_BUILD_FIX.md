# Docker Build Fix for Pulsar UI

## Problem
The local UI looks good but the Docker/Portainer build looks different due to cached build layers not including the new modular CSS structure.

## Solution

### 1. Added `.dockerignore`
Created `.dockerignore` to exclude unnecessary files from the build context (node_modules, dist, etc.). This ensures a clean build.

### 2. Updated Dockerfile
Changed from `npm install` to `npm ci` and `npm run build` instead of calling vite directly. This ensures:
- Cleaner dependency installation
- Proper use of package.json scripts
- Better build reproducibility

### 3. Force Rebuild in Portainer

When rebuilding in Portainer, you MUST use **"Build without cache"** option:

#### In Portainer:
1. Go to your stack
2. Click "Editor" or "Build/Deploy"
3. **Enable "Pull latest image versions"**
4. **Enable "No cache"** (or similar option)
5. Click "Deploy" or "Update"

#### Alternative: Command Line
If you have SSH/terminal access to your Docker host:

```bash
# Navigate to the UI directory
cd /path/to/pulsar-ui/ui

# Build without cache
docker build --no-cache -t pulsar-ui:latest .

# Or if using docker-compose:
docker-compose build --no-cache ui
```

### 4. Verify the Build

After rebuilding, verify the CSS is included:

```bash
# Check the built files in the container
docker run --rm pulsar-ui:latest ls -la /usr/share/nginx/html/assets/

# Should see a CSS file like: index-[hash].css
```

### 5. Clear Browser Cache

After deployment, clear your browser cache or do a hard refresh:
- Chrome/Edge: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
- Firefox: Ctrl+F5 (Windows) or Cmd+Shift+R (Mac)

## Files Modified
- `Dockerfile` - Updated build process
- `.dockerignore` - Added to exclude build artifacts
- CSS structure is already correct in `src/main.jsx`

## CSS Import Order (Already Correct)
```javascript
import "./styles/tokens.css";    // Design tokens
import "./styles/base.css";      // HTML defaults
import "./styles/utilities.css"; // Helper classes
import "./styles/layout.css";    // Layout patterns
import "./styles.css";           // View-specific styles
```

## Notes
- The modular CSS files are in `src/styles/`
- All imports are in `src/main.jsx`
- Vite bundles everything into a single CSS file in production
- The issue was Docker using cached layers from before the CSS refactoring
