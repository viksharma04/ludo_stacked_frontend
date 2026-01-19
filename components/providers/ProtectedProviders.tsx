'use client'

import { WebSocketProvider } from '@/contexts/WebSocketContext'

export function ProtectedProviders({ children }: { children: React.ReactNode }) {
  return <WebSocketProvider>{children}</WebSocketProvider>
}
