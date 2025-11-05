# RoadBuilder Frontend

Frontend application for RoadBuilder - a roadmap building tool built with Vue 3, TypeScript, and Vite.

## Prerequisites

- **Node.js**: `^20.19.0` or `>=22.12.0` (see `package.json` engines field)
- **npm**: Comes with Node.js

## Repository Structure

```
roadbuilder_frontend/
├── src/
│   ├── assets/           # Static assets (CSS, images, fonts)
│   ├── components/       # Reusable Vue components
│   │   ├── icons/       # Icon components
│   │   └── __tests__/   # Component unit tests
│   ├── router/          # Vue Router configuration
│   ├── services/        # API service layer and type definitions
│   ├── stores/          # Pinia state management stores
│   ├── views/           # Page-level Vue components
│   ├── App.vue          # Root component
│   └── main.ts          # Application entry point
├── design/              # Design documentation and specifications
├── public/              # Public static assets
├── dist/                # Production build output (generated)
├── package.json         # Dependencies and scripts
├── vite.config.ts       # Vite configuration
├── tsconfig.json        # TypeScript configuration
└── vitest.config.ts     # Vitest test configuration
```

### Key Directories

- **`src/components/`**: Reusable UI components including `RoadmapEditor`, `MarkdownEditor`, `NodeContentPanel`
- **`src/views/`**: Page components for routes (`LoginView`, `RegisterView`, `RoadmapView`, `WelcomeView`)
- **`src/stores/`**: Pinia stores for state management (`auth.ts`, `roadmap.ts`)
- **`src/services/`**: API client (`api.ts`) and TypeScript type definitions (`types.ts`)
- **`src/router/`**: Vue Router setup with authentication guards

## Environment Variables

Create a `.env` file in the root directory to configure the application:

```env
# Backend API Base URL (default: http://localhost:8000)
VITE_API_BASE_URL=http://localhost:8000

# Base URL for the application (default: /)
# Used by Vue Router for base path configuration
VITE_BASE_URL=/
```

### Environment Variable Notes

- All environment variables for Vite must be prefixed with `VITE_` to be exposed to the client-side code
- Currently, the API base URL is hardcoded in `src/services/api.ts` as `http://localhost:8000`
- To use the environment variable, update `api.ts` to read from `import.meta.env.VITE_API_BASE_URL`
- The `.env` file should be added to `.gitignore` (do not commit sensitive configuration)

## Project Setup

### Install Dependencies

```sh
npm install
```

### Development

Start the development server with hot-reload:

```sh
npm run dev
```

The application will be available at `http://localhost:5173` (or the next available port).

### Build for Production

Type-check, compile, and minify for production:

```sh
npm run build
```

The production build will be output to the `dist/` directory.

### Preview Production Build

Preview the production build locally:

```sh
npm run preview
```

### Testing

Run unit tests with [Vitest](https://vitest.dev/):

```sh
npm run test:unit
```

### Linting

Lint and auto-fix code with [ESLint](https://eslint.org/):

```sh
npm run lint
```

### Formatting

Format code with Prettier:

```sh
npm run format
```

## Development Tools

### Recommended IDE Setup

- **[VS Code](https://code.visualstudio.com/)** + **[Vue (Official)](https://marketplace.visualstudio.com/items?itemName=Vue.volar)** extension
  - Disable the Vetur extension if installed
  - The Volar extension provides TypeScript support for `.vue` files

### Recommended Browser Setup

- **Chromium-based browsers** (Chrome, Edge, Brave, etc.):
  - [Vue.js devtools](https://chromewebstore.google.com/detail/vuejs-devtools/nhdogjmejiglipccpnnnanhbledajbpd)
  - [Turn on Custom Object Formatter in Chrome DevTools](http://bit.ly/object-formatters)
- **Firefox**:
  - [Vue.js devtools](https://addons.mozilla.org/en-US/firefox/addon/vue-js-devtools/)
  - [Turn on Custom Object Formatter in Firefox DevTools](https://fxdx.dev/firefox-devtools-custom-object-formatters/)

## TypeScript Support

TypeScript cannot handle type information for `.vue` imports by default. This project uses:

- `vue-tsc` for type checking (replaces `tsc` CLI)
- [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) extension for IDE type support

## Backend Integration

This frontend communicates with a backend API. Ensure:

1. The backend server is running (default: `http://localhost:8000`)
2. CORS is properly configured on the backend to allow requests from the frontend origin
3. See `CORS_SETUP.md` for additional CORS configuration details related to Google Cloud Storage

## Technologies

- **Vue 3** - Progressive JavaScript framework
- **TypeScript** - Typed JavaScript
- **Vite** - Next-generation frontend build tool
- **Vue Router** - Official router for Vue.js
- **Pinia** - State management for Vue
- **Axios** - HTTP client for API requests
- **TipTap** - Rich text editor framework
- **vis-network** - Network visualization library
- **Vitest** - Unit testing framework

## Customize Configuration

See [Vite Configuration Reference](https://vite.dev/config/) for advanced configuration options.

## User journey

One can find the user journey in [this video](https://youtu.be/fE-O7kc64bk)
