import React, { useMemo, useRef, useCallback } from "react";
import ReactQuill from "react-quill";

export type QuillEditorProps = {
  value: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  placeholder?: string;
};

const QuillEditor: React.FC<QuillEditorProps> = ({
  value,
  onChange,
  readOnly = false,
  placeholder = "Start writing..."
}) => {
  const quillRef = useRef<ReactQuill>(null);

  const imageHandler = useCallback(() => {
    const quill = quillRef.current?.getEditor();
    if (!quill) return;

    const range = quill.getSelection();
    if (!range) return;

    // Create a temporary file input for image upload
    const input = document.createElement('input');
    input.setAttribute('type', 'file');
    input.setAttribute('accept', 'image/*');
    input.style.display = 'none';

    input.onchange = () => {
      const file = input.files?.[0];
      if (file) {
        // For now, convert to data URL
        // In the future, this can upload to server and get URL back
        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = reader.result as string;
          quill.insertEmbed(range.index, 'image', dataUrl);
          quill.setSelection(range.index + 1, 0);
        };
        reader.readAsDataURL(file);
      }
    };

    // Fallback to URL prompt if file input fails or user cancels
    const url = prompt('Enter image URL (or leave empty to upload file):');
    if (url && url.trim()) {
      quill.insertEmbed(range.index, 'image', url.trim());
      quill.setSelection(range.index + 1, 0);
    } else if (!url) {
      // User didn't enter URL, show file picker
      input.click();
    }
  }, []);

  const modules = useMemo(() => {
    return {
      toolbar: readOnly ? false : {
        container: [
          [{ 'header': [1, 2, 3, false] }],
          ['bold', 'italic', 'underline', 'strike'],
          [{ 'list': 'ordered'}, { 'list': 'bullet' }],
          [{ 'indent': '-1'}, { 'indent': '+1' }],
          ['link', 'image'],
          [{ 'color': [] }, { 'background': [] }],
          ['clean']
        ],
        handlers: {
          image: imageHandler,
        },
      },
    };
  }, [readOnly, imageHandler]);

  const formats = useMemo(() => [
    'header', 'bold', 'italic', 'underline', 'strike',
    'list', 'bullet', 'indent',
    'link', 'image', 'color', 'background'
  ], []);

  return (
    <div className="quill-editor-container">
      <ReactQuill
        ref={quillRef}
        theme="snow"
        value={value}
        onChange={onChange}
        readOnly={readOnly}
        modules={modules}
        formats={formats}
        placeholder={placeholder}
        className={readOnly ? "quill-readonly" : ""}
      />
    </div>
  );
};

export default React.memo(QuillEditor);
