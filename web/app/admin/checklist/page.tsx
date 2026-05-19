'use client';

import { useState } from 'react';

import { AdminPageHeader } from '@/components/admin/admin-page-header';
import { AdminPagination } from '@/components/admin/admin-pagination';
import { ChecklistQuestionGroups } from '@/components/admin/checklist-question-groups';
import { ChecklistResponsesTable } from '@/components/admin/checklist-responses-table';
import { Alert } from '@/components/ui/alert';
import { SelectField } from '@/components/ui/select-field';
import { useAdminChecklist } from '@/hooks/admin/use-admin-checklist';

type ChecklistTab = 'responses' | 'questions';

export default function AdminChecklistPage() {
  const checklist = useAdminChecklist();
  const [activeTab, setActiveTab] = useState<ChecklistTab>('responses');
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
        description="Revisa checklist sincronizados, detecta observaciones y administra la visibilidad de preguntas por equipamento."
      />

      <section className="grid gap-3 rounded-[22px] border border-slate-900/10 bg-white/80 p-[18px] shadow-[0_20px_60px_rgba(12,23,32,0.08)]">
        <label className="grid gap-1.5 text-sm font-bold text-slate-600">
          Filtrar por equipamento
          <SelectField
            value={checklist.selectedEquipmentType}
            options={equipmentOptions}
            onChange={checklist.handleEquipmentTypeChange}
            ariaLabel="Filtrar checklist por equipamento"
          />
        </label>
        <div className="grid grid-cols-4 gap-3 max-[900px]:grid-cols-2 max-[640px]:grid-cols-1">
          <MetricCard
            label="Respuestas"
            value={checklist.checklistMetrics.responseTotal}
            note="Checklist sincronizados"
          />
          <MetricCard
            label="Con observaciones"
            value={checklist.checklistMetrics.observedResponses}
            note="En esta página"
            tone="warning"
          />
          <MetricCard
            label="Fotos"
            value={checklist.checklistMetrics.totalPhotos}
            note="Evidencias en esta página"
          />
          <MetricCard
            label="Preguntas activas"
            value={checklist.checklistMetrics.activeQuestions}
            note={`${checklist.checklistMetrics.inactiveQuestions} inactivas`}
          />
        </div>
      </section>

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
      ) : (
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
      )}
    </main>
  );
}

interface MetricCardProps {
  label: string;
  value: number;
  note: string;
  tone?: 'default' | 'warning';
}

function MetricCard({ label, value, note, tone = 'default' }: MetricCardProps) {
  return (
    <article
      className={`rounded-2xl border px-4 py-3.5 ${
        tone === 'warning'
          ? 'border-amber-200 bg-amber-50 text-amber-950'
          : 'border-emerald-900/10 bg-[#f7fbf7] text-[#0c1720]'
      }`}>
      <span className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">
        {label}
      </span>
      <strong className="mt-1 block text-3xl tracking-[-0.04em]">
        {value}
      </strong>
      <small className="mt-1 block font-semibold text-slate-500">{note}</small>
    </article>
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
