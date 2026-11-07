"use client";

import { useTransition, type FormEvent } from "react";

/**
 * React 19 يعيد ضبط حقول النموذج تلقائياً بعد كل إرسال عبر action={...}،
 * فيفقد المشرف ما كتبه عند ظهور خطأ تحقق. هذا الإرسال يمرّر البيانات للـ action
 * داخل transition بدون إعادة الضبط التلقائية (والتفريغ بعد النجاح يتم يدوياً حيث يلزم).
 */
export function useSubmit(dispatch: (fd: FormData) => void) {
  const [, start] = useTransition();
  return (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    start(() => dispatch(fd));
  };
}
