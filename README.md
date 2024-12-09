# Vulpecula Loom - AI Chat with Obsidian Integration

<img width="1428" alt="Screenshot 2024-11-18 at 12 41 15 AM" src="https://github.com/user-attachments/assets/d2d0cec6-872f-4384-82a1-af21b8672ee6">


Vulpecula Loom is a desktop application that combines the power of modern AI language models with seamless Obsidian vault integration. Built with Electron, Vue 3, and TypeScript, it offers a polished and efficient interface for AI-assisted writing and research.

## Features

### AI Chat
- Support for multiple AI models through OpenRouter
  - Claude 3 (Opus & Sonnet)
  - GPT-4
  - GPT-3.5 Turbo
- Real-time token counting and cost tracking
- Markdown rendering with syntax highlighting
- Chat history with persistent storage
- Export conversations to Markdown

### Obsidian Integration
- Direct linking to Obsidian vault files
- Quick file search with `@` mentions
- File preview in search results
- Automatic cache management for fast searches
- Real-time vault file monitoring

### User Interface
- Dark/Light mode support
- Native system integration
- Custom titlebar with gradient animation
- Responsive design with smooth transitions
- Keyboard shortcuts for common actions

## Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn
- An OpenRouter API key
- Obsidian vault (optional)

### Building the Application

#### For macOS

1. `git clone https://github.com/yourusername/vulpecula-loom.git`
2. `cd vulpecula-loom`
3. `yarn install`
4. `yarn build`

The built application will be available in the `release/{version}/` directory:
- `electron-vue-vite.app` - The macOS application bundle
- `electron-vue-vite-{version}-arm64.dmg` - The disk image installer for Apple Silicon
- `electron-vue-vite-{version}-x64.dmg` - The disk image installer for Intel Macs

Note: To build a signed application for distribution, you'll need an Apple Developer account and appropriate certificates. See [Apple's documentation](https://developer.apple.com/documentation/xcode/notarizing_macos_software_before_distribution) for more details on app notarization.
