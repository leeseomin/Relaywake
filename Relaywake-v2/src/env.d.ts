/// <reference types="vite/client" />

import type { C2TestBridge } from './game/core/types';

declare global {
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
