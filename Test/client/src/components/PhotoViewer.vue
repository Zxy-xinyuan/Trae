<template>
  <div class="photo-viewer">
    <a-image
      v-for="(photo, index) in photos"
      :key="index"
      :src="photo"
      :width="120"
      :height="120"
      style="object-fit: cover; border-radius: 4px; margin-right: 8px; margin-bottom: 8px; cursor: pointer"
    />
    <a-empty v-if="!photos.length" description="暂无照片" />
  </div>
</template>

<script setup>
defineProps({
  photos: { type: Array, default: () => [] }
})
</script>
