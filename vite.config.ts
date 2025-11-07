import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from "path"
import { componentTagger } from "lovable-tagger"

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  build: {
    target: 'es2022',
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Split node_modules into smaller chunks
          if (id.includes('node_modules')) {
            // React and React-DOM must be in the main bundle or loaded first
            // Don't split React - keep it in the main bundle to ensure it loads first
            if (id.includes('react') || id.includes('react-dom')) {
              return undefined; // Keep React in main bundle
            }
            if (id.includes('@radix-ui')) {
              return 'ui';
            }
            if (id.includes('@supabase')) {
              return 'supabase';
            }
            if (id.includes('lucide-react')) {
              return 'icons';
            }
            if (id.includes('date-fns') || id.includes('clsx') || id.includes('tailwind-merge')) {
              return 'utils';
            }
            return 'vendor-other';
          }
        }
      }
    },
    chunkSizeWarningLimit: 1000,
    sourcemap: false,
    minify: 'esbuild',
    cssCodeSplit: true,
    commonjsOptions: {
      include: [/node_modules/],
      transformMixedEsModules: true
    },
  },
  plugins: [
    react(),
    mode === 'development' && componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
    include: ['react', 'react-dom', '@supabase/supabase-js']
  },
}))