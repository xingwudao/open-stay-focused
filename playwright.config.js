import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'tests/browser',timeout:45000,workers:1,reporter:'list',use:{trace:'retain-on-failure'},webServer:{command:'node tests/server.mjs',port:4173,reuseExistingServer:false}});
