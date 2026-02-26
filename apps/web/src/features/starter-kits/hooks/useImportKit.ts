'use client'

import { useCallback, useState } from 'react'
import { useDataClient } from '@/shared/lib/data'
import { useObjectTypes } from '@/features/object-types/hooks/useObjectTypes'
import { importKit, type ImportKitResult } from '../lib/importKit'
import type { StarterKit } from '../data/kits'

interface UseImportKitReturn {
  importStarterKit: (kit: StarterKit) => Promise<ImportKitResult>
  isImporting: boolean
}

export function useImportKit(): UseImportKitReturn {
  const dataClient = useDataClient()
  const { types } = useObjectTypes()
  const [isImporting, setIsImporting] = useState(false)

  const importStarterKit = useCallback(async (kit: StarterKit): Promise<ImportKitResult> => {
    setIsImporting(true)
    try {
      return await importKit(kit, dataClient, types)
    } finally {
      setIsImporting(false)
    }
  }, [dataClient, types])

  return { importStarterKit, isImporting }
}
