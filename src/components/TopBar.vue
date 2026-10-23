<template>
  <router-link :to="menuTarget" :aria-label="label" class="block">
    <header :class="barClass">
      <span class="inline-flex items-center justify-center">
        {{ label }}
      </span>
    </header>
  </router-link>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const props = defineProps({
  label: {
    type: String,
    default: 'MENU!',
  },
})

const route = useRoute()
const isFixed = computed(() => route.path === '/fotos' || route.path === '/')

const barClass = computed(() => {
  const positionClass = isFixed.value
    ? 'fixed top-0 left-0 right-0'
    : 'sticky top-0'
  return `${positionClass} z-50 bg-accent py-3 text-center font-display text-base text-black`
})
const menuTarget = computed(() => (route.path === '/menu' ? '/' : '/menu'))
</script>
