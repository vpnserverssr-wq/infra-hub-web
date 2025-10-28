<script lang="ts" setup>
import { usePlatform } from "./utils/hook";
import { ref } from "vue";

defineOptions({
  name: "VirtCenterPlatform" // 必须定义，用于菜单自动匹配组件
});

const tableRef = ref();
const {
  api,
  auth,
  addOrEditOptions,
  listColumnsFormat,
  operationButtonsProps
} = usePlatform(tableRef);
</script>

<template>
  <RePlusPage
    ref="tableRef"
    :api="api"
    :auth="auth"
    :add-or-edit-options="addOrEditOptions"
    :list-columns-format="listColumnsFormat"
    :operationButtonsProps="operationButtonsProps"
  />
</template>
