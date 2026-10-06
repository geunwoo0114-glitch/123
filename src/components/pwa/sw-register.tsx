"use client";

import { useEffect } from "react";
import { registerServiceWorker } from "./push";

/** 서비스 워커 등록 (푸시 수신과 앱 설치 조건을 위해) */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    registerServiceWorker()?.catch(() => undefined);
  }, []);
  return null;
}
