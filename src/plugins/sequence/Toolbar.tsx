import { memo } from 'react'
import type { ToolbarProps } from '@/core/types'
import type { SequenceDiagramState, Participant, Message } from './types'
import { Icon, Icons } from '@/components/Icons'

interface SequenceToolbarProps extends ToolbarProps<SequenceDiagramState> {}

export const SequenceToolbar = memo(({
  state,
  direction: _direction,
  editorView: _editorView,
  onStateChange,
  onDirectionChange: _onDirectionChange,
  onAutoLayout: _onAutoLayout
}: SequenceToolbarProps) => {

  const handleAddParticipant = (type: 'participant' | 'actor') => {
    const maxOrder = Math.max(...state.participants.map(p => p.order), -1)
    const id = `p${Date.now()}`
    const newParticipant: Participant = {
      id,
      name: type === 'actor' ? `Actor${maxOrder + 2}` : `Participant${maxOrder + 2}`,
      type,
      order: maxOrder + 1
    }
    onStateChange({
      ...state,
      participants: [...state.participants, newParticipant]
    })
  }

  const handleAddMessage = () => {
    if (state.participants.length < 2) return

    const maxOrder = Math.max(...state.messages.map(m => m.order), -1)
    const newMessage: Message = {
      id: `m${Date.now()}`,
      from: state.participants[0].id,
      to: state.participants[1].id,
      text: 'New message',
      type: 'solid',
      order: maxOrder + 1
    }
    onStateChange({
      ...state,
      messages: [...state.messages, newMessage]
    })
  }

  return (
    <div className="flex items-center gap-1">
      {/* Add Participant */}
      <button
        onClick={() => handleAddParticipant('participant')}
        className="flex items-center gap-1 px-2 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded"
        title="Add Participant"
      >
        <Icon path={Icons.Rect} size={16} />
        <span className="hidden sm:inline">Participant</span>
      </button>

      {/* Add Actor */}
      <button
        onClick={() => handleAddParticipant('actor')}
        className="flex items-center gap-1 px-2 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded"
        title="Add Actor"
      >
        <Icon path={Icons.User} size={16} />
        <span className="hidden sm:inline">Actor</span>
      </button>

      <div className="w-px h-6 bg-gray-300 mx-1" />

      {/* Add Message */}
      <button
        onClick={handleAddMessage}
        className="flex items-center gap-1 px-2 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
        title="Add Message"
        disabled={state.participants.length < 2}
      >
        <Icon path={Icons.Arrow} size={16} />
        <span className="hidden sm:inline">Message</span>
      </button>

      <div className="w-px h-6 bg-gray-300 mx-1" />

      {/* Auto Number Toggle */}
      <button
        onClick={() => onStateChange({ ...state, autoNumber: !state.autoNumber })}
        className={`flex items-center gap-1 px-2 py-1.5 text-sm rounded ${
          state.autoNumber ? 'bg-blue-100 text-blue-700' : 'text-gray-700 hover:bg-gray-100'
        }`}
        title="Auto Number Messages"
      >
        <span className="font-mono text-xs">1.</span>
        <span className="hidden sm:inline">Auto #</span>
      </button>
    </div>
  )
})

SequenceToolbar.displayName = 'SequenceToolbar'
