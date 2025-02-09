import React from 'react'
import { BubbleMenu, Editor } from '@tiptap/react'

function MenuButton({ 
  isActive, 
  onClick, 
  children,
  title
}: { 
  isActive: boolean
  onClick: () => void
  children: React.ReactNode
  title?: string
}) {
  return (
    <button
      className={`p-1 rounded text-sm ${
        isActive 
          ? 'bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100' 
          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
      }`}
      onClick={onClick}
      title={title}
    >
      {children}
    </button>
  )
}

export interface RichTextBubbleMenuProps {
  editor: Editor
}

export function RichTextBubbleMenu({ editor }: RichTextBubbleMenuProps) {
  return (
    <BubbleMenu 
      editor={editor} 
      tippyOptions={{ duration: 100 }}
      className="flex items-center gap-0.5 p-1 rounded-lg border border-gray-200 dark:border-gray-700 
                 bg-white dark:bg-gray-800 shadow-lg"
    >
      <MenuButton
        isActive={editor.isActive('paragraph')}
        onClick={() => editor.chain().focus().setParagraph().run()}
        title="Normal text (⌘+⌥+0)"
      >
        ¶
      </MenuButton>
      <MenuButton
        isActive={editor.isActive('heading', { level: 1 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        title="Heading 1 (⌘+⌥+1)"
      >
        H1
      </MenuButton>
      <MenuButton
        isActive={editor.isActive('heading', { level: 2 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        title="Heading 2 (⌘+⌥+2)"
      >
        H2
      </MenuButton>
      <MenuButton
        isActive={editor.isActive('heading', { level: 3 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        title="Heading 3 (⌘+⌥+3)"
      >
        H3
      </MenuButton>
      <div className="w-px h-4 mx-0.5 bg-gray-200 dark:bg-gray-700" />
      <MenuButton
        isActive={editor.isActive('bold')}
        onClick={() => editor.chain().focus().toggleBold().run()}
        title="Bold (⌘+B)"
      >
        B
      </MenuButton>
      <MenuButton
        isActive={editor.isActive('italic')}
        onClick={() => editor.chain().focus().toggleItalic().run()}
        title="Italic (⌘+I)"
      >
        I
      </MenuButton>
    </BubbleMenu>
  )
} 