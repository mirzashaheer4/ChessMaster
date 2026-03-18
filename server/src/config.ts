// Environment variable validation and configuration
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.error('❌ CRITICAL: JWT_SECRET environment variable is not set');
  console.error('Please set JWT_SECRET in your .env file or environment variables');
  process.exit(1);
}

// TypeScript-safe export (we've already validated it exists)
export const JWT_SECRET_SAFE: string = JWT_SECRET;
