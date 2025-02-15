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

Share your knowledge with AI by referencing your notes. Simply type `@` in any message to seamlessly include content from your Obsidian vault:

1. **Quick Note References**
   ```
   Hey AI, can you help me understand @quantum-computing-basics? 
   Also, how does it relate to @quantum-entanglement?
   ```
   - Type `@` anywhere in your message
   - Search your vault in real-time
   - Select files from the popup
   - Multiple files can be referenced in one message

2. **How It Works**
   - When you include a note with `@`, the entire note's content is sent to the AI
   - The AI can then reference and analyze your notes
   - Example:
     ```
     User: Can you compare the concepts in @classical-computing with @quantum-computing?
     Assistant: Looking at your notes, I can see several key differences...
     [Assistant can now reference the full content of both notes]
     ```

3. **File Search Features**
   - Real-time search as you type after `@`
   - Instant results (debounced 150ms)
   - Shows file previews
   - Matches titles and content
   - Keyboard navigation (↑↓ to select, Enter to choose)
   - Results sorted by relevance:
     1. Title matches
     2. Content matches
     3. Recently modified

4. **Technical Implementation**
   - Files included via `includedFiles` array in messages
   - Each included file contains:
     ```typescript
     {
       title: string;      // File title
       path: string;       // Full path to file
       content: string;    // Complete file content
     }
     ```
   - Content is cached for performance
   - Files monitored for changes
   - Vault path stored securely

5. **Security & Performance**
   - Files only accessible within your vault
   - Content sanitized before display
   - No external file access
   - Efficient caching system
   - Background indexing
   - Incremental updates

1. **File Inclusion**
   - Files can be included in messages using `@` mentions
   - When a file is included, its entire content is added to the message
   - Included files are tracked in the message's `includedFiles` array
   - Each included file contains:
     ```typescript
     {
       title: string;      // File title
       path: string;       // Full path to file
       content: string;    // Complete file content
     }
     ```

2. **File Search**
   - Real-time search as you type `@`
   - Debounced queries (150ms)
   - Results limited to 10 files
   - Results sorted by relevance
   - Cache management for performance

3. **Security**
   - Files are only accessible within the vault
   - Content is sanitized before display
   - No external file access allowed
   - Vault path stored securely in electron-store

4. **Performance**
   - File content cached in memory
   - Incremental search updates
   - Debounced search queries
   - Background file indexing

### User Interface
- Dark/Light mode support
- Native system integration
- Custom titlebar with gradient animation
- Responsive design with smooth transitions
- Keyboard shortcuts for common actions

### IPC Communication

All inter-process communication (IPC) is centralized in `electron/ipc/` with the following structure:

```
electron/ipc/
├── index.ts          # Central IPC setup and system-level handlers
├── obsidian.ts       # Obsidian integration handlers
└── store.ts          # Electron store handlers
```

#### Type-Safe IPC Communication

All IPC channels are fully typed using TypeScript interfaces in `src/types.ts` under the `IpcChannels` interface. 
This centralized type system provides:
- Auto-completion for channel names
- Parameter type checking
- Return type inference
- Compile-time validation
- Single source of truth for all IPC types

Example:
```typescript
// In src/types.ts
export interface IpcChannels {
  "open-external": (url: string) => Promise<void>;
  "store-get": <K extends keyof StoreSchema>(key: K) => Promise<StoreSchema[K]>;
  // ... more channel definitions
}
```

#### Adding New IPC Handlers

1. Add the type definition to `src/types.ts` under the `IpcChannels` interface
2. Create a new handler in the appropriate domain file in `electron/ipc/`
3. Register the handler in `electron/ipc/index.ts`
4. Update this documentation

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

## TypeScript Conventions

### The Central Type System

ALL types MUST live in `src/types.ts`. This is not just a convention - it's a requirement.

#### Why Centralization?
- Single source of truth
- No duplicate definitions
- Clear type hierarchies
- Easy to find and modify
- Better TypeScript tooling support
- Prevents circular dependencies
- Maintains type consistency

#### Type Categories
- OpenRouter Types (API models, responses)
- Chat Types (messages, history)
- Store Types (electron store schema)
- Electron IPC Types (channel definitions)
- UI Types (preferences, settings)
- Animation Types (configuration)

#### The Rules of Type Centralization

1. ALL types MUST be in `src/types.ts`
2. NO `.d.ts` files allowed (except for third-party type declarations)
3. NO interface/type definitions in component files
4. NO scattered type definitions across the codebase
5. ALL types MUST be properly categorized and documented
6. ALL types MUST be exported

❌ ILLEGAL:
- Types in component files
- Scattered `.d.ts` files
- Duplicate type definitions
- Undocumented types
- Types without proper categorization

✅ LEGAL:
- All types in `src/types.ts`
- Clear type categorization
- Proper exports
- Well-documented types
- Single source of truth

### Type Safety vs Pragmatism
While we maintain strict type centralization, we allow `any` or more permissive types when:
- Dealing with third-party libraries
- Prototyping features
- Handling complex DOM elements
- Working with dynamic data

Remember: Type centralization is about organization, not restriction.

## Architecture

### Composables

The application uses a layered composable architecture:

- `useAIChat` - The main chat composable that handles all chat functionality. This is the primary interface that components should use for chat operations. It provides:
  - Message handling
  - Token tracking
  - Cost calculation
  - Chat persistence
  - Streaming responses
  - History management

- `useOpenRouter` - Low-level OpenRouter API integration. **Should not be used directly by components**. Instead, use `useAIChat` which provides a higher-level interface and proper state management.

- `useSupabase` - Handles chat persistence and history management
- `useObsidianFiles` - Manages Obsidian vault integration
- `useTheme` - Handles theme switching and persistence

## ⚠️ Important Implementation Notes

### Chat Implementation

**ALWAYS use `useAIChat.ts` for chat functionality!** 

The chat system is designed around the `useAIChat` composable, which handles:
- Message sending and receiving
- Chat history management
- Token tracking
- Cost calculation
- Model selection
- Temperature settings
- Chat statistics

❌ **DO NOT** try to implement chat functionality by directly using `useOpenRouter` or other lower-level composables. This will:
- Break the chat history system
- Cause message tracking issues
- Prevent proper token/cost tracking
- Summon dragons that will devour everyone

`useOpenRouter` should only be used for:
- API key management
- Model availability checking
- Model information

## Electron Store Setup

The application uses `electron-store` for persistent storage. The store is exposed to the renderer process through a secure preload script.

### Store Organization

1. **Store Schema**
   - All store keys are defined in `src/types.ts`
   - Keys follow a consistent naming pattern (e.g., `api-key`, `theme`)
   - Values are strongly typed

2. **Access Pattern**
   - Always use the `useStore` composable
   - Never access `window.electron.store` directly
   - All store operations are async

3. **Key Categories**
   - API Keys (`api-key`)
   - UI Preferences (`theme`, `show-progress-bar`)
   - Model Settings (`enabled-model-ids`, `pinned-models`)
   - Application State (`remember-window-state`)
   - Integration Settings (`obsidian-vault-path`)

4. **Best Practices**
   - Use typed keys from `StoreSchema`
   - Handle errors gracefully
   - Provide default values
   - Log store operations in development
   - Clear store data responsibly

## Architecture Decisions

### Type System

The application follows a strict type centralization pattern:

1. **Central Type Repository**
   - ALL types MUST live in `src/types.ts`
   - NO scattered `.d.ts` files (except for third-party declarations)
   - NO interface/type definitions in component files
   - ALL types MUST be properly categorized and documented

2. **Type Categories**
   - OpenRouter Types (API models, responses)
   - Chat Types (messages, history)
   - Store Types (electron store schema)
   - Electron IPC Types (channel definitions)
   - UI Types (preferences, settings)
   - Animation Types (configuration)
   - Obsidian Types (file handling, search)

3. **Naming Conventions**
   - Interface names are PascalCase and descriptive (e.g., `ObsidianFile`, `ChatMessage`)
   - Options/Config interfaces end with respective suffix (e.g., `ObsidianSearchOptions`, `AnimationConfig`)
   - Props interfaces end with `Props` (e.g., `ChatInputProps`)
   - Return type interfaces end with `Return` (e.g., `UseSupabaseReturn`)

### Composable Architecture

The application uses a layered composable architecture:

1. **Core Composables**
   - `useAIChat` - Primary chat interface
   - `useOpenRouter` - Low-level API integration
   - `useSupabase` - Chat persistence
   - `useObsidianFiles` - Vault integration
   - `useTheme` - Theme management

2. **Composable Rules**
   - Each composable has a single responsibility
   - Composables can depend on other composables
   - State management handled through Vue's reactivity system
   - Error handling at every layer
   - Type-safe return values

3. **Obsidian Integration**
   - `useObsidianFiles` manages all Obsidian interactions
   - File search with debounced queries
   - Cache management for performance
   - Type-safe IPC communication
   - Error handling and state management

### IPC Communication

1. **Channel Organization**
   - All channels defined in `IpcChannels` interface
   - Strongly typed parameters and return values
   - Channels grouped by domain:
     - Store operations (`store-get`, `store-set`)
     - File operations (`search-obsidian-files`, `get-obsidian-file-content`)
     - System operations (`open-external`)

2. **Security Model**
   - Context isolation enabled
   - Node integration disabled
   - Explicit channel allowlist
   - Type-safe preload script

3. **Error Handling**
   - All IPC calls wrapped in try/catch
   - Errors propagated to UI
   - Fallback values defined
   - Error states tracked in composables

### State Management

1. **Store Organization**
   - Electron store for persistent data
   - Vue refs for component state
   - Computed properties for derived state
   - Watchers for side effects

2. **Data Flow**
   - Props down, events up
   - State centralized in composables
   - IPC communication abstracted
   - Type-safe store operations

### File Structure

```
src/
├── components/        # Vue components
├── composables/       # Vue composables
├── electron/         # Electron main process
│   └── ipc/         # IPC handlers
├── lib/             # Shared utilities
└── types.ts         # Central type definitions
```

### Best Practices

1. **Type Safety**
   - Use TypeScript's strict mode
   - No `any` types unless absolutely necessary
   - Proper type imports from central `types.ts`
   - Type-safe IPC communication

2. **Error Handling**
   - Graceful degradation
   - User-friendly error messages
   - Proper error propagation
   - Error state management

3. **Performance**
   - Debounced search queries
   - File caching
   - Lazy loading where appropriate
   - Efficient IPC communication

4. **Code Style**
   - Clear naming conventions
   - Consistent file structure
   - Proper documentation
   - Single responsibility principle

## Authentication & Data Security

### Overview
The application uses Discord OAuth for authentication, managed through Supabase Auth. This ensures secure user authentication and data isolation.

### Setup Requirements

#### 1. Supabase Project Setup
1. Create a new project at supabase.com
2. Enable Discord OAuth provider:
   - Add Discord application credentials
   - Configure allowed callback URLs:
     ```
     http://localhost:5173/auth/callback  # Development
     https://your-domain.com/auth/callback  # Production
     ```
3. Configure RLS policies (see Database Schema section)
4. Copy project credentials for environment setup

#### 2. Environment Configuration
Create a `.env` file in the project root:
```env
# Supabase Configuration
VITE_SUPABASE_URL=your_project_url
VITE_SUPABASE_KEY=your_anon_key  # Public anon key, NOT service_role key

# Discord OAuth
VITE_DISCORD_CLIENT_ID=your_discord_client_id
```

### Database Schema

#### Table Structure
```sql
-- Enable RLS
alter table public.vulpeculachats enable row level security;

-- Create table
create table public.vulpeculachats (
  id uuid not null default gen_random_uuid(),
  title text null,
  messages jsonb not null default '[]'::jsonb,
  model text not null,
  metadata jsonb null default '{}'::jsonb,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  user_id uuid null,
  thread text null,
  constraint vulpeculachats_pkey primary key (id),
  constraint vulpeculachats_user_id_fkey foreign key (user_id) references auth.users (id)
) tablespace pg_default;

-- Create index for efficient chat history sorting
create index if not exists idx_vulpeculachats_updated_at 
  on public.vulpeculachats using btree (updated_at) 
  tablespace pg_default;
```

#### Row Level Security (RLS) Policies
```sql
-- Allow users to read their own chats and any anonymous chats
create policy "Users can read their own chats"
  on public.vulpeculachats for select
  using (
    auth.uid() = user_id 
    or user_id is null -- Allow reading chats with no user_id
  );

-- Allow users to create chats, either owned or anonymous
create policy "Users can create chats"
  on public.vulpeculachats for insert
  with check (
    auth.uid() = user_id 
    or user_id is null -- Allow creating chats with no user_id
  );

-- Allow users to update their own chats and anonymous chats
create policy "Users can update their own chats"
  on public.vulpeculachats for update
  using (
    auth.uid() = user_id 
    or user_id is null -- Allow updating chats with no user_id
  );

-- Allow users to delete their own chats and anonymous chats
create policy "Users can delete their own chats"
  on public.vulpeculachats for delete
  using (
    auth.uid() = user_id 
    or user_id is null -- Allow deleting chats with no user_id
  );
```

#### Table Fields
**vulpeculachats**: Stores all chat sessions
- `id`: UUID primary key, auto-generated
- `title`: Optional chat title
- `messages`: JSONB array of messages (defaults to empty array)
  ```typescript
  {
    id: string;
    role: "user" | "assistant" | "system";
    content: string;
    timestamp: string;
    model?: string;
    tokens?: {
      prompt: number;
      completion: number;
      total: number;
    };
    cost?: number;
    includedFiles?: Array<{
      path: string;
      content: string;
      type: string;
    }>;
  }[]
  ```
- `model`: AI model identifier (e.g., "anthropic/claude-3-opus-20240229")
- `metadata`: Optional JSONB object for additional data (defaults to empty object)
  ```typescript
  {
    lastModel?: string;
    lastUpdated?: string;
    messageCount?: number;
    summary?: string;
    autoTitle?: string;
    summaryLastUpdated?: string;
    stats?: {
      promptTokens: number;
      completionTokens: number;
      cost: number;
      totalMessages: number;
    };
  }
  ```
- `user_id`: Optional reference to auth.users (nullable for anonymous chats)
- `thread`: Optional text field for thread identification
- `created_at/updated_at`: Timestamps with timezone (auto-managed)

#### Security Features
- Row Level Security (RLS) enabled by default
- Index on updated_at for efficient chat history queries
- Full CRUD policies supporting:
  1. User-owned chats (where user_id = auth.uid())
  2. Anonymous chats (where user_id is null)
  3. Proper data isolation between users

#### Implementation Notes
- Anonymous chats (null user_id) are accessible to all users
- Each user can only access their own chats plus anonymous chats
- The updated_at index supports efficient chat history sorting
- JSONB fields (messages, metadata) support flexible schema evolution
- Timestamps are automatically managed by Postgres

### Authentication Flow
1. User visits app
2. `useActiveUser` composable checks auth state
3. If not authenticated:
   - Shows Discord login option
   - Handles OAuth redirect
   - Manages session storage
4. On successful auth:
   - Session established
   - User data loaded
   - Chat history retrieved