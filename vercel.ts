import { type VercelConfig } from '@vercel/config/v1'

export const config: VercelConfig = {
  framework: 'nextjs',
  fluid: true,
  functions: {
    'src/app/api/**': {
      maxDuration: 30,
    },
  },
}
