import React, { useEffect, useCallback, useMemo } from 'react'
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

const debug = true

/**
 * Unwraps paragraph tags inside list items while preserving their content
 */
function cleanupListItemParagraphs(html: string): string {
  // Create a DOM parser
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')
  
  // Find all paragraphs inside list items
  const paragraphsInLists = doc.querySelectorAll('li p')
  
  // Unwrap each paragraph (keep its contents but remove the p tag)
  paragraphsInLists.forEach(p => {
    const parent = p.parentNode
    while (p.firstChild) {
      parent?.insertBefore(p.firstChild, p)
    }
    parent?.removeChild(p)
  })
  
  // Return the cleaned HTML
  return doc.body.innerHTML
}

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
    if (debug) {
      console.log('=== DEBUG: HTML before cleanup ===')
      console.log(html)
    }
    
    const cleanedHtml = cleanupListItemParagraphs(html)
    if (debug) {
      console.log('=== DEBUG: HTML after cleanup ===')
      console.log(cleanedHtml)
    }
    
    const markdown = turndown.turndown(cleanedHtml)
    if (debug) {
      console.log('=== DEBUG: Markdown after turndown ===')
      console.log(markdown)
    }
    
    onChange(markdown)
  }, 150)

  const initialHtml = useMemo(() => {
    return md.render(content)
  }, [])

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
    content: initialHtml,
    editorProps: {
      attributes: {
        class: 'prose prose-sm dark:prose-invert max-w-none focus:outline-none'
      }
    },
    onUpdate: ({ editor }) => {
      if (debug) {
        console.log('=== DEBUG: Raw editor HTML ===')
        console.log(editor.getHTML())
      }
      debouncedOnChange(editor.getHTML())
    }
  })

  // Update editor content when content prop changes significantly
  useEffect(() => {
    if (!editor) return

    const currentContent = turndown.turndown(editor.getHTML())
    if (content !== currentContent) {
      if (debug) {
        console.log('=== DEBUG: Content prop changed ===')
        console.log('New content:', content)
        console.log('Current editor content:', currentContent)
      }
      
      const selection = editor.state.selection
      const renderedHtml = md.render(content)
      if (debug) {
        console.log('=== DEBUG: New HTML to set ===')
        console.log(renderedHtml)
      }
      
      editor.commands.setContent(renderedHtml)
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