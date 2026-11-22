import {defineConfig} from 'vitest/config';
import react from '@vitejs/plugin-react';
export default defineConfig({plugins:[react()],base:'/warhammer-40k-reminders/',test:{environment:'jsdom',exclude:['tests/e2e/**','node_modules/**']}});
