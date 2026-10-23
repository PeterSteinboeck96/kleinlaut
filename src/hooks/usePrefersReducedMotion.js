import { useSyncExternalStore } from 'react'

const preference = window.matchMedia('(prefers-reduced-motion: reduce)')
const getSnapshot = () => preference.matches
function subscribe(callback) {
  preference.addEventListener('change', callback)
  return () => preference.removeEventListener('change', callback)
}

export default function usePrefersReducedMotion() {
  return useSyncExternalStore(subscribe, getSnapshot)
}
