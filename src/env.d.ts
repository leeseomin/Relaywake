/// <reference types="vite/client" />

import type { C2TestBridge } from './game/e2e/types';

declare global {
  const __E2E__: boolean;

  interface ImportMetaEnv {
    readonly DEV: boolean;
    readonly MODE: string;
    readonly PROD: boolean;
  }

  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }

  interface Window {
    __C2_GAME__?: C2TestBridge;
  }
}

export {};
