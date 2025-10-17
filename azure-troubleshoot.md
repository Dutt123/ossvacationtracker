# Azure App Service Troubleshooting Guide

## Enable Detailed Logging

```bash
# Enable container logging
az webapp log config --resource-group vacation-tracker-rg --name vacation-tracker-app --docker-container-logging filesystem --level verbose

# Enable application logging
az webapp log config --resource-group vacation-tracker-rg --name vacation-tracker-app --application-logging filesystem --level information

# Stream logs in real-time
az webapp log tail --resource-group vacation-tracker-rg --name vacation-tracker-app
```

## Check App Service Configuration

```bash
# Verify container settings
az webapp config container show --resource-group vacation-tracker-rg --name vacation-tracker-app

# Check app settings
az webapp config appsettings list --resource-group vacation-tracker-rg --name vacation-tracker-app

# Verify app service plan
az appservice plan show --resource-group vacation-tracker-rg --name vacation-tracker-plan
```

## Required App Settings for Azure

Set these in Azure Portal > App Service > Configuration:

```
WEBSITES_ENABLE_APP_SERVICE_STORAGE=false
WEBSITES_PORT=3000
PORT=3000
NODE_ENV=production
```

## Alternative Dockerfile for Azure (if issues persist)

Create `Dockerfile.azure`:

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY client/package*.json ./client/
COPY server/package*.json ./server/

# Install dependencies
RUN npm ci
RUN cd client && npm ci
RUN cd server && npm ci --only=production

# Copy and build
COPY . .
RUN cd client && npm run build

# Install curl for health checks
RUN apk add --no-cache curl

# Set permissions
RUN chmod -R 755 /app

EXPOSE 3000

CMD ["node", "server/index.js"]
```

## Test Container Locally with Azure Settings

```bash
# Test with Azure environment variables
docker run -p 3000:3000 -e PORT=3000 -e NODE_ENV=production -e WEBSITES_PORT=3000 vacation-tracker
```

## Common Azure App Service Issues

1. **Port Configuration**: Ensure WEBSITES_PORT=3000 is set
2. **File Permissions**: Azure runs as different user
3. **Static Files**: Verify client/dist exists and is accessible
4. **Health Checks**: Disable if causing issues initially

## Debug Commands

```bash
# Check if container is running
az webapp show --resource-group vacation-tracker-rg --name vacation-tracker-app --query state

# Restart the app
az webapp restart --resource-group vacation-tracker-rg --name vacation-tracker-app

# Check resource usage
az monitor metrics list --resource /subscriptions/{subscription-id}/resourceGroups/vacation-tracker-rg/providers/Microsoft.Web/sites/vacation-tracker-app --metric "CpuPercentage,MemoryPercentage"
```