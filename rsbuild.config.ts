import { defineConfig, loadEnv } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';
import { pluginSass } from '@rsbuild/plugin-sass';

const path = require('path');

// Load any VITE_*-prefixed values from .env files. On Replit / Vercel /
// Cloudflare those values come from the platform's env panel instead and
// are read straight from process.env below.
const { publicVars: envFilePublicVars } = loadEnv({ prefixes: ['VITE_'] });

const VITE_KEYS = ['VITE_APP_ID', 'VITE_REDIRECT_URI', 'VITE_OAUTH_URL'] as const;

const envFromProcess: Record<string, string> = {};
for (const key of VITE_KEYS) {
    const value = process.env[key];
    if (typeof value === 'string' && value.length > 0) {
        envFromProcess[`process.env.${key}`] = JSON.stringify(value);
        envFromProcess[`import.meta.env.${key}`] = JSON.stringify(value);
    }
}

export default defineConfig({
    plugins: [
        pluginSass({
            sassLoaderOptions: {
                sourceMap: true,
                sassOptions: {
                    // includePaths: [path.resolve(__dirname, 'src')],
                },
                // additionalData: `@use "${path.resolve(__dirname, 'src/components/shared/styles')}" as *;`,
            },
            exclude: /node_modules/,
        }),
        pluginReact(),
    ],
    source: {
        entry: {
            index: './src/main.tsx',
        },
        define: {
            ...envFilePublicVars,
            'process.env': {
                TRANSLATIONS_CDN_URL: JSON.stringify(process.env.TRANSLATIONS_CDN_URL),
                R2_PROJECT_NAME: JSON.stringify(process.env.R2_PROJECT_NAME),
                CROWDIN_BRANCH_NAME: JSON.stringify(process.env.CROWDIN_BRANCH_NAME),
                TRACKJS_TOKEN: JSON.stringify(process.env.TRACKJS_TOKEN),
                APP_ENV: JSON.stringify(process.env.APP_ENV),
                REF_NAME: JSON.stringify(process.env.REF_NAME),
                REMOTE_CONFIG_URL: JSON.stringify(process.env.REMOTE_CONFIG_URL),
                GD_CLIENT_ID: JSON.stringify(process.env.GD_CLIENT_ID),
                GD_APP_ID: JSON.stringify(process.env.GD_APP_ID),
                GD_API_KEY: JSON.stringify(process.env.GD_API_KEY),
                DATADOG_SESSION_REPLAY_SAMPLE_RATE: JSON.stringify(process.env.DATADOG_SESSION_REPLAY_SAMPLE_RATE),
                DATADOG_SESSION_SAMPLE_RATE: JSON.stringify(process.env.DATADOG_SESSION_SAMPLE_RATE),
                DATADOG_APPLICATION_ID: JSON.stringify(process.env.DATADOG_APPLICATION_ID),
                DATADOG_CLIENT_TOKEN: JSON.stringify(process.env.DATADOG_CLIENT_TOKEN),
                RUDDERSTACK_KEY: JSON.stringify(process.env.RUDDERSTACK_KEY),
                GROWTHBOOK_CLIENT_KEY: JSON.stringify(process.env.GROWTHBOOK_CLIENT_KEY),
                GROWTHBOOK_DECRYPTION_KEY: JSON.stringify(process.env.GROWTHBOOK_DECRYPTION_KEY),
                // Env-driven Deriv OAuth config (no hardcoded URLs).
                VITE_APP_ID: JSON.stringify(process.env.VITE_APP_ID),
                VITE_REDIRECT_URI: JSON.stringify(process.env.VITE_REDIRECT_URI),
                VITE_OAUTH_URL: JSON.stringify(process.env.VITE_OAUTH_URL),
            },
        },
        alias: {
            react: path.resolve('./node_modules/react'),
            'react-dom': path.resolve('./node_modules/react-dom'),
            '@/external': path.resolve(__dirname, './src/external'),
            '@/components': path.resolve(__dirname, './src/components'),
            '@/hooks': path.resolve(__dirname, './src/hooks'),
            '@/utils': path.resolve(__dirname, './src/utils'),
            '@/constants': path.resolve(__dirname, './src/constants'),
            '@/stores': path.resolve(__dirname, './src/stores'),
        },
    },
    output: {
        copy: [
            {
                from: 'node_modules/@deriv/deriv-charts/dist/*',
                to: 'js/smartcharts/[name][ext]',
                globOptions: {
                    ignore: ['**/*.LICENSE.txt'],
                },
            },
            { from: 'node_modules/@deriv/deriv-charts/dist/chart/assets/*', to: 'assets/[name][ext]' },
            { from: 'node_modules/@deriv/deriv-charts/dist/chart/assets/fonts/*', to: 'assets/fonts/[name][ext]' },
            { from: 'node_modules/@deriv/deriv-charts/dist/chart/assets/shaders/*', to: 'assets/shaders/[name][ext]' },
            { from: path.join(__dirname, 'public') },
        ],
        // Ensure service worker is not cached by the browser
        filename: {
            js: ({ chunk }) => {
                // Don't add hash to service worker
                if (chunk?.name === 'sw') {
                    return '[name].js';
                }
                return '[name].[contenthash:8].js';
            },
        },
    },
    html: {
        template: './index.html',
    },
    server: {
        port: 5000,
        host: '0.0.0.0',
        compress: true,
        headers: {
            'Cross-Origin-Opener-Policy': 'unsafe-none',
            'Cross-Origin-Embedder-Policy': 'unsafe-none',
            'Cache-Control': 'no-cache',
        },
    },
    dev: {
        hmr: true,
    },
    tools: {
        rspack: {
            plugins: [],
            resolve: {},
            module: {
                rules: [
                    {
                        test: /\.xml$/,
                        exclude: /node_modules/,
                        use: 'raw-loader',
                    },
                ],
            },
        },
    },
});
