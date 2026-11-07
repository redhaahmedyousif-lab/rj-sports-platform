/** إعدادات Paddle — القيم العامة (NEXT_PUBLIC_*) تصل للمتصفح، والسرية تبقى في الخادم */
export const paddleEnv = (process.env.NEXT_PUBLIC_PADDLE_ENV === "production" ? "production" : "sandbox") as
  | "production"
  | "sandbox";
export const paddleClientToken = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN ?? "";
export const paddlePriceId = process.env.NEXT_PUBLIC_PADDLE_PRICE_ID ?? "";

/** هل يمكن فتح صفحة الدفع؟ */
export const isPaddleCheckoutConfigured = Boolean(paddleClientToken && paddlePriceId);

export const PREMIUM_PRICE_LABEL = "1.99$";
