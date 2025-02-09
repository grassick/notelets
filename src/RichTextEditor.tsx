import React, { useEffect, useCallback } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import MarkdownIt from 'markdown-it'
import TurndownService from 'turndown'
import { RichTextToolbar } from './RichTextToolbar'
import { RichTextBubbleMenu } from './RichTextBubbleMenu'
import { useDebouncedCallback } from 'use-debounce'

const md = new MarkdownIt({
  html: true,
  breaks: true,
  linkify: true
})

const turndown = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced'
})

interface RichTextEditorProps {
  content: string
  onChange: (markdown: string) => void
  placeholder?: string
  showToolbar?: boolean
}

export function RichTextEditor({ 
  content, 
  onChange, 
  placeholder,
  showToolbar = false 
}: RichTextEditorProps) {
  // Debounce the markdown conversion and onChange callback
  const debouncedOnChange = useDebouncedCallback((html: string) => {
    const markdown = turndown.turndown(html)
    onChange(markdown)
  }, 150) // 150ms debounce

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
          HTMLAttributes: {
            class: 'font-bold'
          }
        }
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-500 hover:text-blue-600 underline'
        }
      }),
      Placeholder.configure({
        placeholder: placeholder || 'Start typing...'
      })
    ],
    content: md.render(content),
    editorProps: {
      attributes: {
        class: 'prose prose-sm dark:prose-invert max-w-none focus:outline-none'
      }
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML()
      debouncedOnChange(html)
    }
  })

  // Update editor content when content prop changes significantly
  useEffect(() => {
    if (!editor) return

    const currentContent = turndown.turndown(editor.getHTML())
    if (content !== currentContent) {
      const selection = editor.state.selection
      editor.commands.setContent(md.render(content))
      editor.commands.setTextSelection(selection)
    }
  }, [editor, content])

  if (!editor) {
    return null
  }

  return (
    <div className="rounded-md bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200">
      {showToolbar && <RichTextToolbar editor={editor} />}
      <RichTextBubbleMenu editor={editor} />
      <div className="p-1">
        <EditorContent editor={editor} />
      </div>
    </div>
  )
} 