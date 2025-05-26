# KataOmi 片重い（片假不留）


![](https://img.shields.io/badge/React-61DAFB?style=flat-square&logo=react&logoColor=black)
![](https://img.shields.io/badge/Typescript-3178C6?style=flat-square&logo=typescript&logoColor=white)
![](https://badges.aleen42.com/src/vitejs.svg)


> [!NOTE]
> This project is inspired by [Katakana Terminator](https://github.com/Arnie97/katakana-terminator) and built using [Chrome Extension Boilerplate React Vite](https://github.com/Jonghakseo/chrome-extension-boilerplate-react-vite).

## Table of Contents

- [Intro](#intro)
- [Features](#features)
- [Roadmap](#roadmap)
- [Getting Started](#getting-started)
    - [Chrome](#getting-started-chrome)
    - [Firefox](#getting-started-firefox)
- [Install Dependency](#install-dependency)
    - [For Root](#install-dependency-for-root)
    - [For Module](#install-dependency-for-module)
- [Environment Variables](#env-variables)
- [Community](#community)
- [Reference](#reference)

## Intro

**KataOmi** is a Chrome/Firefox extension designed to assist users in translating Katakana text using advanced AI models. This tool seamlessly integrates into your browsing experience, providing real-time translations for Japanese Katakana characters found on web pages.

Built with React and TypeScript, and powered by Vite for fast development and build times, this extension offers a modern approach to language translation directly in your browser.

## Features

- **AI-Powered Translation**: Utilizes state-of-the-art AI models to accurately translate Katakana text in real-time.
- **Local Caching**: Stores up to the last 10,000 translation entries locally, ensuring quick access to frequently encountered terms without repeated processing.
- **User-Friendly Interface**: Simple and intuitive UI integrated into web pages for effortless interaction.
- **Cross-Browser Support**: Compatible with both Chrome and Firefox browsers.

## Roadmap

We are committed to enhancing the functionality of Katakana Translator. Future updates will include:

- **Website Whitelist**: Allow users to specify which websites the extension should activate on, providing more control over its operation.
- **Word Whitelist**: Enable users to define specific words or phrases to be excluded or prioritized during translation.
- **Import/Export CSV**: Enable users to import and export translation data in CSV format, facilitating data backup and transfer.

## Getting Started

1. Ensure your Node.js version matches or exceeds the version specified in the `.nvmrc` file. We recommend using [nvm](https://github.com/nvm-sh/nvm?tab=readme-ov-file#intro) for version management.
2. Clone this repository: `git clone <repository-url>`
3. Install pnpm globally: `npm install -g pnpm` (ensure Node.js version >= 22.12.0)
4. Run `pnpm install` to set up dependencies.

Then, depending on the target browser:

### For Chrome: <a name="getting-started-chrome"></a>

1. Run:
    - Dev: `pnpm dev` (on Windows, run as administrator)
    - Prod: `pnpm build`
2. Open in browser - `chrome://extensions`
3. Check - <kbd>Developer mode</kbd>
4. Click - <kbd>Load unpacked</kbd> in the upper left corner
5. Select the `dist` directory from the project folder

### For Firefox: <a name="getting-started-firefox"></a>

1. Run:
    - Dev: `pnpm dev:firefox`
    - Prod: `pnpm build:firefox`
2. Open in browser - `about:debugging#/runtime/this-firefox`
3. Click - <kbd>Load Temporary Add-on...</kbd> in the upper right corner
4. Select the `./dist/manifest.json` file from the project folder

> [!NOTE]
> In Firefox, add-ons are loaded in temporary mode, meaning they disappear after each browser restart. You must reload the add-on on every browser launch.

## Install Dependency for Turborepo: <a name="install-dependency"></a>

### For Root: <a name="install-dependency-for-root"></a>

1. Run `pnpm i <package> -w`

### For Module: <a name="install-dependency-for-module"></a>

1. Run `pnpm i <package> -F <module name>`

`package` - Name of the package you want to install, e.g., `nodemon` \
`module-name` - Found inside each `package.json` under the key `name`, e.g., `@extension/content-script`. You can use only `content-script` without the `@extension/` prefix.

## Environment Variables <a name="env-variables"></a>

Read: [Env Documentation](packages/env/README.md)

## Reference

- [Chrome Extensions](https://developer.chrome.com/docs/extensions)
- [Vite Plugin](https://vitejs.dev/guide/api-plugin.html)
- [Rollup](https://rollupjs.org/guide/en/)
- [Turborepo](https://turbo.build/repo/docs)
- [Rollup-plugin-chrome-extension](https://www.extend-chrome.dev/rollup-plugin)

---

Made with inspiration from [Katakana Terminator](https://github.com/Arnie97/katakana-terminator) and based on [Chrome Extension Boilerplate React Vite](https://github.com/Jonghakseo/chrome-extension-boilerplate-react-vite).
