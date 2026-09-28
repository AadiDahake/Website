<template>
  <Icon :icon="name" v-bind="$attrs" />
</template>
<script setup lang="ts">
import { Icon } from "@iconify/vue";
defineProps<{
    name: string;
}>();
</script>
