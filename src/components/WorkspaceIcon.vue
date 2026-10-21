<script setup lang="ts">
withDefaults(defineProps<{ name: string; size?: number }>(), { size: 20 })
const paths: Record<string, string> = {
  plus: 'M12 5v14M5 12h14', search: 'M21 21l-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0',
  arrow: 'M5 12h14m-6-6 6 6-6 6', send: 'M12 19V5m-6 6 6-6 6 6',
  file: 'M14 2H5v20h14V7l-5-5Zm0 0v6h5M8 12h8m-8 4h6',
  book: 'M12 5c-3-2-6-2-10-1v15c4-1 7-1 10 1m0-15c3-2 6-2 10-1v15c-4-1-7-1-10 1V5Z',
  close: 'm6 6 12 12M6 18 18 6', menu: 'M4 6h16M4 12h16M4 18h16',
  chat: 'M4 3h16v14H9l-5 4V3Z', trash: 'M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7',
  logout: 'M9 3H3v18h6m5-15 6 6-6 6M8 12h12', check: 'm5 12 4 4L19 6',
  help: 'M9 9a3 3 0 1 1 5 2c-2 1-2 2-2 3m0 3v.1M22 12A10 10 0 1 1 2 12a10 10 0 0 1 20 0',
  compare: 'M6 3v18M3 6l3-3 3 3m9 15V3m-3 15 3 3 3-3M10 9h4m-4 6h4',
  clock: 'M12 6v6l4 2M22 12A10 10 0 1 1 2 12a10 10 0 0 1 20 0', chevron: 'm9 5 7 7-7 7',
}
</script>
<template>
  <svg :width="size" :height="size" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path :d="paths[name] ?? paths.file" /></svg>
</template>
