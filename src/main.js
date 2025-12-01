import './assets/main.css'

import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import Vue3Toastify, { toast } from 'vue3-toastify';
import 'vue3-toastify/dist/index.css'
import { showErrorToast } from "@/lib/errorToast.js";

createApp(App).use(router).use(Vue3Toastify, {
    autoclose: 3000,
    position: "top-right",
    theme: "auto",
    hideProgressBar: false,
    newestOnTop: true,
}).mount('#app')

showErrorToast();

