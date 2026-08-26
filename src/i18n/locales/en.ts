export const en = {
  // App
  app: {
    name: "RL's Mermaid Tool",
    tagline: 'Visual Diagram Editor',
  },

  // Common
  common: {
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    add: 'Add',
    copy: 'Copy',
    copied: 'Copied',
    close: 'Close',
    confirm: 'Confirm',
    reset: 'Reset',
    undo: 'Undo',
    redo: 'Redo',
    export: 'Export',
    import: 'Import',
    preview: 'Preview',
    expand: 'Expand',
    collapse: 'Collapse',
    loading: 'Loading...',
    error: 'Error',
    success: 'Success',
    warning: 'Warning',
    yes: 'Yes',
    no: 'No',
  },

  // Header
  header: {
    diagramType: 'Diagram Type',
    selectMode: 'Select',
    connectMode: 'Connect',
    autoLayout: 'Layout',
    gridSnap: 'Snap to Grid',
    direction: 'Direction',
    directionTD: 'Top-Down',
    directionLR: 'Left-Right',
    directionBT: 'Bottom-Top',
    directionRL: 'Right-Left',
  },

  // Diagram Types
  diagramTypes: {
    flowchart: 'Flowchart',
    state: 'State Diagram',
    stateDiagram: 'State Diagram',
    classDiagram: 'Class Diagram',
    erDiagram: 'ER Diagram',
    sequenceDiagram: 'Sequence Diagram',
  },

  // Flowchart
  flowchart: {
    // Node types
    nodes: {
      rect: 'Process',
      round: 'Round',
      stadium: 'Start/End',
      subroutine: 'Subroutine',
      database: 'Database',
      circle: 'Connector',
      rhombus: 'Decision',
      hexagon: 'Preparation',
      parallelogram: 'Input/Output',
      flag: 'Flag',
      trapezoid: 'Trapezoid',
      trapezoidAlt: 'Trapezoid Alt',
      doubleCircle: 'Double Circle',
      parallelogramAlt: 'Parallelogram Alt',
      swimlane: 'Swimlane',
    },
    // Default labels
    labels: {
      rect: 'Process',
      round: 'Round',
      stadium: 'Start',
      subroutine: 'Subroutine',
      database: 'Data',
      circle: 'Connector',
      rhombus: 'Decision',
      hexagon: 'Prepare',
      parallelogram: 'I/O',
      flag: 'Flag',
      trapezoid: 'Trapezoid',
      trapezoidAlt: 'Inv Trapezoid',
      doubleCircle: 'Double',
      parallelogramAlt: 'Inv Parallel',
    },
  },

  // State Diagram
  stateDiagram: {
    nodes: {
      state: 'State',
      start: 'Start',
      end: 'End',
      choice: 'Choice',
      fork: 'Fork',
      join: 'Join',
      composite: 'Composite',
    },
    labels: {
      name: 'Name',
      type: 'Type',
      newState: 'New State',
      transitionLabel: 'Transition Label',
      eventName: 'Event name',
      from: 'From',
      to: 'To',
    },
    stats: {
      states: 'States',
      transitions: 'Transitions',
    },
    transition: 'Transition',
    guard: 'Guard',
    action: 'Action',
  },

  // Class Diagram
  classDiagram: {
    class: 'Class',
    interface: 'Interface',
    abstract: 'Abstract',
    enum: 'Enum',
    attributes: 'Attributes',
    methods: 'Methods',
    visibility: {
      public: 'Public',
      private: 'Private',
      protected: 'Protected',
      package: 'Package',
    },
    relationships: {
      inheritance: 'Inheritance',
      realization: 'Realization',
      composition: 'Composition',
      aggregation: 'Aggregation',
      association: 'Association',
      dependency: 'Dependency',
    },
  },

  // ER Diagram
  erDiagram: {
    entity: 'Entity',
    attribute: 'Attribute',
    relationship: 'Relationship',
    primaryKey: 'Primary Key',
    foreignKey: 'Foreign Key',
    nullable: 'Nullable',
    unique: 'Unique',
    cardinality: {
      one: 'One',
      zeroOne: 'Zero or One',
      many: 'Many',
      zeroMany: 'Zero or Many',
    },
  },

  // Sequence Diagram
  sequenceDiagram: {
    participant: 'Participant',
    actor: 'Actor',
    message: 'Message',
    title: 'Diagram Title',
    autoNumber: 'Auto Number',
    labels: {
      name: 'Name',
      alias: 'Alias',
      type: 'Type',
      text: 'Message Text',
      arrowType: 'Arrow Type',
      from: 'From',
      to: 'To',
      order: 'Order',
      moveUp: 'Move Up',
      moveDown: 'Move Down',
    },
    messageTypes: {
      solid: 'Solid Arrow',
      dotted: 'Dotted Arrow',
      solidOpen: 'Solid Open',
      dottedOpen: 'Dotted Open',
      solidCross: 'Solid Cross',
      dottedCross: 'Dotted Cross',
    },
    stats: {
      participants: 'Participants',
      messages: 'Messages',
    },
  },

  // Sidebar
  sidebar: {
    properties: 'Properties',
    noSelection: 'No Selection',
    selectElement: 'Select an element to edit',
    snapToGrid: 'Snap to Grid',
    alignment: 'Alignment',
    nodeProperties: 'Node Properties',
    linkProperties: 'Link Properties',
    label: 'Label',
    textContent: 'Text Content',
    lineStyle: 'Line Style',
    solid: 'Solid',
    dotted: 'Dotted',
    thick: 'Thick',
    arrowType: 'Arrow Type',
    arrowNone: 'None',
    arrowForward: 'Forward',
    arrowBack: 'Back',
    arrowBoth: 'Both',
    arrowCircle: 'Circle',
    arrowCross: 'Cross',
    multiSelect: '{count} nodes selected',
    alignTools: 'Alignment',
    alignLeft: 'Left',
    alignCenter: 'Center',
    alignRight: 'Right',
    alignTop: 'Top',
    alignMiddle: 'Middle',
    alignBottom: 'Bottom',
    mermaidCode: 'Mermaid Code',
    preview: 'Preview',
    fullscreen: 'Fullscreen',
    exitFullscreen: 'Exit Fullscreen',
  },

  // Code Editor
  codeEditor: {
    title: 'Code',
    syntaxError: 'Syntax Error',
  },

  // Preview
  preview: {
    title: 'Preview',
    zoom: 'Zoom',
    fit: 'Fit',
    resetView: 'Reset View',
  },

  // Export
  export: {
    title: 'Export',
    asSVG: 'Export as SVG',
    asPNG: 'Export as PNG',
    asPDF: 'Export as PDF',
  },

  // Keyboard shortcuts
  shortcuts: {
    title: 'Keyboard Shortcuts',
    delete: 'Delete selected',
    undo: 'Undo',
    redo: 'Redo',
    copy: 'Copy',
    paste: 'Paste',
    selectAll: 'Select all',
    escape: 'Cancel / Deselect',
  },

  // Settings
  settings: {
    title: 'Settings',
    language: 'Language',
    theme: 'Theme',
    themeLight: 'Light',
    themeDark: 'Dark',
    themeSystem: 'System',
  },

  // Errors
  errors: {
    parseError: 'Failed to parse Mermaid code',
    renderError: 'Failed to render diagram',
    exportError: 'Failed to export',
    unknownError: 'An unknown error occurred',
  },
}

export type TranslationKeys = typeof en
