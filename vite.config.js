import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // '' loads unprefixed variables too. This one is a dev-server setting, so it
  // deliberately has no VITE_ prefix and never reaches client code.
  const env = loadEnv(mode, '.', '')

  // Set DEV_SERVER_POLL=true in .env.local if HMR does not react to your edits.
  // Some filesystems do not emit change events, so the watcher has to poll.
  const pollForChanges = env.DEV_SERVER_POLL === 'true'

  return {
    plugins: [react()],
    server: {
      port: 5173,
      strictPort: true,
      watch: pollForChanges ? { usePolling: true, interval: 300 } : undefined,
    },
  }
})
