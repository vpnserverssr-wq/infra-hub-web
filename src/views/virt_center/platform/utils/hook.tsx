import { platformApi } from "./api";
import {
  getCurrentInstance,
  h,
  reactive,
  type Ref,
  ref,
  shallowRef,
  nextTick
} from "vue";
import { getDefaultAuths } from "@/router/utils";
import type {
  OperationProps,
  PageTableColumn,
  RePlusPageProps
} from "@/components/RePlusPage";
import { handleOperation } from "@/components/RePlusPage";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";
import { ElMessageBox, ElTag } from "element-plus";
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

  // 凭据对话框引用和当前平台信息
  const credentialDialogRef = ref();
  const currentPlatform = reactive({
    id: "",
    name: ""
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
   * 管理凭据
   */
  const handleManageCredential = async (row: any) => {
    // 保存当前平台信息
    currentPlatform.id = row?.pk ?? row?.id;
    currentPlatform.name = row?.name || "";

    // 等待 DOM 更新后再打开对话框，确保 props 已经传递给子组件
    await nextTick();

    // 打开凭据对话框
    if (credentialDialogRef.value) {
      credentialDialogRef.value.open();
    }
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
        confirm: { title: "确定要同步此平台的数据吗？" },
        props: {
          type: "success",
          icon: useRenderIcon(Refresh),
          link: true
        },
        onClick: ({ row, loading }) => {
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
    operationButtonsProps,
    credentialDialogRef,
    currentPlatform
  };
}
