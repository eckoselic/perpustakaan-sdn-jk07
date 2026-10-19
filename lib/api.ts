import { GAS_URL, IS_PREVIEW } from './config';
import { mockCall } from './dummy';

export class ApiError extends Error {
  code: string;
  constructor(message: string, code = '') {
    super(message);
    this.code = code;
  }
}

let unauthorizedHandler: (() => void) | null = null;
export function setUnauthorizedHandler(fn: (() => void) | null) {
  unauthorizedHandler = fn;
}

interface ApiResponse { ok: boolean; data?: unknown; error?: string; code?: string }

// Semua permintaan memakai POST + Content-Type text/plain agar browser tidak mengirim preflight CORS ke Apps Script.
export async function callApi<T = any>(action: string, data: Record<string, any> = {}, token?: string): Promise<T> {
  let res: ApiResponse;
  if (IS_PREVIEW) {
    res = await mockCall(action, data, token);
  } else {
    if (!GAS_URL || GAS_URL.startsWith('URL_DEPLOY')) {
      throw new ApiError('NEXT_PUBLIC_GAS_URL belum diisi. Isi dengan URL Web App Apps Script (berakhiran /exec).');
    }
    let r: Response;
    try {
      r = await fetch(GAS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action, data, token }),
        redirect: 'follow',
      });
    } catch {
      throw new ApiError('Tidak dapat terhubung ke server. Periksa koneksi internet dan URL Web App.');
    }
    try {
      res = (await r.json()) as ApiResponse;
    } catch {
      throw new ApiError('Respons server tidak valid. Pastikan Web App di-deploy dengan akses "Siapa saja" dan URL berakhiran /exec.');
    }
  }
  if (!res.ok) {
    if (res.code === 'SESI' && unauthorizedHandler) unauthorizedHandler();
    throw new ApiError(res.error || 'Terjadi kesalahan.', res.code || '');
  }
  return res.data as T;
}
