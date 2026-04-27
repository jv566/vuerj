<script setup>
import { ref, onMounted, onUnmounted } from 'vue';

const styleList = ref({
  'transform': `scale(${window.innerWidth / 1920})`,
  'transform-origin': '0 0',
  'width': '1920px',
  'height': '960px'
})
onMounted(() => {
  window.addEventListener('resize', () => {
    styleList.value = {
      'transform': `scale(${window.innerWidth / 1920})`,
      'transform-origin': '0 0',
      'width': '1920px',
      'height': '960px'
    }
  })
})
onUnmounted(() => {
  window.removeEventListener('resize', () => {
    styleList.value = {
      'transform': `scale(${window.innerWidth / 1920})`,
      'transform-origin': '0 0',
      'width': '1920px',
      'height': '960px'
    }
  })
})
</script>

<template>
  <!-- 一级路由出口组件 -->
  <div :style="styleList">
    <RouterView />
  </div>
</template>

<style scoped lang="scss">

</style>
