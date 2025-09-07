# Self-Healing Test Automation Harness

> **🚧 ALPHA RELEASE** - This is the Plugin Architecture Foundation. The actual test engines (Playwright, Jest, k6, OWASP ZAP) are not yet implemented.

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

### 🔌 Plugin Architecture

The system is built on a robust plugin architecture that supports:

- **Dynamic Plugin Registration**: Plugins can be registered and discovered at runtime
- **Factory Pattern**: Test engines are created through a factory system
- **Dependency Injection**: Clean dependency management with a DI container
- **Interface-Based Design**: All plugins implement well-defined interfaces
- **Lifecycle Management**: Proper initialization and cleanup of plugin resources

#### Core Components

- **`ITestEngine`**: Interface for all test engines (Playwright, Jest, k6, OWASP ZAP)
- **`IHealingStrategy`**: Interface for self-healing algorithms
- **`PluginRegistry`**: Central registry for plugin management
- **`TestEngineFactory`**: Factory for creating and configuring test engines
- **`DependencyContainer`**: Simple dependency injection container

#### Demo the Architecture

```bash
# Run the plugin architecture demo
npx ts-node src/demo/run-demo.ts
```

This demo shows:
- Plugin registration and discovery
- Test engine creation and execution
- Self-healing capabilities
- Complete lifecycle management

## 🎯 Roadmap

- [x] Project foundation and build system
- [x] Plugin architecture implementation
- [ ] Configuration management system
- [ ] Playwright E2E test engine
- [ ] Basic self-healing engine
- [ ] REST API implementation
- [ ] Docker containerization
- [ ] Observability and reporting

> **📝 Note**: Once we have deployable test engines, we'll need to update the release workflow to move from alpha pre-releases to production releases.

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
