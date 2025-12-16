import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Code,
  Heading1,
  Heading2,
  Heading3,
  Image as ImageIcon,
  Link,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
  error?: string;
}

export function MarkdownEditor({
  value,
  onChange,
  placeholder = "Enter description...",
  rows = 8,
  className = "",
  error,
}: MarkdownEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showImageDialog, setShowImageDialog] = useState(false);
  const [imageUrl, setImageUrl] = useState("");

  const insertText = (before: string, after: string = "") => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);
    const newText =
      value.substring(0, start) +
      before +
      selectedText +
      after +
      value.substring(end);

    onChange(newText);

    // Restore cursor position
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + before.length + selectedText.length + after.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  const insertHeading = (level: number) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);
    const headingPrefix = "#".repeat(level) + " ";

    let newText: string;
    let newCursorPos: number;

    if (selectedText) {
      // If text is selected, wrap it in heading
      newText =
        value.substring(0, start) +
        headingPrefix +
        selectedText +
        "\n" +
        value.substring(end);
      newCursorPos = start + headingPrefix.length + selectedText.length + 1;
    } else {
      // If no text selected, insert heading at cursor
      newText =
        value.substring(0, start) +
        headingPrefix +
        "\n" +
        value.substring(end);
      newCursorPos = start + headingPrefix.length + 1;
    }

    onChange(newText);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  const insertCodeBlock = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);

    let newText: string;
    let newCursorPos: number;

    if (selectedText) {
      // If text is selected, wrap it in code block
      newText =
        value.substring(0, start) +
        "```\n" +
        selectedText +
        "\n```\n" +
        value.substring(end);
      newCursorPos = start + 4 + selectedText.length + 5;
    } else {
      // If no text selected, insert code block
      newText =
        value.substring(0, start) +
        "```\n\n```\n" +
        value.substring(end);
      newCursorPos = start + 5;
    }

    onChange(newText);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  const insertInlineCode = () => {
    insertText("`", "`");
  };

  const insertList = (ordered: boolean = false) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);

    let newText: string;
    let newCursorPos: number;

    if (selectedText) {
      // Split selected text into lines and add list markers
      const lines = selectedText.split("\n");
      const listItems = lines
        .map((line, index) => {
          if (ordered) {
            return `${index + 1}. ${line}`;
          } else {
            return `- ${line}`;
          }
        })
        .join("\n");

      newText = value.substring(0, start) + listItems + "\n" + value.substring(end);
      newCursorPos = start + listItems.length + 1;
    } else {
      // Insert list item at cursor
      const marker = ordered ? "1. " : "- ";
      newText = value.substring(0, start) + marker + "\n" + value.substring(end);
      newCursorPos = start + marker.length + 1;
    }

    onChange(newText);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  const handleImageInsert = () => {
    if (imageUrl.trim()) {
      insertText(`![Image](${imageUrl})`, "");
      setImageUrl("");
      setShowImageDialog(false);
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 p-2 border rounded-md bg-muted/50">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => insertHeading(1)}
          title="Heading 1"
          className="h-8 w-8 p-0"
        >
          <Heading1 className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => insertHeading(2)}
          title="Heading 2"
          className="h-8 w-8 p-0"
        >
          <Heading2 className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => insertHeading(3)}
          title="Heading 3"
          className="h-8 w-8 p-0"
        >
          <Heading3 className="h-4 w-4" />
        </Button>
        <div className="w-px h-6 bg-border mx-1" />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => insertText("**", "**")}
          title="Bold"
          className="h-8 w-8 p-0"
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => insertText("*", "*")}
          title="Italic"
          className="h-8 w-8 p-0"
        >
          <Italic className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={insertInlineCode}
          title="Inline Code"
          className="h-8 w-8 p-0"
        >
          <Code className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={insertCodeBlock}
          title="Code Block"
          className="h-8 w-8 p-0"
        >
          <Code className="h-4 w-4" />
          <span className="ml-1 text-xs">```</span>
        </Button>
        <div className="w-px h-6 bg-border mx-1" />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => insertList(false)}
          title="Unordered List"
          className="h-8 w-8 p-0"
        >
          <List className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => insertList(true)}
          title="Ordered List"
          className="h-8 w-8 p-0"
        >
          <ListOrdered className="h-4 w-4" />
        </Button>
        <div className="w-px h-6 bg-border mx-1" />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setShowImageDialog(true)}
          title="Insert Image"
          className="h-8 w-8 p-0"
        >
          <ImageIcon className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => insertText("[", "]()")}
          title="Insert Link"
          className="h-8 w-8 p-0"
        >
          <Link className="h-4 w-4" />
        </Button>
      </div>

      {/* Textarea */}
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className={`font-mono text-sm ${error ? 'border-red-500' : ''}`}
      />

      {/* Image Dialog */}
      {showImageDialog && (
        <div className="p-4 border rounded-md bg-background space-y-2">
          <Label htmlFor="image-url">Image URL</Label>
          <div className="flex gap-2">
            <Input
              id="image-url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://example.com/image.png"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleImageInsert();
                }
              }}
            />
            <Button type="button" onClick={handleImageInsert} size="sm">
              Insert
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowImageDialog(false);
                setImageUrl("");
              }}
              size="sm"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
    </div>
  );
}

