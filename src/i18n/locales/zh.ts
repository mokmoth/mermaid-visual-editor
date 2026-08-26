import type { TranslationKeys } from './en'

export const zh: TranslationKeys = {
  // App
  app: {
    name: "RL's Mermaid Tool",
    tagline: '可视化图表编辑器',
  },

  // Common
  common: {
    save: '保存',
    cancel: '取消',
    delete: '删除',
    edit: '编辑',
    add: '添加',
    copy: '复制',
    copied: '已复制',
    close: '关闭',
    confirm: '确认',
    reset: '重置',
    undo: '撤销',
    redo: '重做',
    export: '导出',
    import: '导入',
    preview: '预览',
    expand: '展开',
    collapse: '收起',
    loading: '加载中...',
    error: '错误',
    success: '成功',
    warning: '警告',
    yes: '是',
    no: '否',
  },

  // Header
  header: {
    diagramType: '图表类型',
    selectMode: '选择',
    connectMode: '连线',
    autoLayout: '排版',
    gridSnap: '网格对齐',
    direction: '方向',
    directionTD: '从上到下',
    directionLR: '从左到右',
    directionBT: '从下到上',
    directionRL: '从右到左',
  },

  // Diagram Types
  diagramTypes: {
    flowchart: '流程图',
    state: '状态图',
    stateDiagram: '状态图',
    classDiagram: '类图',
    erDiagram: 'ER 图',
    sequenceDiagram: '时序图',
  },

  // Flowchart
  flowchart: {
    // Node types
    nodes: {
      rect: '过程',
      round: '圆角',
      stadium: '开始/结束',
      subroutine: '子程序',
      database: '数据库',
      circle: '连接点',
      rhombus: '判断',
      hexagon: '准备',
      parallelogram: '输入/输出',
      flag: '旗帜',
      trapezoid: '梯形',
      trapezoidAlt: '反梯形',
      doubleCircle: '双圆',
      parallelogramAlt: '反平行四边形',
      swimlane: '泳道',
    },
    // Default labels
    labels: {
      rect: '过程',
      round: '圆角',
      stadium: '开始',
      subroutine: '子程序',
      database: '数据',
      circle: '连接',
      rhombus: '判断',
      hexagon: '准备',
      parallelogram: '输入/输出',
      flag: '标记',
      trapezoid: '梯形',
      trapezoidAlt: '反梯形',
      doubleCircle: '双圆',
      parallelogramAlt: '反平行',
    },
  },

  // State Diagram
  stateDiagram: {
    nodes: {
      state: '状态',
      start: '开始',
      end: '结束',
      choice: '选择',
      fork: '分叉',
      join: '合并',
      composite: '复合状态',
    },
    labels: {
      name: '名称',
      type: '类型',
      newState: '新状态',
      transitionLabel: '转换标签',
      eventName: '事件名称',
      from: '来源',
      to: '目标',
    },
    stats: {
      states: '状态数',
      transitions: '转换数',
    },
    transition: '转换',
    guard: '守卫条件',
    action: '动作',
  },

  // Class Diagram
  classDiagram: {
    class: '类',
    interface: '接口',
    abstract: '抽象类',
    enum: '枚举',
    attributes: '属性',
    methods: '方法',
    visibility: {
      public: '公开',
      private: '私有',
      protected: '受保护',
      package: '包级',
    },
    relationships: {
      inheritance: '继承',
      realization: '实现',
      composition: '组合',
      aggregation: '聚合',
      association: '关联',
      dependency: '依赖',
    },
  },

  // ER Diagram
  erDiagram: {
    entity: '实体',
    attribute: '属性',
    relationship: '关系',
    primaryKey: '主键',
    foreignKey: '外键',
    nullable: '可空',
    unique: '唯一',
    cardinality: {
      one: '一个',
      zeroOne: '零或一个',
      many: '多个',
      zeroMany: '零或多个',
    },
  },

  // Sequence Diagram
  sequenceDiagram: {
    participant: '参与者',
    actor: '角色',
    message: '消息',
    title: '图表标题',
    autoNumber: '自动编号',
    labels: {
      name: '名称',
      alias: '别名',
      type: '类型',
      text: '消息文本',
      arrowType: '箭头类型',
      from: '发送方',
      to: '接收方',
      order: '顺序',
      moveUp: '上移',
      moveDown: '下移',
    },
    messageTypes: {
      solid: '实线箭头',
      dotted: '虚线箭头',
      solidOpen: '实线开放',
      dottedOpen: '虚线开放',
      solidCross: '实线叉',
      dottedCross: '虚线叉',
    },
    stats: {
      participants: '参与者',
      messages: '消息',
    },
  },

  // Sidebar
  sidebar: {
    properties: '属性',
    noSelection: '未选中',
    selectElement: '在左侧画布选择元素以编辑',
    snapToGrid: '网格对齐',
    alignment: '对齐',
    nodeProperties: '节点属性',
    linkProperties: '连线属性',
    label: '标签',
    textContent: '文本内容',
    lineStyle: '线条样式',
    solid: '实线',
    dotted: '虚线',
    thick: '粗线',
    arrowType: '箭头端点',
    arrowNone: '无',
    arrowForward: '前向',
    arrowBack: '后向',
    arrowBoth: '双向',
    arrowCircle: '圆形',
    arrowCross: '叉形',
    multiSelect: '已选择 {count} 个节点',
    alignTools: '对齐工具',
    alignLeft: '左',
    alignCenter: '中',
    alignRight: '右',
    alignTop: '顶',
    alignMiddle: '中',
    alignBottom: '底',
    mermaidCode: 'Mermaid 代码',
    preview: '预览',
    fullscreen: '全屏',
    exitFullscreen: '退出全屏',
  },

  // Code Editor
  codeEditor: {
    title: '代码',
    syntaxError: '语法错误',
  },

  // Preview
  preview: {
    title: '预览',
    zoom: '缩放',
    fit: '适应',
    resetView: '重置视图',
  },

  // Export
  export: {
    title: '导出',
    asSVG: '导出为 SVG',
    asPNG: '导出为 PNG',
    asPDF: '导出为 PDF',
  },

  // Keyboard shortcuts
  shortcuts: {
    title: '键盘快捷键',
    delete: '删除选中',
    undo: '撤销',
    redo: '重做',
    copy: '复制',
    paste: '粘贴',
    selectAll: '全选',
    escape: '取消 / 取消选择',
  },

  // Settings
  settings: {
    title: '设置',
    language: '语言',
    theme: '主题',
    themeLight: '浅色',
    themeDark: '深色',
    themeSystem: '跟随系统',
  },

  // Errors
  errors: {
    parseError: '解析 Mermaid 代码失败',
    renderError: '渲染图表失败',
    exportError: '导出失败',
    unknownError: '发生未知错误',
  },
}
