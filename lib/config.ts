// Saklar Deployment & Env Variable (diatur di .env.local atau Vercel)
export const IS_PREVIEW = process.env.NEXT_PUBLIC_IS_PREVIEW === 'true';
export const GAS_URL = process.env.NEXT_PUBLIC_GAS_URL || 'URL_DEPLOY_GAS_ANDA_DISINI';
export const SCHOOL_NAME = 'SDN Jatinegara Kaum 07';
