<template>
  <ClientIcon :name="iconifyName" v-bind="$attrs" />
</template>
<script setup lang="ts">
const props = defineProps<{
    name: string;
    size: string;
}>();
const iconifyName = computed(() => {
  if (props.size === "solid") {
    return `heroicons:${props.name}-solid`;
  }
  if (props.size === "mini") {
    return `heroicons:${props.name}-20-solid`;
  }
  // default to outline
  return `heroicons:${props.name}`;
});
</script>
