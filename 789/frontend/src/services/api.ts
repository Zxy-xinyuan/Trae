import axios from 'axios'
import type {
  ConversionRequest,
  ConversionResponse,
  ValidationResponse,
  HealthResponse,
} from '../types/script'

const api = axios.create({
  baseURL: '/api/v1',
  timeout: 180000, // 转换可能需要较长时间
  headers: {
    'Content-Type': 'application/json',
  },
})

/** 响应拦截器：统一错误处理 */
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.data) {
      return Promise.reject(error.response.data)
    }
    if (error.code === 'ECONNABORTED') {
      return Promise.reject({ error: 'TIMEOUT', message: '请求超时，请稍后重试' })
    }
    return Promise.reject({ error: 'NETWORK_ERROR', message: '网络连接失败，请检查后端服务是否启动' })
  }
)

/**
 * 小说转剧本
 */
export async function convertNovel(request: ConversionRequest): Promise<ConversionResponse> {
  const { data } = await api.post<ConversionResponse>('/convert', request)
  return data
}

/**
 * 校验 YAML 内容
 */
export async function validateYaml(yamlContent: string): Promise<ValidationResponse> {
  const { data } = await api.post<ValidationResponse>('/validate', {
    yaml_content: yamlContent,
  })
  return data
}

/**
 * 健康检查
 */
export async function checkHealth(): Promise<HealthResponse> {
  const { data } = await api.get<HealthResponse>('/health')
  return data
}

export default api
