import { useEditor, EditorContent, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import Placeholder from '@tiptap/extension-placeholder'
import { useEffect } from 'react'

interface Props {
  initialContent?: string
  onChange: (html: string) => void
  placeholder?: string
}

function PostEditor({ initialContent = '', onChange, placeholder = 'Начните писать…' }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-stone-700 underline underline-offset-2 hover:opacity-70',
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'rounded-lg my-4 max-w-full',
        },
      }),
      Placeholder.configure({ placeholder }),
    ],
    content: initialContent,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
    editorProps: {
      attributes: {
        class: 'prose prose-stone max-w-none focus:outline-none min-h-[300px] py-4',
      },
    },
  })

  // Если initialContent пришёл асинхронно (после загрузки из БД) — обновим контент
  useEffect(() => {
    if (editor && initialContent && editor.getHTML() !== initialContent) {
      editor.commands.setContent(initialContent)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialContent])

  if (!editor) return null

  return (
    <div className="border border-stone-300 rounded-lg overflow-hidden bg-white focus-within:border-stone-500 transition-colors">
      <Toolbar editor={editor} />
      <div className="px-4">
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}

function Toolbar({ editor }: { editor: Editor }) {
  function setLink() {
    const previous = editor.getAttributes('link').href
    const url = window.prompt('Ссылка', previous || 'https://')
    if (url === null) return
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  }

  return (
    <div className="flex flex-wrap gap-1 px-3 py-2 border-b border-stone-200 bg-stone-50">
      <Btn
        active={editor.isActive('bold')}
        onClick={() => editor.chain().focus().toggleBold().run()}
        title="Жирный (Ctrl+B)"
      >
        <strong>Ж</strong>
      </Btn>
      <Btn
        active={editor.isActive('italic')}
        onClick={() => editor.chain().focus().toggleItalic().run()}
        title="Курсив (Ctrl+I)"
      >
        <em>К</em>
      </Btn>
      <Btn
        active={editor.isActive('strike')}
        onClick={() => editor.chain().focus().toggleStrike().run()}
        title="Зачёркнутый"
      >
        <s>З</s>
      </Btn>
      <Divider />
      <Btn
        active={editor.isActive('heading', { level: 2 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        title="Заголовок"
      >
        H2
      </Btn>
      <Btn
        active={editor.isActive('heading', { level: 3 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        title="Подзаголовок"
      >
        H3
      </Btn>
      <Divider />
      <Btn
        active={editor.isActive('bulletList')}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        title="Список"
      >
        •
      </Btn>
      <Btn
        active={editor.isActive('orderedList')}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        title="Нумерованный список"
      >
        1.
      </Btn>
      <Btn
        active={editor.isActive('blockquote')}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        title="Цитата"
      >
        ❝
      </Btn>
      <Divider />
      <Btn
        active={editor.isActive('link')}
        onClick={setLink}
        title="Ссылка"
      >
        🔗
      </Btn>
    </div>
  )
}

function Btn({
  children,
  onClick,
  active,
  title,
}: {
  children: React.ReactNode
  onClick: () => void
  active?: boolean
  title?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`px-2.5 py-1 rounded text-sm transition-colors min-w-[32px] ${
        active ? 'bg-stone-800 text-white' : 'hover:bg-stone-200 text-stone-700'
      }`}
    >
      {children}
    </button>
  )
}

function Divider() {
  return <div className="w-px bg-stone-300 mx-1" />
}

export default PostEditor