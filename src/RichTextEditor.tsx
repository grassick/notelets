import React, { useEffect, useCallback, useMemo, useRef, useState } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import MarkdownIt from 'markdown-it'
import TurndownService from 'turndown'
import { gfm } from '@guyplusplus/turndown-plugin-gfm'
import { RichTextToolbar } from './RichTextToolbar'
import { RichTextBubbleMenu } from './RichTextBubbleMenu'
import { useDebouncedCallback } from 'use-debounce'
import { UserSettings } from './types/settings'
import Table from '@tiptap/extension-table'
import TableCell from '@tiptap/extension-table-cell'
import TableHeader from '@tiptap/extension-table-header'
import TableRow from '@tiptap/extension-table-row'
import { AddContentButton } from './components/notes/AddContentButton'

const md = MarkdownIt({
  html: true,
  breaks: true,
  linkify: true,
  // Enable GitHub-flavored Markdown features
  typographer: true
})

const turndown = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced'
}).use(gfm)

const debug = true // Set to true to enable debug logging

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
  userSettings: UserSettings
  showVoiceInput?: boolean
  onVoiceTranscription?: (text: string) => void
}

export function RichTextEditor({ 
  content, 
  onChange, 
  placeholder,
  showToolbar = false,
  userSettings,
  showVoiceInput = true,
  onVoiceTranscription
}: RichTextEditorProps) {
  const lastPushedContent = useRef(content)
  const [hasFocus, setHasFocus] = useState(false)

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
    
    lastPushedContent.current = markdown
    onChange(markdown)
  }, 150)

  const initialHtml = useMemo(() => {
    const html = md.render(content)
    if (debug) {
      console.log('=== DEBUG: Initial content ===')
      console.log(content)
      console.log('=== DEBUG: Initial HTML ===')
      console.log(html)
    }
    return html
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
      }),
      Table.configure(),
      TableRow,
      TableHeader,
      TableCell,
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
    },
    onFocus: () => setHasFocus(true),
    onBlur: () => setHasFocus(false)
  })

  const handleVoiceTranscription = useCallback((text: string) => {
    if (onVoiceTranscription) {
      onVoiceTranscription(text)
    } else if (editor && text) {
      // Default behavior: insert at cursor
      editor.commands.insertContent(text)
    }
  }, [editor, onVoiceTranscription])

  // Update editor content when content prop changes significantly and differs from what we last pushed
  useEffect(() => {
    if (!editor) return

    const currentContent = turndown.turndown(editor.getHTML())
    if (content !== currentContent && content !== lastPushedContent.current) {
      if (debug) {
        console.log('=== DEBUG: External content change detected ===')
        console.log('New content:', content)
        console.log('Current editor content:', currentContent)
        console.log('Last pushed content:', lastPushedContent.current)
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
    <div className="flex flex-col flex-1 min-h-0 text-gray-800 dark:text-gray-200">
      {showToolbar && <RichTextToolbar editor={editor} />}
      <RichTextBubbleMenu editor={editor} />
      <div className="flex-1 min-h-0 relative">
        <EditorContent 
          editor={editor} 
          className="h-full [&_.ProseMirror]:h-full [&_.ProseMirror]:min-h-full [&_.ProseMirror]:pb-4" 
        />
        {showVoiceInput && (
          <div className="absolute bottom-0 right-1 z-10">
            <AddContentButton
              userSettings={userSettings}
              onTranscription={handleVoiceTranscription}
              onImageMarkdown={handleVoiceTranscription}
              iconSize={16}
            />
          </div>
        )}
      </div>
    </div>
  )
} 