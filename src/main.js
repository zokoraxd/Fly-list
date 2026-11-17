import { createApp } from 'vue';
// Self-hosted fonts: Latin and Arabic subsets only, so the page makes no font requests to third parties.
import '@fontsource/ibm-plex-sans/latin-400.css';
import '@fontsource/ibm-plex-sans/latin-500.css';
import '@fontsource/ibm-plex-sans/latin-600.css';
import '@fontsource/ibm-plex-sans-arabic/arabic-400.css';
import '@fontsource/ibm-plex-sans-arabic/arabic-500.css';
import '@fontsource/ibm-plex-sans-arabic/arabic-600.css';
import './style.css';
import App from './App.vue';

createApp(App).mount('#app');
