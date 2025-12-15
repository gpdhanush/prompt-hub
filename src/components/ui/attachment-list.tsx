import { FileText, Eye, Download, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getImageUrl } from "@/lib/imageUtils";
import { API_CONFIG } from "@/lib/config";
import { getAuthToken } from "@/lib/auth";

interface Attachment {
  id: number;
  original_filename?: string;
  filename?: string;
  path?: string;
  url?: string;
  file_url?: string;
  size?: number;
  mime_type?: string;
}

interface AttachmentListProps {
  attachments: Attachment[];
  downloadUrl?: (attachment: Attachment) => string;
  onView?: (attachment: Attachment) => void;
  onDownload?: (attachment: Attachment) => void;
  showLabel?: boolean;
  label?: string;
  className?: string;
}

export function AttachmentList({
  attachments,
  downloadUrl,
  onView,
  onDownload,
  showLabel = true,
  label,
  className = "",
}: AttachmentListProps) {
  const formatFileSize = (bytes: number) => {
    if (!bytes || bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getAttachmentUrl = (attachment: Attachment) => {
    if (downloadUrl) {
      return downloadUrl(attachment);
    }
    return attachment.path || attachment.url || attachment.file_url || "";
  };

  const handleView = (attachment: Attachment) => {
    if (onView) {
      onView(attachment);
      return;
    }
    
    const url = getAttachmentUrl(attachment);
    if (url) {
      window.open(getImageUrl(url) || url, '_blank');
    }
  };

  const handleDownload = async (attachment: Attachment) => {
    if (onDownload) {
      onDownload(attachment);
      return;
    }

    const url = getAttachmentUrl(attachment);
    if (!url) return;

    // Check if this is a bug attachment by checking the path
    // Bug attachments have path like "/bugs/{id}/attachments/{attachmentId}"
    const bugPathMatch = attachment.path?.match(/\/bugs\/(\d+)\/attachments\/(\d+)/);
    if (bugPathMatch) {
      try {
        const API_BASE_URL = API_CONFIG.BASE_URL;
        const token = getAuthToken();
        const bugId = bugPathMatch[1];
        const attachmentId = bugPathMatch[2];
        
        if (bugId && attachmentId) {
          const downloadUrl = `${API_BASE_URL}/bugs/${bugId}/attachments/${attachmentId}`;
          const headers: HeadersInit = {
            'Authorization': `Bearer ${token}`,
          };
          
          const response = await fetch(downloadUrl, { headers });
          
          if (!response.ok) {
            throw new Error('Failed to download attachment');
          }
          
          const blob = await response.blob();
          const downloadUrlBlob = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = downloadUrlBlob;
          a.download = attachment.original_filename || attachment.filename || 'attachment';
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(downloadUrlBlob);
          document.body.removeChild(a);
          return;
        }
      } catch (error) {
        console.error('Error downloading via API:', error);
        // Fall through to regular download
      }
    }

    // For all other attachments (tasks, projects, etc.), use blob approach for reliable download
    try {
      const fullUrl = getImageUrl(url) || url;
      
      // If it's a relative URL, construct full URL
      let downloadUrl = fullUrl;
      if (!fullUrl.startsWith('http')) {
        const API_BASE_URL = API_CONFIG.BASE_URL || '';
        downloadUrl = fullUrl.startsWith('/') 
          ? `${API_BASE_URL}${fullUrl}`
          : `${API_BASE_URL}/${fullUrl}`;
      }
      
      // Fetch as blob to ensure download instead of navigation
      const response = await fetch(downloadUrl, {
        method: 'GET',
        credentials: 'include', // Include cookies for authentication if needed
      });
      
      if (!response.ok) {
        throw new Error('Failed to download attachment');
      }
      
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = attachment.original_filename || attachment.filename || 'attachment';
      document.body.appendChild(link);
      link.click();
      window.URL.revokeObjectURL(blobUrl);
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error downloading attachment:', error);
      // Fallback: try direct download link (may open in same tab if server doesn't set proper headers)
      const fullUrl = getImageUrl(url) || url;
      const link = document.createElement('a');
      link.href = fullUrl;
      link.download = attachment.original_filename || attachment.filename || 'attachment';
      link.target = '_blank'; // Open in new tab as fallback
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  if (!attachments || attachments.length === 0) {
    return null;
  }

  return (
    <div className={className}>
      {showLabel && (
        <div className="mb-4">
          <label className="text-sm font-semibold">
            {label || `Attachments (${attachments.length})`}
          </label>
        </div>
      )}
      <div className="grid gap-2">
        {attachments.map((attachment) => {
          const fileExtension = (attachment.original_filename || attachment.filename || '')
            .split('.')
            .pop()
            ?.toLowerCase() || '';
          const isImage = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp', 'ico'].includes(fileExtension);
          const isPdf = fileExtension === 'pdf';
          const attachmentUrl = getAttachmentUrl(attachment);
          const fileName = attachment.original_filename || attachment.filename || 'Unknown file';
          const fileSize = attachment.size || 0;

          return (
            <div
              key={attachment.id}
              className="flex items-center justify-between p-3 border rounded-lg bg-muted/50"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {isImage && attachmentUrl ? (
                  <div className="h-12 w-12 rounded border overflow-hidden flex-shrink-0 bg-muted">
                    <img
                      src={getImageUrl(attachmentUrl) || attachmentUrl}
                      alt={fileName}
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        const parent = e.currentTarget.parentElement;
                        if (parent) {
                          parent.innerHTML = '<div class="flex items-center justify-center h-12 w-12 rounded border flex-shrink-0 bg-muted"><svg class="h-6 w-6 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg></div>';
                        }
                      }}
                    />
                  </div>
                ) : isPdf ? (
                  <div className="h-12 w-12 rounded border flex items-center justify-center flex-shrink-0 bg-muted">
                    <FileText className="h-6 w-6 text-red-600" />
                  </div>
                ) : (
                  <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{fileName}</p>
                  <p className="text-xs text-muted-foreground">{formatFileSize(fileSize)}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.preventDefault();
                    handleView(attachment);
                  }}
                  title="View in new tab"
                >
                  <Eye className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.preventDefault();
                    handleDownload(attachment);
                  }}
                  title="Download"
                >
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

