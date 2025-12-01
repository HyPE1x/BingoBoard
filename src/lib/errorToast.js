import Vue3Toastify, { toast } from 'vue3-toastify'
import "vue3-toastify/dist/index.css";

export function showErrorToast() {
    const originalError = console.error;

    console.error = function (...args) {
        originalError.apply(console, args);

        const message = args.map(arg => (typeof arg === 'string' ? arg : JSON.stringify(arg))).join(' ');

        toast.error(message)
    }
}