import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, type Plugin } from 'vite';

function stripCesIfDisabled(): Plugin {
  return {
    name: 'strip-ces-if-disabled',
    transformIndexHtml(html, ctx) {
      const enabled = !!ctx.server || !!process.env.VITE_CES_DEPLOYMENT_ID;
      if (enabled) return html;
      return html.replace(/<!--__CES_BLOCK_START__-->[\s\S]*?<!--__CES_BLOCK_END__-->/, '');
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), stripCesIfDisabled()],
  resolve: { alias: { '@': path.resolve(__dirname, '.') } },
  server: {
    proxy: { '/api': { target: 'http://localhost:8080', changeOrigin: true } },
    // Vite 5.4+ blocks requests whose Host header isn't on this list
    // (DNS-rebinding hardening). The leading "." matches all subdomains —
    // Cloud Shell preview URLs look like 3000-cs-<id>-default.cs-<region>.cloudshell.dev.
    allowedHosts: ['.cloudshell.dev', 'localhost'],
  },
});
