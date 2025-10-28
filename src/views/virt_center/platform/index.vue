<script lang="ts" setup>
import { usePlatform } from "./utils/hook";
import { ref } from "vue";
import { CredentialDialog } from "./components";

defineOptions({
  name: "VirtCenterPlatform" // 必须定义，用于菜单自动匹配组件
});

const tableRef = ref();
const {
  api,
  auth,
  addOrEditOptions,
  listColumnsFormat,
  operationButtonsProps,
  credentialDialogRef,
  currentPlatform
} = usePlatform(tableRef);

// 凭据保存成功后刷新表格
const handleCredentialSuccess = () => {
  tableRef.value?.handleGetData();
};
</script>

<template>
  <div>
    <RePlusPage
      ref="tableRef"
      :api="api"
      :auth="auth"
      :add-or-edit-options="addOrEditOptions"
      :list-columns-format="listColumnsFormat"
      :operationButtonsProps="operationButtonsProps"
    />

    <!-- 凭据管理对话框 -->
    <CredentialDialog
      ref="credentialDialogRef"
      :platform-id="currentPlatform.id"
      :platform-name="currentPlatform.name"
      @success="handleCredentialSuccess"
    />
  </div>
</template>
