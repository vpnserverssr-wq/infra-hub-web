import { BaseApi } from "@/api/base";
import type { DetailResult } from "@/api/types";

/**
 * 虚拟化平台管理 API
 */
class PlatformApi extends BaseApi {
  /**
   * 测试平台连接
   */
  testConnection = (pk: number | string) => {
    return this.request<DetailResult>(
      "post",
      {},
      {},
      `${this.baseApi}/${pk}/test-connection`
    );
  };

  /**
   * 同步平台数据
   */
  syncPlatform = (pk: number | string) => {
    return this.request<DetailResult>(
      "post",
      {},
      {},
      `${this.baseApi}/${pk}/sync`
    );
  };

  /**
   * 获取平台凭据
   */
  getCredential = (pk: number | string) => {
    return this.request<DetailResult>(
      "get",
      {},
      {},
      `${this.baseApi}/${pk}/credential`
    );
  };

  /**
   * 创建平台凭据
   */
  createCredential = (pk: number | string, data: object) => {
    return this.request<DetailResult>(
      "post",
      {},
      data,
      `${this.baseApi}/${pk}/credential`
    );
  };

  /**
   * 更新平台凭据
   */
  updateCredential = (pk: number | string, data: object) => {
    return this.request<DetailResult>(
      "put",
      {},
      data,
      `${this.baseApi}/${pk}/credential`
    );
  };
}

const platformApi = new PlatformApi("/api/virt_center/platforms");
export { platformApi };
