# MLtrack UI - Modern Dashboard for MLflow

A beautiful, modern React/Next.js UI for MLflow experiment tracking that makes ML experimentation more intuitive and engaging.

## Features

- 🎨 **Modern Design**: Clean, intuitive interface built with shadcn/ui
- 📊 **Rich Visualizations**: Interactive charts for metrics comparison
- 💰 **LLM Cost Tracking**: Monitor API costs across providers and models
- 🔄 **Real-time Updates**: Auto-refresh to track running experiments
- 🌓 **Dark Mode**: Support for light and dark themes
- 📱 **Responsive**: Works seamlessly on desktop and mobile

## Quick Start

1. **Install dependencies**:
```bash
npm install
```

2. **Configure environment**:
```bash
cp .env.example .env
# Edit .env with your MLflow server URL
```

3. **Run the development server**:
```bash
npm run dev
```

4. **Open** [http://localhost:3000](http://localhost:3000)

## Configuration

### Environment Variables

- `MLFLOW_TRACKING_URI`: MLflow server URL (default: http://localhost:5000)
- `MLFLOW_TRACKING_USERNAME`: Optional basic auth username
- `MLFLOW_TRACKING_PASSWORD`: Optional basic auth password
- `MLFLOW_TRACKING_TOKEN`: Optional bearer token for authentication

### Integration with mltrack CLI

The UI integrates seamlessly with the mltrack CLI:

```bash
# Start MLflow server
mltrack ui

# In another terminal, start the modern UI
cd ui && npm run dev
```

## Architecture

- **Next.js 14**: App router with server components
- **TypeScript**: Full type safety
- **Tailwind CSS**: Utility-first styling
- **shadcn/ui**: High-quality React components
- **TanStack Query**: Efficient data fetching and caching
- **Recharts**: Beautiful, responsive charts
- **Zustand**: Lightweight state management

## API Proxy

The UI includes a built-in API proxy to handle CORS and authentication:
- All MLflow API calls go through `/api/mlflow/*`
- Automatic authentication header injection
- CORS headers for cross-origin requests

## Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## Deployment

### Vercel (Recommended)
```bash
vercel
```

### Docker
```bash
docker build -t mltrack-ui .
docker run -p 3000:3000 -e MLFLOW_TRACKING_URI=http://your-mlflow:5000 mltrack-ui
```

### Self-hosted
```bash
npm run build
npm start
```

## Contributing

We welcome contributions! Please see the main mltrack repository for guidelines.

## License

MIT - See LICENSE file in the root directory
