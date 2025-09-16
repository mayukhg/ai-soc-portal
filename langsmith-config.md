# LangSmith Configuration Guide

## Environment Variables Required

Add these environment variables to your `.env` file:

```bash
# LangSmith Configuration
REACT_APP_LANGSMITH_API_KEY=your_langsmith_api_key_here
REACT_APP_LANGSMITH_PROJECT=ai-soc-portal

# Environment
NODE_ENV=development
```

## Getting LangSmith API Key

1. Sign up for LangSmith at https://smith.langchain.com/
2. Create a new project called "ai-soc-portal"
3. Generate an API key from your project settings
4. Add the API key to your environment variables

## Configuration Options

The LangSmith service supports the following configuration options:

- `apiKey`: Your LangSmith API key (required)
- `projectName`: Project name in LangSmith (default: "ai-soc-portal")
- `environment`: Environment type (development/staging/production)
- `enableTracing`: Enable workflow tracing (default: true)
- `enableEvaluations`: Enable evaluation metrics (default: true)
- `enableCustomMetrics`: Enable custom metrics collection (default: true)
- `samplingRate`: Sampling rate for traces (0.0 to 1.0, default: 1.0)
- `retentionDays`: How long to keep traces (default: 30)
- `enableErrorTracking`: Enable error tracking (default: true)
- `enablePerformanceMonitoring`: Enable performance monitoring (default: true)

## Usage in Components

```typescript
import { useLangSmith } from '@/hooks/useLangSmith';

const MyComponent = () => {
  const langSmith = useLangSmith();
  
  // Check if LangSmith is enabled
  if (!langSmith.isEnabled) {
    console.warn('LangSmith is not configured');
    return null;
  }
  
  // Use LangSmith tracing...
};
```
