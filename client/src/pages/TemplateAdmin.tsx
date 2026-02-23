/**
 * TemplateAdmin — Page for managing ad scene templates (CRUD).
 *
 * Previously 1,232 lines with duplicated embedded/standalone rendering.
 * Now uses shared TemplateTable + TemplateForm sub-components.
 */
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Plus, RefreshCw } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { useTemplateAdmin } from '@/hooks/useTemplateAdmin';
import { TemplateTable } from '@/components/template-admin/TemplateTable';
import { TemplateForm } from '@/components/template-admin/TemplateForm';

interface TemplateAdminProps {
  embedded?: boolean;
}

export default function TemplateAdmin({ embedded }: TemplateAdminProps = {}) {
  const admin = useTemplateAdmin();

  const actionBar = (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-4">
        {!embedded && (
          <>
            <Link href="/library?tab=scene-templates">
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                Back to Gen Templates
              </Button>
            </Link>
            <div className="h-6 w-px bg-muted/50" />
          </>
        )}
        <h1 className="font-semibold">{embedded ? 'Gen Template Admin' : 'Template Admin'}</h1>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => admin.refetch()}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
        <Button onClick={admin.openNewForm}>
          <Plus className="w-4 h-4 mr-2" />
          New Template
        </Button>
      </div>
    </div>
  );

  const content = (
    <>
      {actionBar}

      {!admin.showForm && (
        <TemplateTable
          templates={admin.templates}
          isLoading={admin.isLoading}
          deleteConfirmId={admin.deleteConfirmId}
          onEdit={admin.handleEdit}
          onDelete={(id) => admin.deleteMutation.mutate(id)}
          onDeleteConfirm={admin.setDeleteConfirmId}
        />
      )}

      {admin.showForm && (
        <TemplateForm
          editingId={admin.editingId}
          formData={admin.formData}
          tagInput={admin.tagInput}
          productTypeInput={admin.productTypeInput}
          isSaving={admin.isSaving}
          onFormDataChange={admin.setFormData}
          onTagInputChange={admin.setTagInput}
          onProductTypeInputChange={admin.setProductTypeInput}
          onSubmit={admin.handleSubmit}
          onCancel={() => admin.setShowForm(false)}
          onAddTag={admin.addTag}
          onRemoveTag={admin.removeTag}
          onAddProductType={admin.addProductType}
          onRemoveProductType={admin.removeProductType}
          onToggleArrayItem={admin.toggleArrayItem}
        />
      )}
    </>
  );

  if (embedded) {
    return <div>{content}</div>;
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header currentPage="templates" />
      <main className="container max-w-7xl mx-auto px-6 pt-24 pb-20">{content}</main>
    </div>
  );
}
