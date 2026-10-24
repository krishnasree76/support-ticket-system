import { useState } from 'react';
import { AlertCircle } from 'lucide-react';
import Button from './Button';
import { useAppData } from '../context/AppDataContext';
import { getErrorMessage, getFieldErrors } from '../api/client';

const LIMITS = { title: 200, description: 5000 };

// Client-side checks give instant feedback. The API validates again and is
// the real source of truth; its field errors are shown the same way.
function validate(values) {
  const errors = {};
  if (!values.title.trim()) errors.title = 'Title is required';
  else if (values.title.trim().length > LIMITS.title) errors.title = `Title must be at most ${LIMITS.title} characters`;
  if (!values.description.trim()) errors.description = 'Description is required';
  else if (values.description.trim().length > LIMITS.description)
    errors.description = `Description must be at most ${LIMITS.description} characters`;
  if (!values.priority) errors.priority = 'Choose a priority';
  if (!values.category) errors.category = 'Choose a category';
  return errors;
}

function Field({ id, label, error, hint, children }) {
  return (
    <div>
      <label htmlFor={id} className="label">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="mt-1.5 flex items-center gap-1 text-xs text-red-600">
          <AlertCircle className="size-3.5" aria-hidden="true" />
          {error}
        </p>
      ) : (
        hint && <p className="mt-1.5 text-xs text-slate-500">{hint}</p>
      )}
    </div>
  );
}

export default function TicketForm({ initialTicket, onSubmit, onCancel }) {
  const { meta, assignees } = useAppData();
  const [values, setValues] = useState({
    title: initialTicket?.title ?? '',
    description: initialTicket?.description ?? '',
    priority: initialTicket?.priority ?? 'Medium',
    category: initialTicket?.category ?? '',
    assigneeId: initialTicket?.assigneeId ? String(initialTicket.assigneeId) : '',
  });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const setField = (field) => (event) => {
    setValues((v) => ({ ...v, [field]: event.target.value }));
    if (errors[field]) setErrors((e) => ({ ...e, [field]: undefined }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting) return;

    const clientErrors = validate(values);
    setErrors(clientErrors);
    setFormError(null);
    if (Object.keys(clientErrors).length > 0) return;

    const payload = {
      title: values.title.trim(),
      description: values.description.trim(),
      priority: values.priority,
      category: values.category,
      assigneeId: values.assigneeId ? Number(values.assigneeId) : null,
    };

    setSubmitting(true);
    try {
      await onSubmit(payload);
    } catch (err) {
      setErrors(getFieldErrors(err));
      setFormError(getErrorMessage(err));
      setSubmitting(false);
    }
  };

  const describedBy = (field) => (errors[field] ? `ticket-${field}-error` : undefined);
  const inputClass = (field) => `input ${errors[field] ? 'input-error' : ''}`;

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      {formError && (
        <div role="alert" className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {formError}
        </div>
      )}

      <Field id="ticket-title" label="Title" error={errors.title}>
        <input
          id="ticket-title"
          className={inputClass('title')}
          value={values.title}
          onChange={setField('title')}
          maxLength={LIMITS.title}
          placeholder="e.g. Payment fails at checkout"
          aria-invalid={Boolean(errors.title)}
          aria-describedby={describedBy('title')}
          required
        />
      </Field>

      <Field
        id="ticket-description"
        label="Description"
        error={errors.description}
        hint={`${values.description.length}/${LIMITS.description} characters`}
      >
        <textarea
          id="ticket-description"
          rows={5}
          className={`${inputClass('description')} resize-y`}
          value={values.description}
          onChange={setField('description')}
          maxLength={LIMITS.description}
          placeholder="What happened? Include steps to reproduce, customer details and impact."
          aria-invalid={Boolean(errors.description)}
          aria-describedby={describedBy('description')}
          required
        />
      </Field>

      <div className="grid gap-5 sm:grid-cols-3">
        <Field id="ticket-priority" label="Priority" error={errors.priority}>
          <select
            id="ticket-priority"
            className={inputClass('priority')}
            value={values.priority}
            onChange={setField('priority')}
            aria-invalid={Boolean(errors.priority)}
            aria-describedby={describedBy('priority')}
          >
            {(meta?.priorities || []).map((priority) => (
              <option key={priority} value={priority}>
                {priority}
              </option>
            ))}
          </select>
        </Field>

        <Field id="ticket-category" label="Category" error={errors.category}>
          <select
            id="ticket-category"
            className={inputClass('category')}
            value={values.category}
            onChange={setField('category')}
            aria-invalid={Boolean(errors.category)}
            aria-describedby={describedBy('category')}
          >
            <option value="">Select category</option>
            {(meta?.categories || []).map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </Field>

        <Field id="ticket-assigneeId" label="Assignee" error={errors.assigneeId}>
          <select
            id="ticket-assigneeId"
            className={inputClass('assigneeId')}
            value={values.assigneeId}
            onChange={setField('assigneeId')}
            aria-invalid={Boolean(errors.assigneeId)}
            aria-describedby={describedBy('assigneeId')}
          >
            <option value="">Unassigned</option>
            {assignees.map((assignee) => (
              <option key={assignee.id} value={assignee.id}>
                {assignee.name}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
        <Button type="submit" loading={submitting}>
          {initialTicket ? 'Save changes' : 'Create ticket'}
        </Button>
      </div>
    </form>
  );
}
