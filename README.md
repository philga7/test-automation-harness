# Self-Healing Test Automation Harness

A comprehensive TypeScript/Node.js test automation platform that orchestrates multiple test types (unit, e2e, performance, security) with AI-powered self-healing capabilities.

## 🚀 Features

- **Multi-Engine Support**: Playwright (E2E), Jest (Unit), k6 (Performance), OWASP ZAP (Security)
- **AI-Powered Self-Healing**: Automatic locator recovery and test adaptation
- **Unified Reporting**: Consolidated dashboard for all test types
- **Docker Ready**: Containerized deployment in under 10 minutes
- **Observability**: OpenTelemetry integration with comprehensive metrics

## 📋 Prerequisites

- Node.js 20+ 
- npm or yarn
- Docker (for containerized deployment)

## 🛠️ Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Build the Project

```bash
npm run build
```

### 3. Start the Application

```bash
npm start
```

The application will be available at `http://localhost:3000`

### 4. Verify Installation

```bash
# Health check
curl http://localhost:3000/health

# API status
curl http://localhost:3000/api/status
```

## 📁 Project Structure

```
src/
├── api/           # REST API endpoints
├── config/        # Configuration management
├── core/          # Core orchestration logic
├── engines/       # Test engine implementations
├── healing/       # Self-healing algorithms
├── observability/ # Metrics and monitoring
├── types/         # TypeScript type definitions
└── utils/         # Shared utilities
```

## 🔧 Development

### Available Scripts

- `npm run build` - Compile TypeScript to JavaScript
- `npm start` - Start the production server
- `npm run dev` - Start development server with hot reload
- `npm test` - Run test suite
- `npm run lint` - Run ESLint
- `npm run clean` - Clean build artifacts

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Server port |
| `NODE_ENV` | `development` | Environment mode |
| `LOG_LEVEL` | `info` | Logging level |
| `HEALING_ENABLED` | `true` | Enable self-healing |
| `HEALING_CONFIDENCE_THRESHOLD` | `0.6` | Minimum confidence for auto-healing |

## 🐳 Docker Deployment

```bash
# Build Docker image
docker build -t test-automation-harness .

# Run container
docker run -p 3000:3000 test-automation-harness
```

## 📊 Architecture

The harness follows a plugin-based architecture with:

- **Core Orchestrator**: Manages test execution and coordination
- **Engine Plugins**: Swappable test engines for different test types
- **Healing Engine**: AI-powered test recovery and adaptation
- **Configuration System**: YAML-based test and environment configuration
- **Observability Layer**: Metrics collection and reporting

## 🎯 Roadmap

- [x] Project foundation and build system
- [ ] Plugin architecture implementation
- [ ] Configuration management system
- [ ] Playwright E2E test engine
- [ ] Basic self-healing engine
- [ ] REST API implementation
- [ ] Docker containerization
- [ ] Observability and reporting

## 📄 License

ISC

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📞 Support

For questions and support, please open an issue in the GitHub repository.
