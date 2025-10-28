import { platformApi } from "./api";
import { getCurrentInstance, h, reactive, type Ref, shallowRef } from "vue";
import { getDefaultAuths } from "@/router/utils";
import type {
  OperationProps,
  PageTableColumn,
  RePlusPageProps
} from "@/components/RePlusPage";
import { handleOperation } from "@/components/RePlusPage";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";
import {
  ElForm,
  ElFormItem,
  ElInput,
  ElMessageBox,
  ElRadio,
  ElRadioGroup,
  ElTag
} from "element-plus";
import Connection from "~icons/ep/connection";
import Refresh from "~icons/ep/refresh";
import Key from "~icons/ep/key";
import { message } from "@/utils/message";

export function usePlatform(tableRef: Ref) {
  const api = reactive(platformApi);
  const auth = reactive({
    testConnection: false,
    syncPlatform: false,
    manageCredential: false,
    ...getDefaultAuths(getCurrentInstance(), [
      "testConnection",
      "syncPlatform",
      "manageCredential"
    ])
  });

  // 简单的翻译函数，用于 handleOperation
  const t = (key: string) => {
    const translations: Record<string, string> = {
      "results.success": "操作成功",
      "results.failed": "操作失败"
    };
    return translations[key] || key;
  };

  /**
   * 测试连接
   */
  const handleTestConnection = (row: any, loading: { value: boolean }) => {
    loading.value = true;
    handleOperation({
      t,
      apiReq: api.testConnection(row?.pk ?? row?.id),
      success(data) {
        const info = data.data?.platform_info;
        let messageHtml = `<div style="text-align: left;">
          <p><strong>连接成功</strong></p>`;

        if (info) {
          messageHtml += `
            <p>版本: ${info.version || "-"}</p>
            <p>构建号: ${info.build || "-"}</p>
            <p>系统类型: ${info.osType || "-"}</p>
          `;
        }
        messageHtml += `</div>`;

        ElMessageBox.alert(messageHtml, "测试连接", {
          dangerouslyUseHTMLString: true,
          confirmButtonText: "确认"
        });
        tableRef.value.handleGetData();
      },
      requestEnd() {
        loading.value = false;
      }
    });
  };

  /**
   * 同步平台数据
   */
  const handleSyncPlatform = (row: any, loading: { value: boolean }) => {
    loading.value = true;
    handleOperation({
      t,
      apiReq: api.syncPlatform(row?.pk ?? row?.id),
      success(data) {
        message(data.detail || "同步任务已启动", { type: "success" });
        tableRef.value.handleGetData();
      },
      requestEnd() {
        loading.value = false;
      }
    });
  };

  /**
   * 管理凭据
   */
  const handleManageCredential = (row: any) => {
    const credentialForm = reactive({
      auth_type: "password",
      username: "",
      password: "",
      token: ""
    });

    // 先获取现有凭据
    api.getCredential(row?.pk ?? row?.id).then(res => {
      if (res.code === 2000 && res.data) {
        credentialForm.auth_type = res.data.auth_type || "password";
        credentialForm.username = res.data.username || "";
      }
    });

    ElMessageBox({
      title: "管理凭据",
      message: h("div", { style: "padding: 20px 0;" }, [
        h(ElForm, { labelWidth: "100px" }, [
          h(
            ElFormItem,
            { label: "认证类型" },
            h(
              ElRadioGroup,
              {
                modelValue: credentialForm.auth_type,
                "onUpdate:modelValue": (val: string) => {
                  credentialForm.auth_type = val;
                }
              },
              [
                h(ElRadio, { label: "password" }, () => "用户名密码"),
                h(ElRadio, { label: "token" }, () => "API Token")
              ]
            )
          ),
          credentialForm.auth_type === "password"
            ? [
                h(
                  ElFormItem,
                  { label: "用户名" },
                  h(ElInput, {
                    modelValue: credentialForm.username,
                    "onUpdate:modelValue": (val: string) => {
                      credentialForm.username = val;
                    },
                    placeholder: "请输入用户名"
                  })
                ),
                h(
                  ElFormItem,
                  { label: "密码" },
                  h(ElInput, {
                    type: "password",
                    modelValue: credentialForm.password,
                    "onUpdate:modelValue": (val: string) => {
                      credentialForm.password = val;
                    },
                    placeholder: "请输入密码",
                    showPassword: true
                  })
                )
              ]
            : h(
                ElFormItem,
                { label: "Token" },
                h(ElInput, {
                  type: "textarea",
                  modelValue: credentialForm.token,
                  "onUpdate:modelValue": (val: string) => {
                    credentialForm.token = val;
                  },
                  placeholder: "请输入 API Token",
                  rows: 4
                })
              )
        ])
      ]),
      showCancelButton: true,
      confirmButtonText: "保存",
      cancelButtonText: "取消",
      beforeClose: (action, instance, done) => {
        if (action === "confirm") {
          instance.confirmButtonLoading = true;

          const submitData: any = {
            auth_type: credentialForm.auth_type
          };

          if (credentialForm.auth_type === "password") {
            submitData.username = credentialForm.username;
            if (credentialForm.password) {
              submitData.password = credentialForm.password;
            }
          } else {
            submitData.token = credentialForm.token;
          }

          // 尝试创建或更新凭据
          api
            .createCredential(row?.pk ?? row?.id, submitData)
            .then(() => {
              message("凭据保存成功", { type: "success" });
              done();
            })
            .catch(err => {
              // 如果创建失败，尝试更新
              if (err.code === 1001) {
                api
                  .updateCredential(row?.pk ?? row?.id, submitData)
                  .then(() => {
                    message("凭据保存成功", { type: "success" });
                    done();
                  })
                  .catch(() => {
                    message("凭据保存失败", { type: "error" });
                  })
                  .finally(() => {
                    instance.confirmButtonLoading = false;
                  });
              } else {
                message("凭据保存失败", { type: "error" });
                instance.confirmButtonLoading = false;
              }
            });
        } else {
          done();
        }
      }
    });
  };

  /**
   * 操作按钮配置
   */
  const operationButtonsProps = shallowRef<OperationProps>({
    width: 280,
    showNumber: 3,
    buttons: [
      {
        text: "测试连接",
        code: "testConnection",
        props: {
          type: "primary",
          icon: useRenderIcon(Connection),
          link: true
        },
        onClick: ({ row, loading }) => {
          handleTestConnection(row, loading);
        },
        show: auth.testConnection
      },
      {
        text: "同步数据",
        code: "syncPlatform",
        confirm: {
          title: row => {
            return `确定同步平台 ${row.name} 的数据吗？`;
          }
        },
        props: {
          type: "success",
          icon: useRenderIcon(Refresh),
          link: true
        },
        onClick: ({ row, loading }) => {
          handleSyncPlatform(row, loading);
        },
        show: auth.syncPlatform
      },
      {
        text: "管理凭据",
        code: "manageCredential",
        props: {
          type: "warning",
          icon: useRenderIcon(Key),
          link: true
        },
        onClick: ({ row }) => {
          handleManageCredential(row);
        },
        show: auth.manageCredential
      }
    ]
  });

  /**
   * 自定义新增或编辑配置
   */
  const addOrEditOptions = shallowRef<RePlusPageProps["addOrEditOptions"]>({
    props: {
      columns: {
        platform_type: ({ column, formValue }) => {
          column.fieldProps = {
            ...column.fieldProps,
            onChange: (val: string) => {
              // 根据平台类型自动设置默认端口
              if (val === "vcenter" || val === "esxi") {
                formValue.value.port = 443;
              }
            }
          };
          return column;
        },
        credential: ({ column }) => {
          // 凭据字段在新增/编辑时不显示，使用专门的凭据管理功能
          column.hideInForm = true;
          return column;
        }
      }
    }
  });

  /**
   * 表格列渲染
   */
  const listColumnsFormat = (columns: PageTableColumn[]) => {
    columns.forEach(column => {
      switch (column._column?.key) {
        case "platform_type":
          column["cellRenderer"] = ({ row }) => {
            const typeMap = {
              vcenter: { type: "primary", text: "VMware vCenter" },
              esxi: { type: "info", text: "VMware ESXi" },
              kvm: { type: "success", text: "KVM" },
              proxmox: { type: "warning", text: "Proxmox VE" }
            };
            const config = typeMap[row.platform_type] || {
              type: "info",
              text: row.platform_type
            };
            return h(ElTag, { type: config.type }, () => config.text);
          };
          break;
        case "status":
          column["cellRenderer"] = ({ row }) => {
            const statusMap = {
              0: { type: "info", text: "未连接" },
              1: { type: "success", text: "已连接" },
              2: { type: "danger", text: "连接异常" },
              3: { type: "warning", text: "维护中" }
            };
            const config = statusMap[row.status] || { type: "info", text: "-" };
            return h(
              ElTag,
              { type: config.type, effect: "plain" },
              () => config.text
            );
          };
          break;
        case "is_active":
          column["cellRenderer"] = ({ row }) => {
            return h(
              ElTag,
              { type: row.is_active ? "success" : "info", effect: "plain" },
              () => (row.is_active ? "已启用" : "未启用")
            );
          };
          break;
        case "connection_url":
          column["cellRenderer"] = ({ row }) => {
            return h(
              "a",
              {
                href: row.connection_url,
                target: "_blank",
                style: "color: #409eff; text-decoration: none;"
              },
              row.connection_url
            );
          };
          break;
        // 隐藏次要字段，详细信息在详情页查看
        case "id":
        case "port":
        case "is_ssl":
        case "ssl_verify":
        case "datacenter":
        case "version":
        case "region":
        case "build":
        case "total_hosts":
        case "total_clusters":
        case "tags":
        case "created_time":
        case "updated_time":
          column.hide = true;
          break;
      }
    });
    return columns;
  };

  return {
    api,
    auth,
    addOrEditOptions,
    listColumnsFormat,
    operationButtonsProps
  };
}
