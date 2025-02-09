# Notelets

<div align="center">

A modern note-taking application with integrated AI chat capabilities, built with React and TypeScript.

![Dark Mode Support](https://img.shields.io/badge/dark%20mode-supported-dark?style=flat-square)
![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue?style=flat-square)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-Styled-38B2AC?style=flat-square)

</div>

## Features

### 📝 Rich Text Editing
- Full-featured Markdown editor with real-time preview
- Support for headings, bold, italic, and links
- Bubble menu for quick formatting
- Copy content as Markdown or formatted text
- Dark mode support

### 🤖 AI Chat Integration
- Chat with AI models about your notes
- Multiple view modes:
  - Notes only
  - Chat only
  - Split view
- Support for multiple AI models
- Contextual understanding of your notes
- Message editing capabilities

### 📋 Board Management
- Organize notes into boards
- Tab-based interface for multiple boards
- Flexible viewing options:
  - Single note view
  - Multi-note view
  - Split view with chat
- Persistent layout settings

### 💫 Modern UI/UX
- Clean, intuitive interface
- Dark mode support
- Responsive design
- Customizable layouts
- Smooth transitions and animations

## Getting Started

### Prerequisites
- Node.js (v16 or higher)
- pnpm package manager

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/notelets.git
cd notelets
```

2. Install dependencies:
```bash
pnpm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```
Edit `.env` with your API keys and configuration.

4. Start the development server:
```bash
pnpm dev
```

## Technology Stack

- **Frontend Framework**: React with TypeScript
- **Styling**: TailwindCSS
- **Rich Text Editing**: TipTap
- **State Management**: Custom store implementation
- **AI Integration**: Multiple LLM provider support
- **Authentication**: Firebase Authentication
- **Database**: Firestore

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details. 

