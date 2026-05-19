'use client';

import { AdminPageHeader } from '@/components/admin/admin-page-header';
import { AdminPagination } from '@/components/admin/admin-pagination';
import { ChecklistQuestionGroups } from '@/components/admin/checklist-question-groups';
import { ChecklistResponsesTable } from '@/components/admin/checklist-responses-table';
import { Alert } from '@/components/ui/alert';
import { SelectField } from '@/components/ui/select-field';
import { useAdminChecklist } from '@/hooks/admin/use-admin-checklist';

export default function AdminChecklistPage() {
  const checklist = useAdminChecklist();
  const equipmentOptions = [
    { value: '', label: 'Todos los equipamentos' },
    ...checklist.equipmentTypes.map(item => ({
      value: item.id,
      label: `${item.systemName} · ${item.nombre}${
        item.frecuencia ? ` · ${item.frecuencia}` : ''
      }`,
    })),
  ];

  return (
    <main className="grid gap-5 px-8 pb-11 pt-7 max-[640px]:px-[18px]">
      <AdminPageHeader
        eyebrow="Checklist"
        title="Preguntas y respuestas"
        description="Administra la visibilidad de preguntas por equipamento y revisa como se respondieron los checklist sincronizados."
      />
      <section className="flex items-center gap-3 max-[640px]:flex-col max-[640px]:items-stretch">
        <SelectField
          value={checklist.selectedEquipmentType}
          options={equipmentOptions}
          onChange={checklist.handleEquipmentTypeChange}
        />
      </section>
      <Alert>{checklist.errorMessage}</Alert>
      <ChecklistResponsesTable
        responses={checklist.responses}
        total={checklist.responseTotal}
        page={checklist.responsePage}
        totalPages={checklist.responseTotalPages}
        expandedResponseId={checklist.expandedResponseId}
        setExpandedResponseId={checklist.setExpandedResponseId}
        isLoading={checklist.isLoading}
        footer={
          <AdminPagination
            page={checklist.responsePage}
            totalPages={checklist.responseTotalPages}
            isLoading={checklist.isLoading}
            setPage={checklist.setResponsePage}
          />
        }
      />
      <ChecklistQuestionGroups
        questions={checklist.questions}
        groups={checklist.groupedQuestions}
        expandedGroups={checklist.expandedQuestionGroups}
        savingQuestionId={checklist.savingQuestionId}
        isLoading={checklist.isLoading}
        onToggleGroup={checklist.toggleQuestionGroup}
        onUpdateQuestion={checklist.updateQuestionDraft}
        onSaveQuestion={checklist.handleSaveQuestion}
      />
    </main>
  );
}
