import React, { useEffect, useCallback, useMemo, useRef, useState } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import MarkdownIt from 'markdown-it'
import taskListPlugin from 'markdown-it-task-lists'
import TurndownService from 'turndown'
import { gfm } from '@guyplusplus/turndown-plugin-gfm'
import { RichTextToolbar } from './RichTextToolbar'
import { RichTextBubbleMenu } from './RichTextBubbleMenu'
import { useDebouncedCallback } from 'use-debounce'
import { UserSettings } from './types/settings'
import { Table } from '@tiptap/extension-table'
import TableCell from '@tiptap/extension-table-cell'
import TableHeader from '@tiptap/extension-table-header'
import TableRow from '@tiptap/extension-table-row'
import { TaskList } from '@tiptap/extension-task-list'
import { TaskItem } from '@tiptap/extension-task-item'
import { AddContentButton } from './components/notes/AddContentButton'

const md = MarkdownIt({
  html: true,
  breaks: true,
  linkify: true,
  // Enable GitHub-flavored Markdown features
  typographer: true
}).use(taskListPlugin)

const turndown = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced'
}).use(gfm)

const debug = false

/**
 * Converts markdown-it-task-lists HTML into TipTap-compatible task list HTML.
 * markdown-it generates class-based markup; TipTap expects data-attribute-based markup.
 */
function convertTaskListsForTiptap(html: string): string {
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')

  doc.querySelectorAll('ul.contains-task-list').forEach(ul => {
    ul.removeAttribute('class')
    ul.setAttribute('data-type', 'taskList')
  })

  doc.querySelectorAll('li.task-list-item').forEach(li => {
    const checkbox = li.querySelector(':scope > input[type="checkbox"]')
    const checked = checkbox?.hasAttribute('checked') ?? false

    li.removeAttribute('class')
    li.setAttribute('data-type', 'taskItem')
    li.setAttribute('data-checked', String(checked))

    checkbox?.remove()

    const label = doc.createElement('label')
    const input = doc.createElement('input')
    const checkboxStyler = doc.createElement('span')
    const content = doc.createElement('div')
    const paragraph = doc.createElement('p')

    input.setAttribute('type', 'checkbox')
    if (checked) {
      input.setAttribute('checked', 'checked')
    }

    label.append(input, checkboxStyler)

    while (li.firstChild) {
      const child = li.firstChild
      const isBlockElement = child.nodeType === Node.ELEMENT_NODE
        && ['P', 'UL', 'OL', 'TABLE', 'PRE', 'BLOCKQUOTE', 'DIV'].includes((child as HTMLElement).tagName)

      if (isBlockElement) {
        break
      }

      paragraph.append(child)
    }

    content.append(paragraph)

    while (li.firstChild) {
      content.append(li.firstChild)
    }

    li.replaceChildren(label, content)
  })

  return doc.body.innerHTML
}

/**
 * Converts TipTap task list HTML back into checkbox list HTML that Turndown's
 * GFM plugin already understands.
 */
function convertTaskListsForTurndown(html: string): string {
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')

  doc.querySelectorAll('ul[data-type="taskList"]').forEach(ul => {
    ul.removeAttribute('data-type')
  })

  doc.querySelectorAll('li[data-type="taskItem"]').forEach(li => {
    const checked = li.getAttribute('data-checked') === 'true'
    const input = doc.createElement('input')
    const content = li.querySelector(':scope > div')
    const replacementChildren: ChildNode[] = [input]

    input.setAttribute('type', 'checkbox')
    if (checked) {
      input.setAttribute('checked', 'checked')
    }

    if (content) {
      replacementChildren.push(...Array.from(content.childNodes))
    }

    li.removeAttribute('data-type')
    li.removeAttribute('data-checked')
    li.replaceChildren(...replacementChildren)
  })

  return doc.body.innerHTML
}

/**
 * Unwraps paragraph tags inside list items while preserving their content.
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

/**
 * Converts the editor's HTML back into markdown, normalizing task lists first
 * so empty items and checked states survive round-tripping.
 */
function convertEditorHtmlToMarkdown(html: string): string {
  const normalizedHtml = convertTaskListsForTurndown(html)
  const cleanedHtml = cleanupListItemParagraphs(normalizedHtml)
  return turndown.turndown(cleanedHtml)
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
    
    const normalizedHtml = convertTaskListsForTurndown(html)
    if (debug) {
      console.log('=== DEBUG: HTML after task list normalization ===')
      console.log(normalizedHtml)
    }

    const cleanedHtml = cleanupListItemParagraphs(normalizedHtml)
    if (debug) {
      console.log('=== DEBUG: HTML after cleanup ===')
      console.log(cleanedHtml)
    }

    const markdown = turndown.turndown(cleanedHtml)
    if (debug) {
      console.log('=== DEBUG: Markdown after turndown ===')
      console.log(markdown)
    }

    if (markdown === lastPushedContent.current) {
      return
    }

    lastPushedContent.current = markdown
    onChange(markdown)
  }, 150)

  const initialHtml = useMemo(() => {
    const html = convertTaskListsForTiptap(md.render(content))
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
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
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
    if (hasFocus) return

    const currentContent = convertEditorHtmlToMarkdown(editor.getHTML())
    if (content !== currentContent && content !== lastPushedContent.current) {
      if (debug) {
        console.log('=== DEBUG: External content change detected ===')
        console.log('New content:', content)
        console.log('Current editor content:', currentContent)
        console.log('Last pushed content:', lastPushedContent.current)
      }
      
      const selection = editor.state.selection
      const renderedHtml = convertTaskListsForTiptap(md.render(content))
      if (debug) {
        console.log('=== DEBUG: New HTML to set ===')
        console.log(renderedHtml)
      }
      
      editor.commands.setContent(renderedHtml)
      editor.commands.setTextSelection(selection)
    }
  }, [editor, content, hasFocus])

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