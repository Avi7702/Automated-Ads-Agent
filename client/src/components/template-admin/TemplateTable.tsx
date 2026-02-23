/**
 * TemplateTable — Shared template list table for TemplateAdmin
 */
import { Button } from '@/components/ui/button';
import { Edit2, Trash2, Image as ImageIcon, X, Check } from 'lucide-react';
import type { AdSceneTemplate } from '@shared/schema';

interface TemplateTableProps {
  templates: AdSceneTemplate[];
  isLoading: boolean;
  deleteConfirmId: string | null;
  onEdit: (template: AdSceneTemplate) => void;
  onDelete: (id: string) => void;
  onDeleteConfirm: (id: string | null) => void;
}

export function TemplateTable({
  templates,
  isLoading,
  deleteConfirmId,
  onEdit,
  onDelete,
  onDeleteConfirm,
}: TemplateTableProps) {
  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-card/50">
            <tr className="text-left text-sm text-muted-foreground">
              <th className="px-4 py-3">Preview</th>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Platforms</th>
              <th className="px-4 py-3">Global</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  Loading templates...
                </td>
              </tr>
            ) : templates.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  No templates found. Click "New Template" to create one.
                </td>
              </tr>
            ) : (
              templates.map((template) => (
                <tr key={template.id} className="hover:bg-card/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="w-16 h-16 rounded-lg border border-border bg-card overflow-hidden relative">
                      {template.previewImageUrl ? (
                        <img
                          src={template.previewImageUrl}
                          alt={template.title}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            const fallback = target.nextElementSibling as HTMLElement;
                            if (fallback) fallback.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      <div
                        className="w-full h-full items-center justify-center absolute inset-0"
                        style={{ display: template.previewImageUrl ? 'none' : 'flex' }}
                      >
                        <ImageIcon className="w-6 h-6 text-muted-foreground" />
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{template.title}</div>
                    <div className="text-xs text-muted-foreground line-clamp-1">{template.description}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 text-xs rounded-md bg-primary/10 text-primary border border-primary/20">
                      {template.category}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 flex-wrap">
                      {template.platformHints?.slice(0, 2).map((p) => (
                        <span key={p} className="px-1.5 py-0.5 text-xs rounded bg-muted/30 text-muted-foreground">
                          {p}
                        </span>
                      ))}
                      {(template.platformHints?.length || 0) > 2 && (
                        <span className="text-xs text-muted-foreground">+{template.platformHints!.length - 2}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {template.isGlobal ? (
                      <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
                    ) : (
                      <X className="w-4 h-4 text-muted-foreground" />
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" onClick={() => onEdit(template)}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      {deleteConfirmId === template.id ? (
                        <div className="flex items-center gap-1">
                          <Button variant="destructive" size="sm" onClick={() => onDelete(template.id)}>
                            Confirm
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => onDeleteConfirm(null)}>
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <Button variant="ghost" size="sm" onClick={() => onDeleteConfirm(template.id)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
