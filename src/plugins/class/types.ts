// Class Diagram Types

export type ClassStereotype = 'none' | 'interface' | 'abstract' | 'enum'
export type MemberVisibility = '+' | '-' | '#' | '~'
export type RelationshipType =
  | 'inheritance'
  | 'realization'
  | 'composition'
  | 'aggregation'
  | 'association'
  | 'dependency'

export interface ClassMember {
  id: string
  visibility: MemberVisibility
  name: string
  type?: string
  parameters?: string  // For methods
  isStatic?: boolean
  isAbstract?: boolean
}

export interface ClassNode {
  id: string
  name: string
  x: number
  y: number
  stereotype?: ClassStereotype
  attributes: ClassMember[]
  methods: ClassMember[]
  customWidth?: number
  customHeight?: number
}

export interface ClassRelationship {
  id: string
  from: string
  to: string
  type: RelationshipType
  fromCardinality?: string
  toCardinality?: string
  label?: string
}

export interface ClassDiagramState {
  classes: ClassNode[]
  relationships: ClassRelationship[]
}

// Initial state factory - minimal example
export function createInitialClassDiagramState(): ClassDiagramState {
  return {
    classes: [
      {
        id: 'Class1',
        name: '类',
        x: 150,
        y: 150,
        stereotype: 'none',
        attributes: [
          { id: 'a1', visibility: '-', name: 'attribute', type: 'string' },
        ],
        methods: [
          { id: 'm1', visibility: '+', name: 'method', type: 'void', parameters: '()' },
        ]
      },
    ],
    relationships: []
  }
}

// Class stereotype options
export const CLASS_STEREOTYPES: Array<{ value: ClassStereotype; labelKey: string }> = [
  { value: 'none', labelKey: 'classDiagram.class' },
  { value: 'interface', labelKey: 'classDiagram.interface' },
  { value: 'abstract', labelKey: 'classDiagram.abstract' },
  { value: 'enum', labelKey: 'classDiagram.enum' },
]

// Relationship type options
export const RELATIONSHIP_TYPES: Array<{ type: RelationshipType; labelKey: string }> = [
  { type: 'inheritance', labelKey: 'classDiagram.relationships.inheritance' },
  { type: 'realization', labelKey: 'classDiagram.relationships.realization' },
  { type: 'composition', labelKey: 'classDiagram.relationships.composition' },
  { type: 'aggregation', labelKey: 'classDiagram.relationships.aggregation' },
  { type: 'association', labelKey: 'classDiagram.relationships.association' },
  { type: 'dependency', labelKey: 'classDiagram.relationships.dependency' },
]
