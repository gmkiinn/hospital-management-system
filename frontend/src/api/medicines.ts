import { api } from '../lib/api'

export async function searchMedicines(q: string): Promise<string[]> {
  const { data } = await api.get<string[]>('/medicines', {
    params: q ? { q } : undefined,
  })
  return data
}
