/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_USE_LOCAL_BACKEND?: string
  readonly VITE_SEMANTIC_SEARCH_API?: string
  readonly VITE_HOTJAR_SITE_ID?: string
  readonly VITE_HOTJAR_VERSION?: string
  readonly NEXT_PUBLIC_MIXPANEL_TOKEN?: string
  readonly VITE_ATLAS_API_ENDPOINT?: string
  readonly VITE_ATLAS_TOKEN?: string
}
