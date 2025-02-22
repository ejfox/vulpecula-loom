export interface StoreSchema {
  "api-key": string;
  theme: "light" | "dark";
  "show-progress-bar": boolean;
  "show-only-pinned-models": boolean;
  "pinned-models": string[];
  "enabled-model-ids": string[];
  "recent-model-ids": string[];
  "remember-window-state": boolean;
  "minimize-to-tray": boolean;
  "show-notifications": boolean;
  "play-sounds": boolean;
  "show-badge-count": boolean;
  "obsidian-vault-path": string;
  enabledModelIds: string[];
  recentModelIds: string[];
  "preferred-vision-model": string | null;
  uiState: {
    chatSidebarOpen: boolean;
  };
}

export interface ObsidianFile {
  title: string;
  path: string;
  content: string;
  lastModified: number;
  preview?: string;
  slug: string;
}

export interface ObsidianSearchOptions {
  path: string;
  searchTerm: string;
}

export interface OpenRouterModel {
  id: string;
  name?: string;
  description?: string;
  context_length: number;
  pricing?: {
    prompt: string;
    completion: string;
  };
  capabilities?: {
    vision?: boolean;
    tools?: boolean;
    function_calling?: boolean;
  };
  provider?: string;
}
