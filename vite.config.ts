import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    host: true, // im LAN erreichbar fuer QR-Sideload auf die Brille
  },
  build: {
    target: 'esnext',
  },
})
