import React from "react";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export function MarkdownRenderer({ content, className = "" }: MarkdownRendererProps) {
  if (!content) return null;

  // Split content into lines for processing
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeBlockContent: string[] = [];
  let codeBlockLanguage = "";

  const processLine = (line: string, index: number) => {
    // Code blocks (```)
    if (line.trim().startsWith("```")) {
      if (inCodeBlock) {
        // End code block
        inCodeBlock = false;
        const code = codeBlockContent.join("\n");
        elements.push(
          <pre
            key={`code-${index}`}
            className="bg-muted p-4 rounded-md overflow-x-auto my-4"
          >
            <code className="text-sm font-mono">{code}</code>
          </pre>
        );
        codeBlockContent = [];
        codeBlockLanguage = "";
        return;
      } else {
        // Start code block
        inCodeBlock = true;
        codeBlockLanguage = line.replace("```", "").trim();
        return;
      }
    }

    if (inCodeBlock) {
      codeBlockContent.push(line);
      return;
    }

    // Headings
    if (line.startsWith("### ")) {
      elements.push(
        <h3 key={`h3-${index}`} className="text-lg font-semibold mt-4 mb-2">
          {processInlineMarkdown(line.substring(4))}
        </h3>
      );
      return;
    }
    if (line.startsWith("## ")) {
      elements.push(
        <h2 key={`h2-${index}`} className="text-xl font-semibold mt-4 mb-2">
          {processInlineMarkdown(line.substring(3))}
        </h2>
      );
      return;
    }
    if (line.startsWith("# ")) {
      elements.push(
        <h1 key={`h1-${index}`} className="text-2xl font-bold mt-4 mb-2">
          {processInlineMarkdown(line.substring(2))}
        </h1>
      );
      return;
    }

    // Lists
    if (line.trim().startsWith("- ") || line.trim().startsWith("* ")) {
      const listItem = line.trim().substring(2);
      elements.push(
        <li key={`li-${index}`} className="ml-4 list-disc">
          {processInlineMarkdown(listItem)}
        </li>
      );
      return;
    }

    if (/^\d+\.\s/.test(line.trim())) {
      const listItem = line.trim().replace(/^\d+\.\s/, "");
      elements.push(
        <li key={`li-${index}`} className="ml-4 list-decimal">
          {processInlineMarkdown(listItem)}
        </li>
      );
      return;
    }

    // Empty line
    if (line.trim() === "") {
      elements.push(<br key={`br-${index}`} />);
      return;
    }

    // Regular paragraph
    elements.push(
      <p key={`p-${index}`} className="mb-2 leading-relaxed">
        {processInlineMarkdown(line)}
      </p>
    );
  };

  const processInlineMarkdown = (text: string): React.ReactNode[] => {
    const parts: React.ReactNode[] = [];
    let currentIndex = 0;
    let key = 0;

    // Process images ![alt](url)
    const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
    let match;
    let lastIndex = 0;

    while ((match = imageRegex.exec(text)) !== null) {
      // Add text before image
      if (match.index > lastIndex) {
        const beforeText = text.substring(lastIndex, match.index);
        parts.push(...processTextFormatting(beforeText, key));
        key += 1000;
      }

      // Add image
      parts.push(
        <img
          key={`img-${key++}`}
          src={match[2]}
          alt={match[1]}
          className="max-w-full h-auto rounded-md my-2"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
      );

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < text.length) {
      const remainingText = text.substring(lastIndex);
      parts.push(...processTextFormatting(remainingText, key));
    }

    return parts.length > 0 ? parts : [text];
  };

  const processTextFormatting = (text: string, startKey: number): React.ReactNode[] => {
    const parts: React.ReactNode[] = [];
    let key = startKey;
    let currentIndex = 0;

    // Process links [text](url)
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    let match;
    let lastIndex = 0;

    while ((match = linkRegex.exec(text)) !== null) {
      // Add text before link
      if (match.index > lastIndex) {
        const beforeText = text.substring(lastIndex, match.index);
        parts.push(...processBoldItalicCode(beforeText, key));
        key += 100;
      }

      // Add link
      parts.push(
        <a
          key={`link-${key++}`}
          href={match[2]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline"
        >
          {match[1]}
        </a>
      );

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < text.length) {
      const remainingText = text.substring(lastIndex);
      parts.push(...processBoldItalicCode(remainingText, key));
    } else if (parts.length === 0) {
      parts.push(...processBoldItalicCode(text, key));
    }

    return parts;
  };

  const processBoldItalicCode = (text: string, startKey: number): React.ReactNode[] => {
    const parts: React.ReactNode[] = [];
    let key = startKey;
    let processed = text;

    // Process inline code `code`
    const codeRegex = /`([^`]+)`/g;
    let match;
    const codeMatches: Array<{ start: number; end: number; content: string }> = [];

    while ((match = codeRegex.exec(text)) !== null) {
      codeMatches.push({
        start: match.index,
        end: match.index + match[0].length,
        content: match[1],
      });
    }

    if (codeMatches.length > 0) {
      let lastIndex = 0;
      codeMatches.forEach((codeMatch) => {
        // Add text before code
        if (codeMatch.start > lastIndex) {
          const beforeText = text.substring(lastIndex, codeMatch.start);
          parts.push(...processBoldItalic(beforeText, key));
          key += 10;
        }

        // Add code
        parts.push(
          <code
            key={`code-${key++}`}
            className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono"
          >
            {codeMatch.content}
          </code>
        );

        lastIndex = codeMatch.end;
      });

      // Add remaining text
      if (lastIndex < text.length) {
        const remainingText = text.substring(lastIndex);
        parts.push(...processBoldItalic(remainingText, key));
      }
    } else {
      parts.push(...processBoldItalic(text, key));
    }

    return parts;
  };

  const processBoldItalic = (text: string, startKey: number): React.ReactNode[] => {
    const parts: React.ReactNode[] = [];
    let key = startKey;

    // Process bold **text** or __text__
    const boldRegex = /(\*\*|__)(.+?)\1/g;
    let match;
    let lastIndex = 0;
    const boldMatches: Array<{ start: number; end: number; content: string }> = [];

    while ((match = boldRegex.exec(text)) !== null) {
      boldMatches.push({
        start: match.index,
        end: match.index + match[0].length,
        content: match[2],
      });
    }

    if (boldMatches.length > 0) {
      boldMatches.forEach((boldMatch) => {
        // Add text before bold
        if (boldMatch.start > lastIndex) {
          const beforeText = text.substring(lastIndex, boldMatch.start);
          parts.push(...processItalic(beforeText, key));
          key += 10;
        }

        // Add bold text (process italic inside)
        parts.push(
          <strong key={`bold-${key++}`} className="font-semibold">
            {processItalic(boldMatch.content, key)}
          </strong>
        );

        lastIndex = boldMatch.end;
      });

      // Add remaining text
      if (lastIndex < text.length) {
        const remainingText = text.substring(lastIndex);
        parts.push(...processItalic(remainingText, key));
      }
    } else {
      parts.push(...processItalic(text, key));
    }

    return parts;
  };

  const processItalic = (text: string, startKey: number): React.ReactNode[] => {
    const parts: React.ReactNode[] = [];
    let key = startKey;

    // Process italic *text* or _text_ (but not **text** or __text__)
    const italicRegex = /(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)|(?<!_)_(?!_)(.+?)(?<!_)_(?!_)/g;
    let match;
    let lastIndex = 0;
    const italicMatches: Array<{ start: number; end: number; content: string }> = [];

    while ((match = italicRegex.exec(text)) !== null) {
      italicMatches.push({
        start: match.index,
        end: match.index + match[0].length,
        content: match[1] || match[2],
      });
    }

    if (italicMatches.length > 0) {
      italicMatches.forEach((italicMatch) => {
        // Add text before italic
        if (italicMatch.start > lastIndex) {
          parts.push(text.substring(lastIndex, italicMatch.start));
        }

        // Add italic text
        parts.push(
          <em key={`italic-${key++}`} className="italic">
            {italicMatch.content}
          </em>
        );

        lastIndex = italicMatch.end;
      });

      // Add remaining text
      if (lastIndex < text.length) {
        parts.push(text.substring(lastIndex));
      }
    } else {
      parts.push(text);
    }

    return parts;
  };

  // Process all lines
  lines.forEach((line, index) => {
    processLine(line, index);
  });

  // Wrap list items in ul/ol
  const wrappedElements: React.ReactNode[] = [];
  let i = 0;
  while (i < elements.length) {
    const element = elements[i];
    if (React.isValidElement(element) && element.type === "li") {
      const listItems: React.ReactNode[] = [element];
      i++;
      while (i < elements.length) {
        const nextElement = elements[i];
        if (React.isValidElement(nextElement) && nextElement.type === "li") {
          listItems.push(nextElement);
          i++;
        } else {
          break;
        }
      }
      // Determine if ordered or unordered
      const firstItem = listItems[0];
      if (
        React.isValidElement(firstItem) &&
        firstItem.props.className?.includes("list-decimal")
      ) {
        wrappedElements.push(
          <ol key={`ol-${i}`} className="list-decimal ml-6 mb-2">
            {listItems}
          </ol>
        );
      } else {
        wrappedElements.push(
          <ul key={`ul-${i}`} className="list-disc ml-6 mb-2">
            {listItems}
          </ul>
        );
      }
    } else {
      wrappedElements.push(element);
      i++;
    }
  }

  return (
    <div className={`markdown-content ${className}`}>
      {wrappedElements.length > 0 ? wrappedElements : <p>{content}</p>}
    </div>
  );
}

