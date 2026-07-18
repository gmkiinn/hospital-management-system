import { api } from '../lib/api'
import type { Department } from '../types'

export interface DepartmentCreate {
  name: string
  description?: string | null
}

export async function listDepartments(): Promise<Department[]> {
  const { data } = await api.get<Department[]>('/departments')
  return data
}

export async function createDepartment(
  payload: DepartmentCreate,
): Promise<Department> {
  const { data } = await api.post<Department>('/departments', payload)
  return data
}
