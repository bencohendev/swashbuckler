'use client'

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useDataClient, useSpaceId } from '@/shared/lib/data'
import { queryKeys } from '@/shared/lib/data/queryKeys'
import { useObjects } from '@/features/objects/hooks'
import { useObjectTypeMap } from '@/features/object-types/hooks/useObjectTypeMap'
import { useExclusionFilter } from '@/features/sharing'
import { queryKeys } from '@/shared/lib/data/queryKeys'
import { buildGraphData } from '../lib/buildGraphData'
import type { GraphData } from '../lib/types'

export function useGraphData() {
  const dataClient = useDataClient()
  const spaceId = useSpaceId()
  const { objects: rawObjects, isLoading: objectsLoading } = useObjects({ isDeleted: false })
  const { typeMap, types, isLoading: typesLoading } = useObjectTypeMap()
  const { filterObjects } = useExclusionFilter()

  const { data: relations, isLoading: relationsLoading } = useQuery({
    queryKey: queryKeys.relations.all(spaceId ?? undefined),
    queryFn: async () => {
      const result = await dataClient.relations.listAll()
      if (result.error) throw new Error(result.error.message)
      return result.data
    },
  })

  const objects = useMemo(() => filterObjects(rawObjects), [rawObjects, filterObjects])

  const graphData = useMemo<GraphData>(
    () => buildGraphData(objects, relations ?? [], typeMap),
    [objects, relations, typeMap],
  )

  const isLoading = objectsLoading || typesLoading || relationsLoading

  return { graphData, types, typeMap, isLoading }
}
