import React from 'react'
import { Editor } from '@tiptap/react'

function MenuButton({ 
  isActive, 
  onClick, 
  children 
}: { 
  isActive: boolean
  onClick: () => void
  children: React.ReactNode 
}) {
  return (
    <button
      className={`px-2 py-1 rounded text-sm font-medium ${
        isActive 
          ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100' 
          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
      }`}
      onClick={onClick}
    >
      {children}
    </button>
  )
}

export interface RichTextToolbarProps {
  editor: Editor
}

export function RichTextToolbar({ editor }: RichTextToolbarProps) {
  return (
    <div className="flex items-center gap-1 p-2 border-b border-gray-200 dark:border-gray-700">
      <MenuButton
        isActive={editor.isActive('paragraph')}
        onClick={() => editor.chain().focus().setParagraph().run()}
      >
        <span className="text-xs">¶</span> Normal
      </MenuButton>
      <MenuButton
        isActive={editor.isActive('heading', { level: 1 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
      >
        H1
      </MenuButton>
      <MenuButton
        isActive={editor.isActive('heading', { level: 2 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      >
        H2
      </MenuButton>
      <MenuButton
        isActive={editor.isActive('heading', { level: 3 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
      >
        H3
      </MenuButton>
      <div className="w-px h-4 mx-1 bg-gray-200 dark:bg-gray-700" />
      <MenuButton
        isActive={editor.isActive('bold')}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        B
      </MenuButton>
      <MenuButton
        isActive={editor.isActive('italic')}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        I
      </MenuButton>
    </div>
  )
} 