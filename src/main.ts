import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { vReveal } from './directives/reveal'

// Self-hosted: four weights, no render-blocking round trip to Google, and
// the same family draws Arabic and Latin — times and amounts sit on one
// baseline instead of borrowing a fallback for the digits.
import '@fontsource/ibm-plex-sans-arabic/arabic-400.css'
import '@fontsource/ibm-plex-sans-arabic/arabic-500.css'
import '@fontsource/ibm-plex-sans-arabic/arabic-600.css'
import '@fontsource/ibm-plex-sans-arabic/arabic-700.css'
import '@fontsource/ibm-plex-sans-arabic/latin-400.css'
import '@fontsource/ibm-plex-sans-arabic/latin-500.css'
import '@fontsource/ibm-plex-sans-arabic/latin-600.css'
import '@fontsource/ibm-plex-sans-arabic/latin-700.css'

import './assets/main.css'

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.directive('reveal', vReveal)

app.mount('#app')
