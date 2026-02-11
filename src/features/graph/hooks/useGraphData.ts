'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useDataClient } from '@/shared/lib/data'
import type { ObjectRelation } from '@/shared/lib/data'
import { subscribe } from '@/shared/lib/data/events'
import { useObjects } from '@/features/objects/hooks'
import { useObjectTypeMap } from '@/features/object-types/hooks/useObjectTypeMap'
import { useExclusionFilter } from '@/features/sharing'
import { buildGraphData } from '../lib/buildGraphData'
import type { GraphData } from '../lib/types'

export function useGraphData() {
  const dataClient = useDataClient()
  const { objects: rawObjects, isLoading: objectsLoading } = useObjects({ isDeleted: false })
  const { typeMap, types, isLoading: typesLoading } = useObjectTypeMap()
  const { filterObjects } = useExclusionFilter()

  const [relations, setRelations] = useState<ObjectRelation[]>([])
  const [relationsLoading, setRelationsLoading] = useState(true)
  const isMounted = useRef(true)

  const fetchRelations = useCallback(async () => {
    const result = await dataClient.relations.listAll()
    if (!isMounted.current) return
    if (result.error) {
      setRelations([])
    } else {
      setRelations(result.data)
    }
    setRelationsLoading(false)
  }, [dataClient])

  useEffect(() => {
    isMounted.current = true
    fetchRelations()
    const unsub1 = subscribe('objectRelations', fetchRelations)
    const unsub2 = subscribe('objects', fetchRelations)
    return () => {
      isMounted.current = false
      unsub1()
      unsub2()
    }
  }, [fetchRelations])

  const objects = useMemo(() => filterObjects(rawObjects), [rawObjects, filterObjects])

  const graphData = useMemo<GraphData>(
    () => buildGraphData(objects, relations, typeMap),
    [objects, relations, typeMap],
  )

  const isLoading = objectsLoading || typesLoading || relationsLoading

  return { graphData, types, typeMap, isLoading }
}
