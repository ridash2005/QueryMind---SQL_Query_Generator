import axios from 'axios'

const savedUrl = localStorage.getItem('qm_api_url') || '/'
const savedKey = localStorage.getItem('qm_openai_key') || ''

const api = axios.create({ baseURL: savedUrl })

api.interceptors.request.use((config) => {
  const key = localStorage.getItem('qm_openai_key')
  if (key && config.headers) {
    config.headers['x-openai-key'] = key
  }
  return config
})

export function setApiUrl(url: string) {
  localStorage.setItem('qm_api_url', url)
  api.defaults.baseURL = url
}

export function getApiUrl(): string {
  return localStorage.getItem('qm_api_url') || ''
}

export function setApiKey(key: string) {
  localStorage.setItem('qm_openai_key', key)
}

export function getApiKey(): string {
  return localStorage.getItem('qm_openai_key') || ''
}

export interface QueryResponse {
  sql: string
  results: Record<string, unknown>[]
  tables_used: string[]
  requires_approval: boolean
  approval_reason?: string
  latency_ms: number
}

export interface ApproveResponse {
  executed: boolean
  results: Record<string, unknown>[]
  message: string
}

export interface SchemaColumn {
  name: string
  description: string
}

export interface SchemaTable {
  table_name: string
  description: string
  columns: SchemaColumn[]
}

export async function approveQuery(sql: string): Promise<QueryResponse> {
  const { data } = await api.post<QueryResponse>('/api/approve', { sql })
  return data
}

export async function uploadDatabase(file: File, onProgress?: (percent: number) => void): Promise<{ success: boolean; message: string }> {
  const formData = new FormData()
  formData.append('file', file)
  
  const { data } = await api.post('/api/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    },
    onUploadProgress: (progressEvent) => {
      if (progressEvent.total && onProgress) {
        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total)
        onProgress(percentCompleted)
      }
    }
  })
  return data
}

export async function postQuery(question: string): Promise<QueryResponse> {
  const { data } = await api.post<QueryResponse>('/api/query', { question })
  return data
}

export async function postApprove(sql: string, approved: boolean): Promise<ApproveResponse> {
  const { data } = await api.post<ApproveResponse>('/api/approve', { sql, approved })
  return data
}

export async function getSchema(): Promise<SchemaTable[]> {
  const { data } = await api.get<SchemaTable[]>('/api/schema')
  return data
}

export async function getHealth(): Promise<Record<string, unknown>> {
  const { data } = await api.get<Record<string, unknown>>('/api/health')
  return data
}
