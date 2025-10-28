import { defineComponent, reactive, ref } from "vue";
import {
  ElAlert,
  ElButton,
  ElDialog,
  ElForm,
  ElFormItem,
  ElInput,
  ElRadio,
  ElRadioGroup
} from "element-plus";
import { message } from "@/utils/message";
import { platformApi } from "../utils/api";

export interface CredentialDialogProps {
  /** 平台 ID */
  platformId: string | number;
  /** 平台名称 */
  platformName?: string;
}

export interface CredentialDialogExpose {
  /** 打开对话框 */
  open: () => void;
  /** 关闭对话框 */
  close: () => void;
}

/**
 * 凭据管理对话框组件
 */
export default defineComponent({
  name: "CredentialDialog",
  props: {
    platformId: {
      type: [String, Number],
      default: ""
    },
    platformName: {
      type: String,
      default: ""
    }
  },
  emits: ["success", "close"],
  setup(props, { emit, expose }) {
    const visible = ref(false);
    const loading = ref(false);
    const hasExistingCredential = ref(false);

    const formData = reactive({
      auth_type: "password",
      username: "",
      password: "",
      token: ""
    });

    /**
     * 重置表单
     */
    const resetForm = () => {
      formData.auth_type = "password";
      formData.username = "";
      formData.password = "";
      formData.token = "";
      hasExistingCredential.value = false;
    };

    /**
     * 加载现有凭据
     */
    const loadCredential = async () => {
      if (!props.platformId) {
        console.error("platformId is required");
        return;
      }

      try {
        const res = await platformApi.getCredential(props.platformId);

        if (res.code === 1000 && res.data) {
          hasExistingCredential.value = true;
          formData.auth_type = res.data.auth_type || "password";
          formData.username = res.data.username || "";
          // 密码和 token 等机密信息不回显
        }
      } catch {
        // 凭据不存在，使用默认值
        hasExistingCredential.value = false;
      }
    };

    /**
     * 打开对话框
     */
    const open = async () => {
      resetForm();
      visible.value = true;

      // 延迟加载凭据，确保 platformId 已经更新
      await loadCredential();
    };

    /**
     * 关闭对话框
     */
    const close = () => {
      visible.value = false;
      resetForm();
      emit("close");
    };

    /**
     * 提交表单
     */
    const handleSubmit = async () => {
      // 验证必填项
      if (formData.auth_type === "password") {
        if (!formData.username) {
          message("请输入用户名", { type: "warning" });
          return;
        }
        // 新增时必须填写密码，编辑时可选
        if (!hasExistingCredential.value && !formData.password) {
          message("请输入密码", { type: "warning" });
          return;
        }
      } else {
        // 新增时必须填写 token，编辑时可选
        if (!hasExistingCredential.value && !formData.token) {
          message("请输入 API Token", { type: "warning" });
          return;
        }
      }

      loading.value = true;

      try {
        const submitData: any = {
          auth_type: formData.auth_type
        };

        if (formData.auth_type === "password") {
          submitData.username = formData.username;
          // 只有输入了密码才提交密码字段
          if (formData.password) {
            submitData.password = formData.password;
          }
        } else {
          // 只有输入了 token 才提交 token 字段
          if (formData.token) {
            submitData.token = formData.token;
          }
        }

        // 根据是否已有凭据选择创建或更新
        if (hasExistingCredential.value) {
          await platformApi.updateCredential(props.platformId, submitData);
        } else {
          await platformApi.createCredential(props.platformId, submitData);
        }

        message("凭据保存成功", { type: "success" });
        emit("success");
        close();
      } catch (error: any) {
        message(error.detail || "凭据保存失败", { type: "error" });
      } finally {
        loading.value = false;
      }
    };

    expose({
      open,
      close
    });

    return () => (
      <ElDialog
        v-model={visible.value}
        title={hasExistingCredential.value ? "编辑凭据" : "添加凭据"}
        width="500px"
        draggable
        closeOnClickModal={false}
        onClose={close}
        v-slots={{
          footer: () => (
            <div style="text-align: right">
              <ElButton onClick={close}>取消</ElButton>
              <ElButton
                type="primary"
                loading={loading.value}
                onClick={handleSubmit}
              >
                保存
              </ElButton>
            </div>
          )
        }}
      >
        {hasExistingCredential.value && (
          <ElAlert
            type="info"
            closable={false}
            style="margin-bottom: 20px"
            description="已有凭据，修改后将更新现有凭据。机密信息（密码/Token）不显示，如不修改请留空。"
          />
        )}

        <ElForm labelWidth="100px">
          <ElFormItem label="认证类型">
            <ElRadioGroup
              v-model={formData.auth_type}
              onChange={() => {
                // 切换认证类型时清空相关字段
                formData.password = "";
                formData.token = "";
              }}
            >
              <ElRadio value="password">用户名密码</ElRadio>
              <ElRadio value="token">API Token</ElRadio>
            </ElRadioGroup>
          </ElFormItem>

          {formData.auth_type === "password" ? (
            <>
              <ElFormItem label="用户名">
                <ElInput
                  v-model={formData.username}
                  placeholder="请输入用户名"
                  clearable
                />
              </ElFormItem>
              <ElFormItem label="密码">
                <ElInput
                  v-model={formData.password}
                  type="password"
                  placeholder={
                    hasExistingCredential.value
                      ? "留空则不修改密码"
                      : "请输入密码"
                  }
                  showPassword
                  clearable
                />
              </ElFormItem>
            </>
          ) : (
            <ElFormItem label="API Token">
              <ElInput
                v-model={formData.token}
                type="textarea"
                rows={4}
                placeholder={
                  hasExistingCredential.value
                    ? "留空则不修改 Token"
                    : "请输入 API Token"
                }
              />
            </ElFormItem>
          )}
        </ElForm>
      </ElDialog>
    );
  }
});
