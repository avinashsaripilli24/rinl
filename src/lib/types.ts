export type Dir = 'N' | 'S' | 'E' | 'W'
export type Facing = 'NE' | 'E' | 'N' | 'NW' | 'SE' | 'W' | 'S' | 'SW'
export type PlotType = 'LIG' | 'MIG' | 'Pump House'

/** Shape of each record in src/data/plots.json (produced by scripts/extract.py). */
export interface RawPlot {
  id: string
  unit: string
  block: string
  day: 1 | 2
  listedInDayTable: 1 | 2
  sl: number
  area: number
  landUse: string
  reservePrice: number
  rate: number
  emd: number
  emdLastDate: string
  auctionDate: string
  coords: [number, number] | null
  approach: string
  surroundings: Record<Dir, string>
  conflicts: string[]
  rfpPage: number | null
}

export interface Road {
  side: Dir
  /** width in feet; null when the RFP just says "Road" */
  width: number | null
  label: string
}

export type TagKind = 'good' | 'bad' | 'info'
export interface Tag {
  key: string
  kind: TagKind
  label: string
}

export interface Plot extends RawPlot {
  type: PlotType
  roads: Road[]
  roadSides: number
  isCorner: boolean
  facing: Facing | null
  vastuRank: number
  /** widest road in feet (unknown widths count as 0) */
  maxRoad: number
  roadClass: 'Arterial 60ft' | 'Wide 40ft' | 'Standard 30ft' | 'Narrow ≤24ft' | 'Unspecified'
  sqft: number
  estDims: { front: number; depth: number }
  tags: Tag[]
  mapUrl: string | null
  searchText: string
}

export interface Weights {
  vastu: number
  corner: number
  road: number
  value: number
  area: number
  features: number
}
