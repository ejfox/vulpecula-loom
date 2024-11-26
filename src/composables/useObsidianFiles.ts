import { ref, computed, watch } from 'vue'
import { useStore } from '../lib/store'
import { useDebounce } from '@vueuse/core'

export interface ObsidianFile {
  title: string
  path: string
  slug: string
  preview?: string
}

export function useObsidianFiles() {
  const store = useStore()
  const searchQuery = ref('')
  const debouncedQuery = useDebounce(searchQuery, 150)
  const isSearching = ref(false)
  const searchResults = ref<ObsidianFile[]>([])
  
  const vaultPath = computed(() => store.get('obsidian-vault-path'))
  const hasVault = computed(() => Boolean(vaultPath.value))

  async function searchFiles(query: string): Promise<ObsidianFile[]> {
    if (!hasVault.value || !query.trim()) {
      return []
    }
    
    try {
      isSearching.value = true
      
      // Only send the minimal required data
      const searchRequest = {
        path: vaultPath.value,
        searchTerm: query.trim()
      }

      // Ensure we're sending a plain object
      const results = await window.electron.ipcRenderer.invoke(
        'search-obsidian-files', 
        JSON.parse(JSON.stringify(searchRequest))
      )

      // Ensure we're getting back valid data
      if (Array.isArray(results)) {
        return results.map(result => ({
          title: String(result.title || ''),
          path: String(result.path || ''),
          slug: String(result.slug || ''),
          preview: result.preview ? String(result.preview) : undefined
        }))
      }
      
      return []
    } catch (err) {
      console.error('Failed to search Obsidian files:', err)
      return []
    } finally {
      isSearching.value = false
    }
  }

  // Watch for query changes
  watch(debouncedQuery, async (newQuery: string) => {
    if (newQuery) {
      searchResults.value = await searchFiles(newQuery)
    } else {
      searchResults.value = []
    }
  })

  return {
    searchQuery,
    searchResults,
    isSearching,
    hasVault,
    searchFiles
  }
}
