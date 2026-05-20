'use client';

import { useState } from 'react';

import { AdminPagination } from '@/components/admin/admin-pagination';
import { ChecklistQuestionGroups } from '@/components/admin/checklist-question-groups';
import { ChecklistResponsesTable } from '@/components/admin/checklist-responses-table';
import { Alert } from '@/components/ui/alert';
import { SearchInput } from '@/components/ui/search-input';
import { SelectField } from '@/components/ui/select-field';
import { useAdminChecklist } from '@/hooks/admin/use-admin-checklist';

type ChecklistTab = 'responses' | 'questions';

const REVIEW_STATUS_OPTIONS = [
  { value: 'all', label: 'Todas las respuestas' },
  { value: 'observed', label: 'Solo observadas' },
  { value: 'photos', label: 'Con fotos' },
];

export default function AdminChecklistPage() {
  const checklist = useAdminChecklist();
  const [activeTab, setActiveTab] = useState<ChecklistTab>('responses');
  const equipmentOptions = [
    { value: '', label: 'Todos los equipos' },
    ...checklist.equipmentTypes.map(item => ({
      value: item.id,
      label: `${item.systemName} · ${item.nombre}${
        item.frecuencia ? ` · ${item.frecuencia}` : ''
      }`,
    })),
  ];
  const buildingOptions = [
    { value: '', label: 'Todos los inmuebles' },
    ...checklist.responseFilterOptions.buildings,
  ];

  return (
    <main className="grid gap-3.5 px-8 pb-6 pt-3.5 max-[640px]:px-[14px]">
      <Alert>{checklist.errorMessage}</Alert>
      <Alert variant="success">{checklist.successMessage}</Alert>

      <section className="flex gap-2 rounded-[18px] border border-slate-900/10 bg-white/70 p-1.5 shadow-[0_12px_36px_rgba(12,23,32,0.06)] max-[640px]:grid">
        <TabButton
          active={activeTab === 'responses'}
          onClick={() => setActiveTab('responses')}>
          Respuestas recibidas
        </TabButton>
        <TabButton
          active={activeTab === 'questions'}
          onClick={() => setActiveTab('questions')}>
          Preguntas del checklist
        </TabButton>
      </section>

      {activeTab === 'responses' ? (
        <section className="grid gap-4">
          <div className="grid grid-cols-[minmax(220px,1.2fr)_minmax(220px,1fr)_minmax(220px,1fr)_minmax(180px,0.8fr)] gap-3 max-[1180px]:grid-cols-2 max-[640px]:grid-cols-1">
            <SearchInput
              placeholder="Buscar inmueble, equipo, codigo o frecuencia"
              value={checklist.responseSearch}
              onChange={checklist.handleResponseSearchChange}
            />
            <SelectField
              value={checklist.selectedEquipmentType}
              options={equipmentOptions}
              onChange={checklist.handleEquipmentTypeChange}
              ariaLabel="Filtrar respuestas por tipo de equipamento"
            />
            <SelectField
              value={checklist.selectedBuildingName}
              options={buildingOptions}
              onChange={checklist.handleBuildingNameChange}
              ariaLabel="Filtrar respuestas por inmueble"
            />
            <SelectField
              value={checklist.responseReviewStatus}
              options={REVIEW_STATUS_OPTIONS}
              onChange={checklist.handleResponseReviewStatusChange}
              ariaLabel="Filtrar respuestas por estado de revision"
            />
          </div>
          <ChecklistResponsesTable
            responses={checklist.responses}
            total={checklist.responseTotal}
            page={checklist.responsePage}
            totalPages={checklist.responseTotalPages}
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
        </section>
      ) : (
        <section className="grid gap-4">
          <label className="grid gap-1.5 text-sm font-bold text-slate-600">
            Tipo de equipamento
            <SelectField
              value={checklist.selectedEquipmentType}
              options={equipmentOptions}
              onChange={checklist.handleEquipmentTypeChange}
              ariaLabel="Filtrar preguntas por tipo de equipamento"
            />
          </label>
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
        </section>
      )}
    </main>
  );
}

interface TabButtonProps {
  active: boolean;
  children: string;
  onClick: () => void;
}

function TabButton({ active, children, onClick }: TabButtonProps) {
  return (
    <button
      className={`min-h-11 flex-1 rounded-[14px] px-4 text-sm font-black transition-colors ${
        active
          ? 'bg-emerald-800 text-white shadow-[0_10px_24px_rgba(6,95,70,0.22)]'
          : 'bg-transparent text-slate-500 hover:bg-emerald-50 hover:text-emerald-900'
      }`}
      type="button"
      onClick={onClick}
      aria-pressed={active}>
      {children}
    </button>
  );
}
