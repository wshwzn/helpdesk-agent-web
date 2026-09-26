export interface ApiResponse<T> {
  success: boolean
  code: string
  message: string
  data: T
  timestamp: string
}

export interface PageResponse<T> {
  page: number
  size: number
  total: number
  pages: number
  records: T[]
}
