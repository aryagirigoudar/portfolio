# Arya Girigoudar — portfolio

A static, accessible portfolio built with React, TypeScript and Vite. The photo comes first, the description lives below it, and the jokes occasionally arrive as GIFs.

## Development

Use Node 22.12+ or a supported newer LTS.

```bash
npm ci
npm run dev
```

## Checks

```bash
npx playwright install --with-deps chromium
npm test
npm run build
```

Tests run against a GitHub Pages subpath on desktop/mobile, including automated accessibility checks. `npm run check:publication` refuses draft preview data. Private source credentials and resume YAML must never be added here.

## Public data

The website fetches `data/projects.json` and `data/profile.json` asynchronously. Only generated, approved metadata and icons belong in `public/data/`; the public resume belongs in `public/resume/resume.pdf`. A separate private automation repository prepares an approved release in public `portfolio-jsons` through a reviewed `codex/portfolio-sync` PR. The website build imports its manifest, JSON, icons and PDF at a single immutable commit, checks every file hash, and copies the validated files into the static deployment. This frontend never contacts private GitHub APIs.

The included local preview was transcribed from an earlier portfolio. Verify all career information and replace the draft publication before hosting. No public deployment was performed during implementation.

## Hosting

Copy this directory's contents to the approved public repository root. After approving publication, enable Pages with GitHub Actions and set `PAGES_ENABLED=true` (deployment is disabled by default). Set `PAGES_BASE_PATH=/repository-name/` for a project site or `/` for an account site/custom domain. The Pages workflow tests/builds PRs, then deploys approved default-branch artifacts. The owner reviews and merges updates.

Edit `src/main.tsx` for tone and interactions, `src/style.css` for appearance. GIFs are only requested after a reaction is opened; reduced-motion users receive still frames and can explicitly play them. No backend is needed for contact links.

## Data connection

PORTFOLIO_DATA_REPOSITORY is configured as aryagirigoudar/portfolio-jsons. Production imports run through `npm run data:sync` during enabled default-branch builds; use only in disposable CI/build checkouts because success replaces public/data and public/resume. Browser requests stay same-origin and contain no private credentials. `npm run test:data` checks the downloader with mocked responses.

A six-hour scheduled website refresh picks up merged approved data, or a manual workflow can do so sooner. PAGES_ENABLED remains false, and the included resume remains draft. Missing/invalid production data fails the build and leaves the last deployment intact; it never silently deploys preview data.

Project-only releases are supported: the build retains the website-authored public biography, clears its resume URL and removes the PDF entirely. This permits project updates without publishing an unapproved draft resume. Full profile/PDF releases still require explicit approval.
