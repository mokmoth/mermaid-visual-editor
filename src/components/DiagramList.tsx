import { useState, useCallback, memo, useRef, useEffect } from 'react'
import { 
  DiagramRecord, 
  DiagramType, 
  listDiagrams, 
  deleteDiagram, 
  renameDiagram,
  formatRelativeTime,
  getDiagramTypeName 
} from '@/services/storage'

interface DiagramListProps {
  isOpen: boolean
  onClose: () => void
  currentDiagramId: string | null
  onSelectDiagram: (diagram: DiagramRecord) => void
  onCreateDiagram: (type: DiagramType) => void
  onDeleteDiagram: (id: string) => void
}

// Icons for diagram types
const DiagramTypeIcon = ({ type }: { type: DiagramType }) => {
  const iconPaths: Record<DiagramType, string> = {
    flowchart: 'M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z',
    state: 'M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    class: 'M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125',
    er: 'M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25z',
    sequence: 'M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z',
  }

  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d={iconPaths[type]} />
    </svg>
  )
}

export const DiagramList = memo(({
  isOpen,
  onClose,
  currentDiagramId,
  onSelectDiagram,
  onCreateDiagram,
  onDeleteDiagram,
}: DiagramListProps) => {
  const [diagrams, setDiagrams] = useState<DiagramRecord[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [showCreateMenu, setShowCreateMenu] = useState(false)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const editInputRef = useRef<HTMLInputElement>(null)

  // Load diagrams when panel opens
  useEffect(() => {
    if (isOpen) {
      setDiagrams(listDiagrams())
    }
  }, [isOpen])

  // Focus input when editing
  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus()
      editInputRef.current.select()
    }
  }, [editingId])

  const handleStartRename = useCallback((diagram: DiagramRecord) => {
    setEditingId(diagram.id)
    setEditingName(diagram.name)
  }, [])

  const handleFinishRename = useCallback(() => {
    if (editingId && editingName.trim()) {
      renameDiagram(editingId, editingName.trim())
      setDiagrams(listDiagrams())
    }
    setEditingId(null)
    setEditingName('')
  }, [editingId, editingName])

  const handleDelete = useCallback((id: string) => {
    deleteDiagram(id)
    setDiagrams(listDiagrams())
    onDeleteDiagram(id)
    setDeleteConfirmId(null)
  }, [onDeleteDiagram])

  const handleCreateDiagram = useCallback((type: DiagramType) => {
    onCreateDiagram(type)
    setShowCreateMenu(false)
    // Refresh diagram list
    setTimeout(() => setDiagrams(listDiagrams()), 100)
  }, [onCreateDiagram])

  const handleSelectDiagram = useCallback((diagram: DiagramRecord) => {
    if (editingId) return // Don't select while editing
    onSelectDiagram(diagram)
    onClose()
  }, [editingId, onSelectDiagram, onClose])

  if (!isOpen) return null

  const diagramTypes: { type: DiagramType; name: string }[] = [
    { type: 'flowchart', name: '流程图' },
    { type: 'state', name: '状态图' },
    { type: 'class', name: '类图' },
    { type: 'er', name: 'ER图' },
    { type: 'sequence', name: '时序图' },
  ]

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-[100] bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Sidebar */}
      <div className="fixed left-0 top-0 bottom-0 z-[101] w-80 bg-white shadow-2xl flex flex-col animate-slide-in">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
          <h2 className="text-lg font-semibold text-gray-800">我的图表</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Create New Button */}
        <div className="p-4 border-b border-gray-100">
          <div className="relative">
            <button
              onClick={() => setShowCreateMenu(!showCreateMenu)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              新建图表
            </button>

            {/* Create Menu Dropdown */}
            {showCreateMenu && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden z-10">
                {diagramTypes.map((item) => (
                  <button
                    key={item.type}
                    onClick={() => handleCreateDiagram(item.type)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
                  >
                    <span className="text-gray-500">
                      <DiagramTypeIcon type={item.type} />
                    </span>
                    <span className="text-gray-700">{item.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Diagram List */}
        <div className="flex-1 overflow-y-auto">
          {diagrams.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 p-8">
              <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" strokeWidth="1" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
              <p className="text-center">还没有图表</p>
              <p className="text-center text-sm mt-1">点击上方按钮创建第一个图表</p>
            </div>
          ) : (
            <div className="p-2">
              {diagrams.map((diagram) => (
                <div
                  key={diagram.id}
                  className={`group relative p-3 rounded-lg cursor-pointer transition-all mb-1 ${
                    diagram.id === currentDiagramId
                      ? 'bg-blue-50 border border-blue-200'
                      : 'hover:bg-gray-50 border border-transparent'
                  }`}
                  onClick={() => handleSelectDiagram(diagram)}
                >
                  {/* Diagram Info */}
                  <div className="flex items-start gap-3">
                    <span className={`mt-0.5 ${diagram.id === currentDiagramId ? 'text-blue-500' : 'text-gray-400'}`}>
                      <DiagramTypeIcon type={diagram.type} />
                    </span>
                    <div className="flex-1 min-w-0">
                      {editingId === diagram.id ? (
                        <input
                          ref={editInputRef}
                          type="text"
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          onBlur={handleFinishRename}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleFinishRename()
                            if (e.key === 'Escape') {
                              setEditingId(null)
                              setEditingName('')
                            }
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="w-full px-2 py-1 text-sm border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-200"
                        />
                      ) : (
                        <h3 className="font-medium text-gray-800 truncate">{diagram.name}</h3>
                      )}
                      <p className="text-xs text-gray-400 mt-1">
                        {getDiagramTypeName(diagram.type)} · {formatRelativeTime(diagram.updatedAt)}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  {editingId !== diagram.id && (
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleStartRename(diagram)
                        }}
                        className="p-1.5 hover:bg-gray-200 rounded transition-colors"
                        title="重命名"
                      >
                        <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                        </svg>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setDeleteConfirmId(diagram.id)
                        }}
                        className="p-1.5 hover:bg-red-100 rounded transition-colors"
                        title="删除"
                      >
                        <svg className="w-4 h-4 text-gray-500 hover:text-red-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-gray-100 bg-gray-50">
          <p className="text-xs text-gray-400 text-center">
            共 {diagrams.length} 个图表
          </p>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-[102] flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm mx-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">确认删除</h3>
            <p className="text-gray-600 mb-4">
              确定要删除这个图表吗？此操作无法撤销。
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                onClick={() => handleDelete(deleteConfirmId)}
                className="px-4 py-2 bg-red-500 text-white hover:bg-red-600 rounded-lg transition-colors"
              >
                删除
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slide-in {
          from {
            transform: translateX(-100%);
          }
          to {
            transform: translateX(0);
          }
        }
        .animate-slide-in {
          animation: slide-in 0.2s ease-out;
        }
      `}</style>
    </>
  )
})

DiagramList.displayName = 'DiagramList'
