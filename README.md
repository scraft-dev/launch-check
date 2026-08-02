# Launch Check

Launch Check is a Next.js application built with the App Router, strict TypeScript, Tailwind CSS, ESLint, and Prettier.

## Requirements

- Node.js 20.9 or later
- npm

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy the example environment file:

   ```bash
   cp .env.example .env.local
   ```

   No environment variables are required yet.

3. Start the development server:

   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000).

## Available scripts

- `npm run dev` starts the development server.
- `npm run build` creates a production build.
- `npm run start` starts the production server after a build.
- `npm run lint` runs ESLint.
- `npm run format` formats supported files with Prettier.
- `npm run format:check` checks formatting without changing files.

## Project structure

- `src/app` contains App Router routes and layouts.
- `components` contains reusable UI components.
- `lib` contains application libraries and service wrappers.
- `types` contains shared TypeScript types.
- `utils` contains shared utility functions.
