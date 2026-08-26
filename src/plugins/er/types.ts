// ER Diagram Types

export type AttributeType = 'INT' | 'VARCHAR' | 'DATE' | 'DECIMAL' | 'BOOLEAN' | 'TEXT' | 'FLOAT' | 'TIMESTAMP'
export type Cardinality = '||' | '|o' | '}|' | '}o'  // one, zero-one, many, zero-many

export interface EntityAttribute {
  id: string
  name: string
  type: AttributeType
  isPK?: boolean
  isFK?: boolean
  isNullable?: boolean
  isUnique?: boolean
}

export interface Entity {
  id: string
  name: string
  x: number
  y: number
  attributes: EntityAttribute[]
  customWidth?: number
  customHeight?: number
}

export interface ERRelationship {
  id: string
  from: string
  to: string
  fromCardinality: Cardinality
  toCardinality: Cardinality
  label?: string
  identifying?: boolean
}

export interface ERDiagramState {
  entities: Entity[]
  relationships: ERRelationship[]
}

// Initial state factory - minimal example
export function createInitialERDiagramState(): ERDiagramState {
  return {
    entities: [
      {
        id: 'Entity1',
        name: '实体',
        x: 150,
        y: 150,
        attributes: [
          { id: 'a1', name: 'id', type: 'INT', isPK: true },
          { id: 'a2', name: 'name', type: 'VARCHAR' },
        ]
      },
    ],
    relationships: []
  }
}

// Attribute type options
export const ATTRIBUTE_TYPES: Array<{ value: AttributeType; label: string }> = [
  { value: 'INT', label: 'INT' },
  { value: 'VARCHAR', label: 'VARCHAR' },
  { value: 'TEXT', label: 'TEXT' },
  { value: 'DATE', label: 'DATE' },
  { value: 'TIMESTAMP', label: 'TIMESTAMP' },
  { value: 'DECIMAL', label: 'DECIMAL' },
  { value: 'FLOAT', label: 'FLOAT' },
  { value: 'BOOLEAN', label: 'BOOLEAN' },
]

// Cardinality options
export const CARDINALITY_OPTIONS: Array<{ value: Cardinality; label: string; description: string }> = [
  { value: '||', label: 'Exactly One', description: '||' },
  { value: '|o', label: 'Zero or One', description: '|o' },
  { value: '}|', label: 'One or Many', description: '}|' },
  { value: '}o', label: 'Zero or Many', description: '}o' },
]
